from uuid import uuid4
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone
from inventory.models import Item
from patient.models import Patient, PrescribedDrug, Referral, AttendanceProcess


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
    
class Schedule(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    def __str__(self):
        return f"Schedules for {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
class ScheduledDrug(models.Model):
    prescription_schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name="prescription_schedule")
    prescribed_drug = models.ForeignKey(PrescribedDrug, on_delete=models.CASCADE, related_name="prescribed_drug")
    schedule_time = models.DateTimeField()
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Schedule for {self.prescribed_drug.item.name} on {self.schedule_time.strftime('%Y-%m-%d %H:%M')}"

class ScheduledLabTest(models.Model):
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name="scheduled_lab_tests")
    # Canonical order object (matches existing lab-test-request workflow)
    lab_test_request = models.ForeignKey(
        'laboratory.LabTestRequest',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='scheduled_occurrences',
    )
    # Backward compatibility: older scheduled records only stored the profile
    lab_test_profile = models.ForeignKey('laboratory.LabTestProfile', on_delete=models.CASCADE, null=True, blank=True)
    schedule_time = models.DateTimeField()
    note = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        profile_name = None
        if self.lab_test_request and self.lab_test_request.test_profile:
            profile_name = self.lab_test_request.test_profile.name
        elif self.lab_test_profile:
            profile_name = self.lab_test_profile.name
        else:
            profile_name = 'Lab Test'

        return f"Schedule for {profile_name} on {self.schedule_time.strftime('%Y-%m-%d %H:%M')}"

class PatientAdmission(models.Model):
    attendance_process = models.ForeignKey(
        AttendanceProcess,
        on_delete=models.CASCADE,
        related_name="AttendanceProcess",
    )
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="admissions"
    )
    admission_id = models.CharField(max_length=40, unique=True, editable=False)
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
    discharged = models.BooleanField(default=False)
    schedules = models.OneToOneField(
        Schedule, on_delete=models.CASCADE, related_name="admission", null=True
    )

    class Meta:
        ordering = ['-admitted_at']
        
    def generate_admission_id(self):
        return f"IP-{self.patient.unique_id}-{self.admitted_at.strftime('%Y%m%d%H%M%S')}"
        uuid = str(uuid4()).replace("-", "")[:8]
        return f"IP-{self.patient.unique_id}-{uuid}"[:20]
    def save(self, *args, **kwargs):
        is_new_object = not self.pk
        if not self.admission_id:
            self.admission_id = self.generate_admission_id()
        # Only check bed/ward relationship if both are set
        if self.bed is not None and self.ward is not None:
            if self.bed.ward != self.ward:
                raise ValidationError("Bed must belong to the assigned ward.")
        if is_new_object and not self.schedules:
            # Create a new Schedule instance if it doesn't exist            
            self.schedules = Schedule.objects.create()
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.admission_id} - {self.patient.first_name} {self.patient.second_name}"


class InPatientTriage(models.Model):
    '''
    i.e /inpatient/patient-admissions/<admission_pk>/triages
    '''
    created_by = models.CharField(max_length=45)
    date_created = models.DateTimeField(auto_now_add=True)
    temperature = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    weight = models.IntegerField(null=True)
    pulse = models.PositiveIntegerField(null=True)
    diastolic = models.PositiveIntegerField(null=True)
    systolic = models.PositiveIntegerField(null=True)
    bmi = models.DecimalField(max_digits=10, decimal_places=1, null=True)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.CharField(max_length=300, blank=True, null=True)
    patient_admission = models.ForeignKey(PatientAdmission, on_delete=models.CASCADE, related_name="triages")

    def __str__(self):
        return f"{self.patient_admission.admission_id} - {self.patient_admission.patient.first_name} {self.patient_admission.patient.second_name}" 


class PatientDischarge(models.Model):
    DISCHARGE_TYPES = (
        ('normal', 'Normal'),
        ('referral', 'External Referral'),
        ('deceased', 'Deceased'),
    )
    admission = models.OneToOneField(PatientAdmission, on_delete=models.CASCADE, related_name="discharge")
    discharged_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,related_name="discharges")
    discharge_types = models.CharField(max_length=20, choices=DISCHARGE_TYPES, default="normal")
    referral = models.ForeignKey(Referral, on_delete=models.SET_NULL, null=True, blank=True, related_name="discharges")
    discharged_at = models.DateTimeField(auto_now_add=True)
    discharge_notes = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.admission.bed:
                self.admission.bed.status = "available"
                self.admission.bed.save()
                self.admission.bed = None
                self.admission.ward = None
                self.admission.discharged = True
                self.admission.save()
            super().save(*args, **kwargs)


    def clean(self):
        if self.discharge_types == 'referral' and not self.referral:
            raise ValidationError("Referral is required for external referral discharge.")
        if self.discharge_types != 'referral' and self.referral:
            raise ValidationError("Referral should only be set for referral discharge.")
        
    def __str__(self):
        return f"Discharge for {self.admission.admission_id} on {self.get_discharge_types_display()}"


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
