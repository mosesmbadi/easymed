"""
Queueing and sending messages. A message is recorded first, then sent from a
Celery task once the work that caused it has committed; a channel that isn't
set up is recorded as skipped. Nothing here raises into the caller.
"""
import logging

from django.conf import settings
from django.core.mail import EmailMessage
from django.db import IntegrityError, transaction
from django.utils import timezone

from integrations import messaging
from integrations.http import IntegrationError

from .models import OutboundMessage

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5


def email_configured():
    return bool(settings.RESULTS_EMAIL_ENABLED and getattr(settings, 'EMAIL_HOST', ''))


CONFIGURED = {
    OutboundMessage.Channel.SMS: messaging.sms_configured,
    OutboundMessage.Channel.WHATSAPP: messaging.whatsapp_configured,
    OutboundMessage.Channel.EMAIL: email_configured,
}


def queue(*, channel, recipient, body, dedupe_key, subject='', patient=None, lab_results_id=None):
    """Record a message and send it after commit. Once per dedupe_key; returns it, or None."""
    if not recipient:
        return None
    configured = CONFIGURED[channel]()
    try:
        with transaction.atomic():
            message, created = OutboundMessage.objects.get_or_create(
                dedupe_key=dedupe_key,
                defaults=dict(
                    channel=channel, recipient=recipient, subject=subject[:200], body=body,
                    patient=patient, lab_results_id=lab_results_id,
                    status=OutboundMessage.Status.QUEUED if configured else OutboundMessage.Status.SKIPPED,
                    error='' if configured else f"{OutboundMessage.Channel(channel).label} is not set up.",
                ))
    except IntegrityError:
        return None
    if created and configured:
        transaction.on_commit(lambda: dispatch(message.id))
    return message


def dispatch(message_id, countdown=None):
    from .tasks import send_message

    try:
        send_message.apply_async((message_id,), countdown=countdown)
    except Exception as exc:
        # No broker: it stays queued, and the periodic sweep sends it.
        logger.warning("Could not queue message %s: %s", message_id, exc)


def deliver(message):
    """One attempt at sending. Returns True when sent."""
    if message.status == OutboundMessage.Status.SENT:
        return True
    message.attempts += 1
    try:
        if message.channel == OutboundMessage.Channel.SMS:
            message.provider_reference = messaging.send_sms(message.recipient, message.body)
        elif message.channel == OutboundMessage.Channel.WHATSAPP:
            message.provider_reference = messaging.send_whatsapp(message.recipient, message.body)
        else:
            _send_email(message)
    except (IntegrationError, OSError, ValueError) as exc:
        message.status = OutboundMessage.Status.FAILED
        message.error = str(exc)[:2000]
        message.save()
        logger.warning("Message %s failed: %s", message.id, exc)
        return False
    message.status = OutboundMessage.Status.SENT
    message.error = ''
    message.sent_at = timezone.now()
    message.save()
    return True


def _send_email(message):
    email = EmailMessage(subject=message.subject or 'EaSyMed', body=message.body,
                         to=[message.recipient])
    if message.lab_results_id:
        email.attach(f"results_{message.lab_results.reference}.pdf",
                     _results_pdf(message.lab_results_id), 'application/pdf')
    email.send(fail_silently=False)


def _results_pdf(process_test_request_id):
    from django.test import RequestFactory

    from laboratory.views import render_labtestresult_pdf

    # Rendered outside a request: the report only needs one to build image URLs.
    return render_labtestresult_pdf(RequestFactory().get('/'), process_test_request_id)
