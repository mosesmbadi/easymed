import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from laboratory.tasks import deduct_specimen_consumables, deduct_test_kit

from .models import (
    DisposedSample,
    LabTestRequestPanel,
    PatientSample,
    PatientSampleArchive,
    RetestSample,
)

logger = logging.getLogger(__name__)


def _dispatch(task, *args):
    """
    Run the stock task through Celery, falling back to running it inline when
    the broker is unavailable so stock is never silently left unposted.
    """
    try:
        task.delay(*args)
    except Exception as exc:
        logger.warning("Celery unavailable (%s); running %s inline", exc, task.name)
        task(*args)


@receiver(post_save, sender=LabTestRequestPanel)
def trigger_test_kit_deduction(sender, instance, **kwargs):
    """
    Consume reagents when the test is actually run.

    A result appearing is the first moment the reagent has definitely been
    spent. Billing used to be the trigger, which put the deduction before the
    sample had even been drawn -- so a patient who paid and then went home took
    a test worth of reagent with them on paper, and the bench still had it on
    the shelf.

    Whether the test was paid for is a different question from whether it was
    run, and the ledger answers the second. Billing is still refused up front
    when the reagent is not there; see billing.services.check_stock_available.

    Fires on every subsequent save; deduct_test_kit is idempotent per
    (panel, reagent), so only the first one consumes anything.
    """
    if instance.result:
        _dispatch(deduct_test_kit, instance.id)


@receiver(post_save, sender=PatientSample)
def trigger_specimen_consumable_deduction(sender, instance, **kwargs):
    """
    Consume the syringe, tube and gloves once a sample has actually been drawn.

    Run inline rather than queued, unlike the reagents: the person who just
    pressed Collect Sample is holding the tube, and the response they get back
    is what tells them whether the shelf actually had what the draw needed.
    A handful of stock issues is a cheap thing to wait for; finding out later
    that the syringe was not there is not.

    Idempotent per (sample, item), so the saves that follow a collected sample
    around cost nothing.
    """
    if instance.is_sample_collected:
        deduct_specimen_consumables(instance.id)


@receiver(post_save, sender=PatientSampleArchive)
def handle_archive_action(sender, instance, **kwargs):
    """When action is 'dispose' or 'retest', log the event and free the archive position."""
    if instance.action == 'dispose':
        DisposedSample.objects.create(
            patient_sample_code=instance.patient_sample.patient_sample_code,
            position_name=instance.position.name,
            archiving_date=instance.archiving_date,
            disposed_by=instance.created_by,
        )
        PatientSampleArchive.objects.filter(pk=instance.pk).delete()

    elif instance.action == 'retest':
        RetestSample.objects.create(
            patient_sample_code=instance.patient_sample.patient_sample_code,
            position_name=instance.position.name,
            archiving_date=instance.archiving_date,
            retested_by=instance.created_by,
        )
        PatientSampleArchive.objects.filter(pk=instance.pk).delete()