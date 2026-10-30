from django.db.models.signals import post_save
from django.dispatch import receiver

# models
from .models import ReceptionistProfile
from customuser.models import CustomUser

# @receiver(post_save, sender=)