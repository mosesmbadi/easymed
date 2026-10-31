"""
Taking M-Pesa at the till by STK push, and booking the payment when
Safaricom confirms it.
"""
import logging
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from integrations import mpesa
from integrations.http import IntegrationError

from .models import MpesaPaymentRequest, SubAccount
from .payments import PaymentAllocationError, allocate_payment, patient_outstanding

logger = logging.getLogger(__name__)

CANCELLED_BY_CUSTOMER = 1032


class MpesaRequestError(Exception):
    """The push could not be sent; the message is for the cashier."""


def mpesa_sub_account():
    """The finance account M-Pesa money lands in."""
    accounts = SubAccount.objects.filter(active=True)
    if settings.MPESA_SUB_ACCOUNT_ID:
        return accounts.filter(pk=settings.MPESA_SUB_ACCOUNT_ID).first()
    return accounts.filter(payment_mode__payment_category='mobile_money').order_by('id').first()


def request_payment(*, invoice, phone, amount=None, requested_by=None):
    """
    Prompt the customer's phone for what they owe on `invoice` (or `amount`).
    Raises mpesa.MpesaNotConfigured when M-Pesa is off, MpesaRequestError when
    the request can't be made.
    """
    if not mpesa.is_configured():
        raise mpesa.MpesaNotConfigured(
            "M-Pesa prompts aren't set up here. Take the payment as usual and enter the M-Pesa code.")
    number = mpesa.normalize_phone(phone)
    if number is None:
        raise MpesaRequestError("Enter a Safaricom number, e.g. 0712 345 678.")
    amount = Decimal(amount) if amount else patient_outstanding(invoice)
    if amount <= 0:
        raise MpesaRequestError("Nothing is owed on this invoice.")

    request = MpesaPaymentRequest.objects.create(
        invoice=invoice, phone=number, amount=amount, requested_by=requested_by)
    try:
        merchant_id, checkout_id = mpesa.stk_push(
            phone=number, amount=amount,
            account_reference=invoice.invoice_number or f"INV{invoice.id}",
            description="Medical bill")
    except IntegrationError as exc:
        request.status = MpesaPaymentRequest.Status.FAILED
        request.result_description = str(exc)[:255]
        request.save()
        raise MpesaRequestError(f"Safaricom didn't take the request: {exc}")
    request.merchant_request_id = merchant_id
    request.checkout_request_id = checkout_id
    request.save()
    return request


def handle_callback(body):
    """
    Safaricom's answer to a push. Idempotent: Safaricom may call more than
    once, and only the first paid callback books money.
    """
    result = mpesa.parse_callback(body)
    with transaction.atomic():
        request = (MpesaPaymentRequest.objects.select_for_update()
                   .filter(checkout_request_id=result['checkout_request_id']).first())
        if request is None:
            logger.warning("M-Pesa callback for an unknown request: %s", result['checkout_request_id'])
            return None
        if request.status != MpesaPaymentRequest.Status.PENDING:
            return request

        request.callback_payload = body
        request.result_description = (result['result_description'] or '')[:255]
        if result['result_code'] == CANCELLED_BY_CUSTOMER:
            request.status = MpesaPaymentRequest.Status.CANCELLED
        elif result['result_code'] != 0:
            request.status = MpesaPaymentRequest.Status.FAILED
        else:
            request.status = MpesaPaymentRequest.Status.PAID
            request.mpesa_receipt_number = result['receipt_number'] or ''
            request.receipt = _book(request, Decimal(str(result['amount'] or request.amount)))
        request.save()
    return request


def _book(request, amount):
    """Record the money against the invoice as the cashier would; None if it can't be."""
    account = mpesa_sub_account()
    if account is None:
        request.result_description = ("Paid, but no M-Pesa finance account is set up to book it to. "
                                      "Record it by hand.")[:255]
        return None
    try:
        return allocate_payment(
            patient_id=request.invoice.patient_id,
            invoice_ids=[request.invoice_id],
            sub_account=account.id,
            amount=amount,
            reference_number=request.mpesa_receipt_number or request.checkout_request_id,
            payment_date=timezone.localdate(),
        )
    except PaymentAllocationError as exc:
        request.result_description = f"Paid, but not booked: {exc}"[:255]
        return None
