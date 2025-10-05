import logging
from django.db import models
from random import randrange, choices
from django.conf import settings
from datetime import datetime
from django.utils import timezone
from django.db import transaction, IntegrityError
from django.core.validators import FileExtensionValidator

from customuser.models import CustomUser


class TestKit(models.Model):
    '''
    This model stores infrmation about a Test kit
    Will be updated manually after an Inventory record of that 
    kit is created
    '''
    item = models.ForeignKey('inventory.Item', on_delete=models.CASCADE)
    number_of_tests = models.IntegerField()

    def __str__(self):
        return self.item.name


class TestKitCounter(models.Model):
    '''
    The intention is to keep track of test kits, their respective number of 
    tests then update this model with a counter of how many tests are remaining
    signaled by LabTestRequest on billed. Deduct from TestKit, nearest expiry starting.
    Will need to be updated manually everytime a kit is bought, or update with IncomingItem
    '''
    lab_test_kit = models.ForeignKey(TestKit, on_delete=models.CASCADE)
    counter = models.IntegerField(default=0) # number os tests remaining

    def __str__(self):
        return f"{self.lab_test_kit.item.name} - {self.counter}"
    

class LabEquipment(models.Model):
    COM_MODE_CHOICE = (
        ("serial", "Serial"),
        ("tcp", "Parallel"),
        ("network_directory", "Network Directory"),
    )
    FORMAT_CHOICE = (
        ("hl7", "HL7"),
        ("astm", "ASTM"),
    )
    name = models.CharField(max_length=250)
    ip_address = models.GenericIPAddressField(null=True) 
    port = models.CharField(max_length=20, null=True)
    data_format = models.CharField(max_length=10, choices=FORMAT_CHOICE, default="hl7")
    com_mode = models.CharField(max_length=20, choices=COM_MODE_CHOICE, default="tcp")

    def __str__(self):
        return self.name


class LabReagent(models.Model):
    name = models.CharField(max_length=255)
    cas_number = models.CharField(max_length=255)
    molecular_weight = models.DecimalField(max_digits=10, decimal_places=2)
    purity = models.DecimalField(max_digits=10, decimal_places=2)
    item_number = models.ForeignKey('inventory.Item', on_delete=models.CASCADE)

    def __str__(self):
        return self.name


class LabTestProfile(models.Model):
    name = models.CharField(max_length=255)
    
    def __str__(self):
        return self.name


class Specimen(models.Model):
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name


class LabTestPanel(models.Model):
    UNITS_OPTIONS = (
        ('mL', 'mL'),
        ('uL', 'uL'),
        ('L', 'L'),
        ('mg', 'mg'),
        ('ug', 'ug'),
        ('g', 'g'),
        ('IU', 'IU'),
        ('IU/ml', 'IU/ml'),
        ('ng/ml', 'ng/ml'),
        ('ng', 'ng'),
    )
    name = models.CharField(max_length=255)
    specimen = models.ForeignKey(Specimen, on_delete=models.CASCADE, null=True, blank=True)
    test_profile = models.ForeignKey(LabTestProfile, on_delete=models.CASCADE)
    unit = models.CharField(max_length=10, choices=UNITS_OPTIONS, default='mL')
    # TODO: To get back to. Change to Inventory from 'inventory.Item'
    item = models.ForeignKey('inventory.Item', on_delete=models.CASCADE)
    is_qualitative = models.BooleanField(default=False)
    is_quantitative = models.BooleanField(default=True)
    # turn around time
    tat = models.DurationField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} {self.unit} - {self.test_profile.name}"


class ReferenceValue(models.Model):
    '''
    capture different reference values in the LabTestPanel model
    based on the patient’s sex and age, you can create a related
    model that stores reference ranges and conditions based on
    patient sex and age
    '''
    SEX_CHOICES = (
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    )

    lab_test_panel = models.ForeignKey(LabTestPanel, on_delete=models.CASCADE, related_name="reference_values")
    sex = models.CharField(max_length=1, choices=SEX_CHOICES)
    age_min = models.IntegerField(null=True, blank=True)  # Minimum age for this reference range
    age_max = models.IntegerField(null=True, blank=True)  # Maximum age for this reference range
    ref_value_low = models.DecimalField(max_digits=10, decimal_places=2)
    ref_value_high = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.lab_test_panel.name} - {self.sex} - {self.age_min}-{self.age_max}: {self.ref_value_low} - {self.ref_value_high}"



class ProcessTestRequest(models.Model):
    reference = models.CharField(max_length=40) # track_number of AttendanceProcess is stored here

    def __str__(self):
        return self.reference


class LabTestRequest(models.Model):
    process = models.ForeignKey(ProcessTestRequest, on_delete=models.CASCADE, null=True, blank=True, related_name="attendace_test_requests") # from patient app
    test_profile = models.ForeignKey(LabTestProfile, on_delete=models.CASCADE, null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    requested_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, null=True, blank=True)
    requested_on = models.TimeField(auto_now_add=True, null=True, blank=True)
    has_result = models.BooleanField(default=False)
    created_on= models.DateField(auto_now_add=True)

    def __str__(self):
        return str(self.id)


class PatientSample(models.Model):
    specimen = models.ForeignKey(Specimen, on_delete=models.CASCADE)
    lab_test_request = models.ForeignKey(LabTestRequest, null=True, on_delete=models.CASCADE)
    patient_sample_code = models.CharField(max_length=100, unique=True)
    process = models.ForeignKey(ProcessTestRequest, on_delete=models.CASCADE, null=True, blank=True) # from patient app
    is_sample_collected = models.BooleanField(default=False)

    def generate_sample_code(self):
        prefix = "DDLR"
        current_year = timezone.now().year

        with transaction.atomic():
            last_sample = PatientSample.objects.filter(
                patient_sample_code__startswith=prefix
            ).order_by('-id').select_for_update().first()

            if last_sample:
                try:
                    last_sample_year_str = last_sample.patient_sample_code.split('-')[1] 
                    if last_sample_year_str == str(current_year): 
                        last_number = int(last_sample.patient_sample_code[4:9])
                        next_number = last_number + 1
                    else:
                        next_number = 1  
                except (ValueError, IndexError): 
                    next_number = 1
            else:
                next_number = 1

            new_number_str = f"{next_number:05d}"
            sp_id = f"{prefix}{new_number_str}-{current_year}"  
            return sp_id

    def save(self, *args, **kwargs):
        """Generate a unique patient_sample_code with retry to avoid race condition.
        Multiple concurrent LabTestRequestPanel creations were producing the
        same next sequence value leading to IntegrityError on unique constraint.
        We retry a few times regenerating the code if a collision occurs.
        """
        # Ensure process set from related request (before code generation logic in case future depends on process)
        if self.lab_test_request and self.lab_test_request.process:
            self.process = self.lab_test_request.process

        max_attempts = 5
        attempt = 0
        while attempt < max_attempts:
            if not self.patient_sample_code:
                self.patient_sample_code = self.generate_sample_code()
            try:
                super().save(*args, **kwargs)
                break  # success
            except IntegrityError as e:
                # If duplicate key on patient_sample_code, clear and retry
                if 'patient_sample_code' in str(e):
                    attempt += 1
                    if attempt >= max_attempts:
                        raise  # bubble up after exhausting retries
                    # Clear code to force regeneration
                    self.patient_sample_code = None
                    continue
                # Different integrity error, re-raise immediately
                raise

    def __str__(self):
        return str(f"{self.patient_sample_code} - {self.specimen.name} - {self.process}")


class LabTestRequestPanel(models.Model):
    patient_sample = models.ForeignKey(PatientSample, null=True, on_delete=models.CASCADE)
    result = models.CharField(max_length=45, null=True)
    test_panel = models.ForeignKey(LabTestPanel, on_delete=models.SET("Deleted Panel"))
    lab_test_request = models.ForeignKey(LabTestRequest, on_delete=models.CASCADE)
    test_code = models.CharField(max_length=100, null=True)
    category = models.CharField(max_length=30, default="none")
    result_approved=models.BooleanField(default=False)
    approved_on = models.DateTimeField(null=True, blank=True) 
    is_billed = models.BooleanField(default=False)
    
    def generate_test_code(self):
        while True:
            random_number = ''.join(choices('0123456789', k=4))
            test_id = f"TC-{random_number}"
            if not LabTestRequestPanel.objects.filter(test_code=test_id).exists():
                return test_id
            
    def get_patient_name(self):
        return self.patient_sample.process.reference  # Should get you the process track_number or reference ID

    def get_patient_info(self):
        patient = self.patient_sample.process.attendanceprocess.patient
        return f"{patient.first_name} {patient.second_name}, Age: {patient.age}, Sex: {patient.gender}"
        
    def save(self, *args, **kwargs):
        ''''
        Find or Create PatientSample:
        Attempt to find a PatientSample that matches the current lab_test_request and specimen.
        If no matching PatientSample is found, create a new one.
        Assign this PatientSample to the patient_sample field of the LabTestRequestPanel.
        Set Category: Determine the category (qualitative or quantitative) based on the LabTestPanel's boolean fields.
        Save the Model: Call the superclass's save method to ensure the object is saved to the database.
        '''
        if not self.test_code:
            self.test_code = self.generate_test_code()

        # Atomically get or create PatientSample for the request/specimen pair
        if self.lab_test_request and self.test_panel and self.lab_test_request.process:
            with transaction.atomic():
                matching_sample, created = PatientSample.objects.select_for_update().get_or_create(
                    process=self.lab_test_request.process,
                    specimen=self.test_panel.specimen,
                    defaults={
                        'lab_test_request': self.lab_test_request
                    }
                )
                self.patient_sample = matching_sample

        # Set the category based on the related LabTestPanel
        if self.test_panel.is_qualitative:
            self.category = 'qualitative'
        elif self.test_panel.is_quantitative:
            self.category = 'quantitative'
        else:
            self.category = 'none'

        # Check if result_approved is being set to True and set approved_on
        if self.result_approved and not self.approved_on:
            self.approved_on = datetime.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.test_panel.name}"


class PublicLabTestRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    )
    # patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    appointment_date = models.DateField()
    status = models.CharField( max_length=10, choices=STATUS_CHOICES, default='pending')
    date_created = models.DateField(auto_now_add=True)
    date_changed = models.DateField(auto_now=True)
    lab_request = models.FileField(
        upload_to="Lab Test Requests/public-requests",
        max_length=254,
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'img', 'png', 'jpg'])]
    )
    test_profile = models.ForeignKey(LabTestProfile, on_delete=models.PROTECT)
    sample_collected = models.BooleanField(default=False,null=True, blank=True)
    sample_id = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return f"PublicTestRequest #{self.patient.first_name} - {self.test_profile}"
    
    @property
    def age(self):
        if self.patient.date_of_birth:
            patient_age:int = (datetime.now().year - self.patient.date_of_birth.year)
            return patient_age
        return None

