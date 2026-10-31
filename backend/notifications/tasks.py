from celery import shared_task

from .models import OutboundMessage


@shared_task
def send_message(message_id):
    from .services import MAX_ATTEMPTS, deliver, dispatch

    message = OutboundMessage.objects.filter(pk=message_id).first()
    if message is None:
        return
    if not deliver(message) and message.attempts < MAX_ATTEMPTS:
        dispatch(message.id, countdown=60 * 2 ** message.attempts)


@shared_task
def send_queued_messages():
    """Sweep up anything queued while no broker was running."""
    from .services import deliver

    for message in OutboundMessage.objects.filter(status=OutboundMessage.Status.QUEUED)[:200]:
        deliver(message)
