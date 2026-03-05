from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import LabTestRequestPanel, PatientSampleArchive, DisposedSample
from laboratory.tasks import deduct_test_kit

@receiver(post_save, sender=LabTestRequestPanel)
def trigger_test_kit_deduction(sender, instance, **kwargs):
    if instance.is_billed:
        deduct_test_kit.delay(instance.id)

    print("Test Counter Signal Triggered")


@receiver(post_save, sender=PatientSampleArchive)
def handle_dispose_action(sender, instance, **kwargs):
    """When action is 'dispose', log the disposal and delete the archive record."""
    if instance.action == 'dispose':
        DisposedSample.objects.create(
            patient_sample_code=instance.patient_sample.patient_sample_code,
            position_name=instance.position.name,
            archiving_date=instance.archiving_date,
            disposed_by=instance.created_by,
        )
        # Use queryset delete to avoid re-triggering the signal
        PatientSampleArchive.objects.filter(pk=instance.pk).delete()