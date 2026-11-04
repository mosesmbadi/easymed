"""
Taking value back off what has been billed: discounts and credit notes.

Both write to the lines rather than sitting alongside them. The payment
allocator, the receivables screens, statements and the margin report all read
`patient_amount` and `actual_total`, so every one of them sees the reduced
figure without having to know a discount or a credit note exists.
See docs/BILLING_AMOUNTS.md.
"""
from decimal import ROUND_HALF_UP, Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Sum

from .models import CreditNote, CreditNoteLine, Invoice, InvoiceItem
from .services import reverse_stock_for_invoice_item

CENT = Decimal('0.01')


class AdjustmentError(Exception):
    """The discount or credit note can't be applied; the message says why."""


def _patient_paid(line):
    return line.allocations.filter(receipt__insurance__isnull=True).aggregate(
        total=Sum('amount_applied'))['total'] or Decimal('0')


def _payer_paid(line):
    return line.allocations.filter(receipt__insurance__isnull=False).aggregate(
        total=Sum('amount_applied'))['total'] or Decimal('0')


def settle_if_nothing_owed(invoice):
    """Close the invoice once every line is billed and nothing is left to collect."""
    lines = list(invoice.invoice_items.all())
    if not lines or any(line.status != 'billed' for line in lines):
        return False
    for line in lines:
        if (line.patient_amount or 0) > _patient_paid(line) or line.insurer_amount > _payer_paid(line):
            return False
    if invoice.status != 'paid':
        invoice.status = 'paid'
        invoice.save(update_fields=['status', 'invoice_updated_at'])
    return True


@transaction.atomic
def apply_invoice_discount(invoice, amount):
    """
    Set the discount on the invoice's total, replacing any already given.

    Spread across the billed lines in proportion to what the patient still owes
    on each, so that paying any one line off stays correct. It only reaches the
    patient's share: an insurer's or employer's portion is an agreed price, and
    is never part of what can be discounted.
    """
    invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)
    lines = list(invoice.invoice_items.filter(status='billed').select_related('item', 'payment_mode__insurance'))
    if not lines:
        raise AdjustmentError("Bill the items first: a discount applies to what has been billed.")

    # What each line could give up: the patient's share still unpaid, plus any
    # invoice discount it already carries, since that is being replaced.
    room = {line.pk: max(Decimal('0'), line.patient_amount + line.invoice_discount - _patient_paid(line))
            for line in lines}
    available = sum(room.values(), Decimal('0'))
    if amount > available:
        raise AdjustmentError(
            f"A discount of {amount} is more than the {available} of cash value left on this "
            f"invoice. Discounts apply to cash only, not to what is billed on credit.")

    left = amount
    eligible = [line for line in lines if room[line.pk] > 0]
    for index, line in enumerate(eligible):
        if index == len(eligible) - 1:
            share = left
        else:
            share = (amount * room[line.pk] / available).quantize(CENT, rounding=ROUND_HALF_UP)
            share = min(share, left)
        line.invoice_discount = share
        left -= share
    for line in lines:
        if line.pk not in {row.pk for row in eligible}:
            line.invoice_discount = Decimal('0')

    try:
        for line in lines:
            line.save()
    except DjangoValidationError as exc:
        raise AdjustmentError(' '.join(exc.messages))

    invoice.refresh_from_db()
    settle_if_nothing_owed(invoice)
    return invoice


def _whole_invoice_requests(invoice):
    return [{'invoice_item': line.pk, 'amount': None}
            for line in invoice.invoice_items.filter(status='billed')
            if line.net_amount > 0]


def _split_credit(line, amount):
    """How a credit divides between the patient's share of the line and the payer's."""
    if line.is_billed_to_patient:
        return amount, Decimal('0')
    net = line.net_amount
    patient_part = (amount * line.patient_amount / net).quantize(CENT, rounding=ROUND_HALF_UP)
    return patient_part, amount - patient_part


@transaction.atomic
def issue_credit_note(*, invoice, reason, lines=None, restock=True, issued_by=None):
    """
    Reverse all of an invoice, or the parts of it named in `lines`: dicts of
    `invoice_item` and an optional `amount`, the rest of the line when left out.

    A line credited in full also has its stock put back when `restock` is set,
    as contra entries in the ledger. Reagents and draw kits a test has already
    used stay used. What had already been paid on a credited line is recorded
    as `refund_due` on the note.
    """
    invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)
    requests = lines or _whole_invoice_requests(invoice)
    if not requests:
        raise AdjustmentError("Nothing on this invoice has been billed that could be credited.")

    by_id = {line.pk: line for line in InvoiceItem.objects.select_for_update().filter(
        invoice=invoice, pk__in=[row['invoice_item'] for row in requests])}

    note = CreditNote.objects.create(invoice=invoice, reason=reason, issued_by=issued_by)
    total, refund_due = Decimal('0'), Decimal('0')

    for row in requests:
        line = by_id.get(row['invoice_item'])
        if line is None:
            raise AdjustmentError(f"Line {row['invoice_item']} is not on invoice {invoice.invoice_number}.")
        if line.status != 'billed':
            raise AdjustmentError(f"{line.item.name} has not been billed, so there is nothing to credit.")

        remaining = line.net_amount
        amount = row.get('amount') or remaining
        if amount <= 0:
            raise AdjustmentError(f"{line.item.name} has no value left to credit.")
        if amount > remaining:
            raise AdjustmentError(
                f"{amount} is more than the {remaining} left on {line.item.name}.")

        patient_part, payer_part = _split_credit(line, amount)
        billed_to_patient = line.is_billed_to_patient
        line.patient_amount -= patient_part
        line.actual_total -= amount if billed_to_patient else payer_part
        line.credited_amount += amount
        line.save()

        refund_due += max(Decimal('0'), _patient_paid(line) - line.patient_amount)
        refund_due += max(Decimal('0'), _payer_paid(line) - line.insurer_amount)

        fully_credited = line.net_amount <= 0
        restocked = False
        if fully_credited and restock:
            restocked = bool(reverse_stock_for_invoice_item(
                line, reason=f"Credit note {note.credit_note_number}: {reason}"[:255],
                performed_by=issued_by))
        if fully_credited:
            _release_unrun_test(line)

        CreditNoteLine.objects.create(
            credit_note=note, invoice_item=line, amount=amount,
            patient_amount=patient_part, payer_amount=payer_part, restocked=restocked)
        total += amount

    note.total_amount = total
    note.refund_due = refund_due
    note.save(update_fields=['total_amount', 'refund_due'])

    invoice.refresh_from_db()
    settle_if_nothing_owed(invoice)
    return note


def _release_unrun_test(line):
    """A test credited before it was run comes back off the Phlebotomy list."""
    from laboratory.models import LabTestRequestPanel
    from patient.models import AttendanceProcess

    if line.item.category != 'Lab Test':
        return
    visit = AttendanceProcess.objects.filter(invoice=line.invoice_id).first()
    if not visit:
        return
    LabTestRequestPanel.objects.filter(
        test_panel__item=line.item, lab_test_request__process=visit.process_test_req_id,
        result__isnull=True,
    ).update(is_billed=False)
