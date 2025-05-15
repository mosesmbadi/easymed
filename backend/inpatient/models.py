from uuid import uuid4
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone
from patient.models import Patient


class Ward(models.Model):
    GENDER_CHOICES = (
        ("male", "Male"),
        ("female", "Female"),
    )

    WARD_TYPES = (
        ("general", "General"),
        ("maternity", "Maternity"),
        ("pediatrics", "Pediatrics"),
        ("amenity", "Amenity"),
    )
    name = models.CharField(max_length=50, unique=True)
    ward_type = models.CharField(max_length=10, choices=WARD_TYPES, default="general")
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default="male")
    capacity = models.PositiveIntegerField(default=10)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.name} - ({self.get_ward_type_display()}) - {self.get_gender_display()}"


class Bed(models.Model):
    STATUS_CHOICES = (
        ("available", "Available"),
        ("occupied", "Occupied"),
    )
    BED_TYPES = [
        ("manual", "Manual Hospital Bed"),
        ("semi_electric", "Semi-Electric Hospital Bed"),
        ("fully_electric", "Fully Electric Hospital Bed"),
        ("bariatric", "Bariatric Hospital Bed"),
    ]

    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name="beds")
    bed_type = models.CharField(max_length=15, choices=BED_TYPES, default="manual")
    # i.e B-A12: Bed A12 in Ward B
    bed_number = models.CharField(max_length=20)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="available"
    )

    class Meta:
        unique_together = ("ward", "bed_number")

    def __str__(self):
        return f"{self.ward.name} - {self.bed_number}"


class PatientAdmission(models.Model):
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="admissions"
    )
    admission_id = models.CharField(max_length=20, unique=True, editable=False)
    ward = models.ForeignKey(
        Ward, on_delete=models.SET_NULL, null=True, related_name="admissions"
    )
    bed = models.OneToOneField(
        Bed, on_delete=models.SET_NULL, null=True, related_name="current_patient"
    )
    reason_for_admission = models.TextField()
    admitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="admissions_made",
    )
    admitted_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-admitted_at']
        
    def generate_admission_id(self):
        ts = timezone.now().strftime('%Y%m%d%H%M%S%f')  
        return f"IP-{self.patient.unique_id}-{ts}"

    def save(self, *args, **kwargs):
        if not self.admission_id:
            self.admission_id = self.generate_admission_id()
        if self.bed and self.bed.ward != self.ward:
            raise ValidationError("Bed must belong to the assigned ward.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.admission_id} - {self.patient.first_name} {self.patient.second_name}"


class PatientDischarge(models.Model):
    admission = models.OneToOneField(
        PatientAdmission, on_delete=models.CASCADE, related_name="discharge"
    )
    discharged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="discharges",
    )
    discharged_at = models.DateTimeField(auto_now_add=True)
    discharge_notes = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.admission.bed:
                self.admission.bed.status = "available"
                self.admission.bed.save()
                self.admission.bed = None
                self.admission.save()
            super().save(*args, **kwargs)

    def __str__(self):
        return f"Discharge for {self.admission.admission_id} on {self.discharged_at}"


class WardNurseAssignment(models.Model):
    ward = models.ForeignKey(
        Ward, on_delete=models.CASCADE, related_name="nurse_assignments"
    )
    nurse = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ward_assignment",
        limit_choices_to={"role": "nurse"},
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="nurse_assignments_made",
        limit_choices_to={"role": "senior_nurse"},
    )
    assigned_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("nurse", "ward")

    def __str__(self):
        return f"{self.nurse.get_fullname()} assigned to {self.ward.name}"
