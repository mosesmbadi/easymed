import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from laboratory.models import LabTestRequestPanel

logger = logging.getLogger(__name__)


@receiver(post_save, sender=LabTestRequestPanel)
def tell_people_results_are_ready(sender, instance, **kwargs):
    """
    When the last result on a visit is approved, say so. Checked after the
    commit, so a batch of approvals sends one message, not one per test.
    """
    if not instance.result_approved or not instance.lab_test_request_id:
        return
    process_id = instance.lab_test_request.process_id
    if process_id is None:
        return

    def notify():
        from .lab import notify_results_ready

        try:
            notify_results_ready(process_id)
        except Exception:
            logger.exception("Could not queue results-ready messages for %s", process_id)

    transaction.on_commit(notify)
