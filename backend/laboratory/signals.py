from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import LabTestRequestPanel
from laboratory.tasks import deduct_test_kit

@receiver(post_save, sender=LabTestRequestPanel)
def trigger_test_kit_deduction(sender, instance, **kwargs):
    if instance.is_billed:
        deduct_test_kit.delay(instance.id)

    print("Test Counter Signal Triggered")