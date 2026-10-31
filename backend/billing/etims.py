"""
Sending settled invoices to KRA eTIMS, off to the side of the sale.

An invoice is queued when it is settled in full. Sending happens in a Celery
task and is retried with a growing wait; a failure is recorded on the
submission, never raised into the payment that settled the invoice.
"""
import logging

from django.db import transaction
from django.utils import timezone

from integrations import etims
from integrations.http import IntegrationError

from .models import EtimsSubmission

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 8


def queue_invoice(invoice):
    """Queue a settled invoice for eTIMS, once. Does nothing while eTIMS is off."""
    if not etims.is_configured():
        return None
    submission, created = EtimsSubmission.objects.get_or_create(invoice=invoice)
    if created:
        transaction.on_commit(lambda: _dispatch(submission.id))
    return submission


def _dispatch(submission_id, countdown=None):
    from .tasks import submit_to_etims

    try:
        submit_to_etims.apply_async((submission_id,), countdown=countdown)
    except Exception as exc:
        # No broker: leave it pending; `manage.py send_etims` picks it up.
        logger.warning("Could not queue eTIMS submission %s: %s", submission_id, exc)


def submit(submission):
    """One attempt. Returns True once KRA has accepted the sale."""
    if submission.status == EtimsSubmission.Status.SENT:
        return True
    submission.attempts += 1
    payload = etims.build_sale_payload(submission.invoice)
    submission.request_payload = payload
    try:
        data = etims.send_sale(payload)
    except IntegrationError as exc:
        submission.status = EtimsSubmission.Status.FAILED
        submission.error = str(exc)
        submission.response_payload = exc.body if isinstance(exc.body, dict) else None
        submission.save()
        logger.warning("eTIMS submission for invoice %s failed: %s", submission.invoice_id, exc)
        return False

    submission.status = EtimsSubmission.Status.SENT
    submission.error = ''
    submission.response_payload = data
    submission.receipt_number = str(data.get('rcptNo') or '')
    submission.receipt_signature = str(data.get('rcptSign') or '')
    submission.internal_data = str(data.get('intrlData') or '')
    submission.qr_url = etims.verification_url(submission.receipt_signature) if submission.receipt_signature else ''
    submission.sent_at = timezone.now()
    submission.save()
    return True


def retry_later(submission):
    if submission.attempts < MAX_ATTEMPTS:
        _dispatch(submission.id, countdown=min(60 * 2 ** submission.attempts, 6 * 3600))
