from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from .models import PatientAdmission, Bed



@receiver(pre_delete, sender=PatientAdmission)
def free_bed_on_discharge(sender, instance, **kwargs):
    if instance.bed:
        instance.bed.status = 'available'
        instance.bed.save()