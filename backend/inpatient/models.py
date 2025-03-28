from django.db import models
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError
from patient.models import Patient
from customuser.models import NurseProfile, DoctorProfile

# Create your models here.
class Ward(models.Model):
    name = models.CharField(max_length=50, unique=True)  
    capacity = models.PositiveIntegerField(default=10)   
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class Bed(models.Model):
    STATUS_CHOICES = (
        ('available', 'Available'),
        ('occupied', 'Occupied'),
    )
    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name='beds')
    bed_number = models.CharField(max_length=20)  
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='available')

    class Meta:
        unique_together = ('ward', 'bed_number') 

    def __str__(self):
        return f"{self.ward.name} - {self.bed_number}"


class PatientAdmission(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, 
                               related_name='admissions', 
                               limit_choices_to={'role': 'patient'})
    admission_id = models.CharField(max_length=20, unique=True, editable=False)  
    ward = models.ForeignKey(Ward, on_delete=models.SET_NULL, null=True, related_name='admissions')
    bed = models.OneToOneField(Bed, on_delete=models.SET_NULL, null=True, related_name='current_patient')
    reason_for_admission = models.TextField()  
    admitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                   null=True, related_name='admissions_made', 
                                   limit_choices_to={'role': 'doctor'})
    admitted_at = models.DateTimeField(default=timezone.now)
    discharged_at = models.DateTimeField(null=True, blank=True)

    def generate_admission_id(self):
        return f"IP{self.patient.unique_id}"

    def save(self, *args, **kwargs):
        if not self.admission_id:
            self.admission_id = self.generate_admission_id()
        if self.bed and self.bed.ward != self.ward:
            raise ValidationError("Bed must belong to the assigned ward.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.admission_id} - {self.patient.first_name} {self.patient.second_name}"

    
class WardNurseAssignment(models.Model):
    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name='nurse_assignments')
    nurse = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, 
                                related_name='ward_assignment', limit_choices_to={'role': 'nurse'})
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                   null=True, related_name='nurse_assignments_made', limit_choices_to={'role': 'doctor'})
    assigned_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('nurse', 'ward') 

    def __str__(self):
        return f"{self.nurse.get_fullname()} assigned to {self.ward.name}"