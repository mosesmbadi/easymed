"""
The statement a credit account is sent: what it was billed in a period, what
it paid, and what it owes.

An employer or a referring facility is billed per line as its people are seen,
and settles once a month against a statement -- not against each invoice, which
are the patients' and number in the hundreds. The money is the same the
receivables screen works in: a line's `actual_total` is what is receivable
from the account, and a receipt against the account is what it paid.
"""
import datetime as _dt
from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone

from .models import InvoiceItem, PaymentReceipt


def month_bounds(day):
    first = day.replace(day=1)
    following = (first + _dt.timedelta(days=32)).replace(day=1)
    return first, following - _dt.timedelta(days=1)


def _charges(account):
    return InvoiceItem.objects.filter(
        payment_mode__insurance=account, status='billed')


def _receipts(account):
    # A receipt counts on its payment date, or the day it was entered.
    return PaymentReceipt.objects.filter(insurance=account).annotate(
        day=Coalesce('payment_date', TruncDate('created_at')))


def account_statement(account, start=None, end=None):
    """
    The account's statement from `start` to `end` inclusive, the current month
    by default. A line counts on the day it was raised.
    """
    if start is None or end is None:
        start, end = month_bounds(timezone.localdate())

    billed_before = _charges(account).filter(
        item_created_at__date__lt=start).aggregate(total=Sum('actual_total'))['total'] or Decimal('0')
    paid_before = _receipts(account).filter(
        day__lt=start).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
    opening = billed_before - paid_before

    lines = (_charges(account)
             .filter(item_created_at__date__gte=start, item_created_at__date__lte=end)
             .select_related('item', 'invoice__patient__referred_from')
             .order_by('item_created_at', 'id'))
    charges = [{
        'date': timezone.localdate(line.item_created_at),
        'invoice_number': line.invoice.invoice_number,
        'patient_number': getattr(line.invoice.patient, 'unique_id', '') or '',
        'patient_name': (line.invoice.patient.display_name if line.invoice.patient_id else ''),
        'item': line.item.name,
        'quantity': line.quantity,
        'amount': line.actual_total or Decimal('0'),
    } for line in lines]

    payments = [{
        'date': receipt.day,
        'reference': receipt.reference_number,
        'amount': receipt.total_amount,
    } for receipt in _receipts(account).filter(
        day__gte=start, day__lte=end).order_by('day', 'id')]

    total_charged = sum((row['amount'] for row in charges), Decimal('0'))
    total_paid = sum((row['amount'] for row in payments), Decimal('0'))
    return {
        'account': {
            'id': account.id,
            'name': account.name,
            'account_type': account.account_type,
            'account_type_display': account.get_account_type_display(),
            'contact_person': account.contact_person,
            'email': account.email,
            'phone': account.phone,
            'address': account.address,
        },
        'start': start,
        'end': end,
        'opening_balance': opening,
        'charges': charges,
        'payments': payments,
        'total_charged': total_charged,
        'total_paid': total_paid,
        'closing_balance': opening + total_charged - total_paid,
    }
