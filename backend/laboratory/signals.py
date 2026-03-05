from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import LabTestRequestPanel, PatientSampleArchive, DisposedSample, RetestSample
from laboratory.tasks import deduct_test_kit

@receiver(post_save, sender=LabTestRequestPanel)
def trigger_test_kit_deduction(sender, instance, **kwargs):
    if instance.is_billed:
        deduct_test_kit.delay(instance.id)

    print("Test Counter Signal Triggered")


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