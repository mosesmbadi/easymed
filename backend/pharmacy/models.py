from django.db import models
from django.core.validators import FileExtensionValidator
from django.conf import settings
from django.utils import timezone
from datetime import datetime

from patient.models import Patient


class PublicPrescriptionRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    )
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    status = models.CharField( max_length=10, choices=STATUS_CHOICES, default='pending')
    date_created = models.DateField(auto_now_add=True)
    date_changed = models.DateField(auto_now=True)
    public_prescription = models.FileField(
        upload_to="Prescriptions/public-prescriptions",
        max_length=254,
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'img', 'png', 'jpg'])]
    )

    def __str__(self):
        return f"PublicPrescriptionrequest #{self.patient.first_name}"
    
    @property
    def age(self):
        if self.patient.date_of_birth:
            patient_age:int = (datetime.now().year - self.patient.date_of_birth.year)
            return patient_age
        return None

class DrugsFeedback(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    drug = models.ForeignKey('inventory.Item', on_delete=models.CASCADE)
    date_created = models.DateField(auto_now_add=True)
    date_changed = models.DateField(auto_now=True)
    feedback = models.TextField(max_length=1000, null=True, blank=True)  

    def __str__(self):
        return f"DrugsFeedback #{self.drug.name}"

class DrugCategory(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return self.name

class DrugMode(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name

class DrugState(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name

class Drug(models.Model):
    item = models.OneToOneField('inventory.Item', on_delete=models.CASCADE, related_name='drug_details')
    category = models.ForeignKey(DrugCategory, on_delete=models.SET_NULL, null=True, blank=True)
    mode = models.ForeignKey(DrugMode, on_delete=models.SET_NULL, null=True, blank=True)
    state = models.ForeignKey(DrugState, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.item.name