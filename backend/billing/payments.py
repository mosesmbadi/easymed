"""
Recording a payment against invoices -- the cashier's screen, an insurer or
employer settling, or an M-Pesa confirmation arriving on its own.

Moved out of AllocatePaymentView unchanged so the M-Pesa callback books money
exactly the way the cashier does.
"""
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum

from .models import Invoice, InvoiceItem, PaymentAllocation, PaymentReceipt, SubAccount


class PaymentAllocationError(Exception):
    """The payment can't be recorded as given; the message says why."""


def allocate_payment(*, invoice_ids, sub_account, amount, reference_number,
                     patient_id=None, insurance_id=None, payment_date=None):
    """
    Allocate a single payment amount across the oldest invoice items in the
    selected invoices. `sub_account` is the id of the account the money landed
    in. Returns the PaymentReceipt.

    Rules:
    - Only applies to the payer's invoices provided.
    - Allocation order: by InvoiceItem.item_created_at ascending.
    - For each InvoiceItem the outstanding component is read off the line
      itself: `actual_total` is what the billed party owes (the insurer on an
      insurance line, the patient on any other) and `patient_amount` is the
      patient's own share, co-pay included. Neither is reconstructed by
      subtraction any more.
    - Minus any previous allocations to that item.
    - Creates a PaymentReceipt and PaymentAllocation entries.
    - Updates Invoice.cash_paid totals accordingly.
    """
    try:
        sub_account = SubAccount.objects.select_related('payment_mode').get(id=sub_account)
    except SubAccount.DoesNotExist:
        raise PaymentAllocationError("Invalid sub account.")
    if not sub_account.payment_mode:
        raise PaymentAllocationError("Selected sub account has no linked payment mode.")

    # Filter invoices based on whether it's patient or insurance payment
    if patient_id:
        invoices = Invoice.objects.filter(id__in=invoice_ids, patient_id=patient_id)
    elif insurance_id:
        invoices = Invoice.objects.filter(
            id__in=invoice_ids,
            invoice_items__payment_mode__insurance_id=insurance_id
        ).distinct()
    else:
        raise PaymentAllocationError("Either patient_id or insurance_id must be provided.")

    if not invoices.exists():
        raise PaymentAllocationError("No invoices found for the selected customer/invoice selection.")

    with transaction.atomic():
        receipt = PaymentReceipt.objects.create(
            patient_id=patient_id,
            insurance_id=insurance_id,
            sub_account=sub_account,
            total_amount=amount,
            reference_number=reference_number,
            payment_date=payment_date,
        )

        remaining = float(amount)
        is_insurance_payment = bool(insurance_id)

        # Fetch allocatable items across invoices, oldest first.
        # Insurance payments only apply to items billed with that insurance.
        items_qs = InvoiceItem.objects.filter(invoice__in=invoices)
        if is_insurance_payment:
            items_qs = items_qs.filter(payment_mode__insurance_id=insurance_id)

        items = items_qs.select_related('payment_mode', 'invoice', 'item').order_by('item_created_at', 'id')

        per_invoice_applied = {}

        for it in items:
            if remaining <= 0:
                break

            # Determine payable component for this item based on who is paying.
            if is_insurance_payment:
                # The insurer owes its share of the line, which is what
                # actual_total holds on an insurance line.
                payable_component = float(it.actual_total or 0)
                already_applied = float(
                    it.allocations.filter(receipt__insurance_id=insurance_id).aggregate(
                        total=Sum('amount_applied')
                    )['total'] or 0
                )
            else:
                # The patient owes their own share: the whole line when it
                # is cash, the co-pay when it is insured. The line records
                # that directly, so there is nothing to work out here.
                payable_component = float(it.patient_amount or 0)

                already_applied = float(
                    it.allocations.filter(
                        receipt__patient_id=patient_id,
                        receipt__insurance__isnull=True,
                    ).aggregate(total=Sum('amount_applied'))['total'] or 0
                )

            outstanding = max(0.0, payable_component - already_applied)

            if outstanding <= 0:
                continue

            apply_now = min(remaining, outstanding)
            if apply_now > 0:
                PaymentAllocation.objects.create(
                    receipt=receipt,
                    invoice_item=it,
                    amount_applied=apply_now,
                )
                remaining -= apply_now
                per_invoice_applied[it.invoice_id] = per_invoice_applied.get(it.invoice_id, 0.0) + apply_now

        # Update invoices: cash_paid only for patient payments, status for all
        for inv in invoices:
            applied = per_invoice_applied.get(inv.id, 0.0)

            # Fallback only for patient cash receipts when no allocatable items exist.
            # For insurance receipts, allocation must remain tied to insurance items.
            if not is_insurance_payment and applied <= 0 and remaining > 0:
                outstanding_cash = float(max(Decimal('0'), (inv.total_cash or Decimal('0')) - (inv.cash_paid or Decimal('0'))))
                if outstanding_cash > 0:
                    invoice_level_apply = min(remaining, outstanding_cash)
                    if invoice_level_apply > 0:
                        applied = invoice_level_apply
                        remaining -= invoice_level_apply

            if applied > 0:
                update_fields = ['status', 'invoice_updated_at']

                # Only increment cash_paid for patient/cash payments
                if not is_insurance_payment:
                    inv.cash_paid = (inv.cash_paid or Decimal('0')) + Decimal(str(applied))
                    update_fields.append('cash_paid')

                # Determine status from total allocations across all items
                total_allocated = inv.invoice_items.aggregate(
                    total=Sum('allocations__amount_applied')
                )['total'] or Decimal('0')
                inv.status = 'paid' if total_allocated >= (inv.invoice_amount or Decimal('0')) else 'pending'

                inv.save(update_fields=update_fields)

    return receipt


def patient_outstanding(invoice):
    """What the patient still owes on this invoice: their share of billed lines, less what they paid."""
    due = invoice.invoice_items.filter(status='billed').aggregate(
        total=Sum('patient_amount'))['total'] or Decimal('0')
    paid = PaymentAllocation.objects.filter(
        invoice_item__invoice=invoice, receipt__patient_id=invoice.patient_id,
        receipt__insurance__isnull=True,
    ).aggregate(total=Sum('amount_applied'))['total'] or Decimal('0')
    return max(Decimal('0'), due - paid)
