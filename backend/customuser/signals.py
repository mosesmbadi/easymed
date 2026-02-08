from django.db.models.signals import post_save
from django.dispatch import receiver
# models
from .models import (
    CustomUser,
    DoctorProfile,
    LabTechProfile,
    NurseProfile,
    SysadminProfile,
    ReceptionistProfile,
    PharmacistProfile,
)


@receiver(post_save, sender=CustomUser)
def create_user_profile(sender: CustomUser, instance: CustomUser, created: bool, **kwargs):
    if not created:
        return
    if instance.role == CustomUser.RECEPTIONIST:
        try:
            ReceptionistProfile.objects.create(user=instance)
            return
        except Exception as e:
            return

    if instance.role == CustomUser.DOCTOR:
        try:
            DoctorProfile.objects.create(user=instance)
            return
        except Exception as e:
            return

    if instance.role == CustomUser.NURSE:
        try:
            NurseProfile.objects.create(user=instance)
            return
        except Exception as e:
            return

    if instance.role == CustomUser.LAB_TECH:
        try:
            LabTechProfile.objects.create(user=instance)
            return
        except Exception as e:
            return

    if instance.role == CustomUser.SYS_ADMIN:
        try:
            SysadminProfile.objects.create(user=instance)
            return
        except Exception as e:
            return

    if instance.role == CustomUser.PHARMACIST:
        try:
            PharmacistProfile.objects.create(user=instance)
            return
        except Exception as e:
            return


