import logging
from django.db import models
from random import randrange, choices
from django.conf import settings
from datetime import datetime
from django.utils import timezone
from django.db import transaction, IntegrityError
from django.core.validators import FileExtensionValidator

from customuser.models import CustomUser


# TODO: Redundant. Should be removed.
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
    Tracks available tests for lab reagents.
    Updated when:
    - Reagent kits are received (increase available_tests)
    - Lab tests are performed and billed (decrease available_tests)
    
    available_tests = total tests that can be run with current stock
    Calculated as: (number of kits in stock) × (subpacked = tests per kit)
    '''
    reagent_item = models.ForeignKey('inventory.Item', on_delete=models.CASCADE, 
                                      limit_choices_to={'category': 'LabReagent'},
                                      related_name='test_counter',
                                      null=True, blank=True)  # Temporary for migration
    lab_test_kit = models.ForeignKey(TestKit, on_delete=models.CASCADE, null=True, blank=True)  # Keep for migration
    available_tests = models.IntegerField(default=0, help_text="Total number of tests available across all kits in stock")
    counter = models.IntegerField(default=0, null=True, blank=True)  # Old field, keep for migration
    minimum_threshold = models.IntegerField(default=10, help_text="Alert when available tests fall below this number")
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Reagent Test Counter"
        verbose_name_plural = "Reagent Test Counters"
    
    def __str__(self):
        if self.reagent_item:
            return f"{self.reagent_item.name} - {self.available_tests} tests available"
        elif self.lab_test_kit:
            return f"{self.lab_test_kit.item.name} - {self.counter} tests (legacy)"
        return "Test Counter"
    
    def is_low_stock(self):
        """Check if reagent tests are below minimum threshold"""
        return self.available_tests <= self.minimum_threshold
    
    def is_out_of_stock(self):
        """Check if reagent tests are depleted"""
        return self.available_tests <= 0
    

class ReagentConsumptionLog(models.Model):
    """
    Tracks every reagent consumption event for audit trail and reporting.
    Created automatically when lab tests are billed.
    """
    reagent_item = models.ForeignKey('inventory.Item', on_delete=models.CASCADE, 
                                      related_name='consumption_logs')
    test_panel = models.ForeignKey('LabTestPanel', on_delete=models.CASCADE,
                                    related_name='reagent_consumptions')
    lab_test_request_panel = models.ForeignKey('LabTestRequestPanel', on_delete=models.CASCADE,
                                                 related_name='reagent_consumptions')
    tests_consumed = models.IntegerField(help_text="Number of tests consumed from reagent")
    available_tests_before = models.IntegerField(help_text="Available tests before consumption")
    available_tests_after = models.IntegerField(help_text="Available tests after consumption")
    consumed_at = models.DateTimeField(auto_now_add=True)
    patient_name = models.CharField(max_length=255, blank=True)
    performed_by = models.ForeignKey('customuser.CustomUser', on_delete=models.SET_NULL, 
                                      null=True, blank=True)
    
    class Meta:
        verbose_name = "Reagent Consumption Log"
        verbose_name_plural = "Reagent Consumption Logs"
        ordering = ['-consumed_at']
        indexes = [
            models.Index(fields=['reagent_item', '-consumed_at']),
            models.Index(fields=['test_panel', '-consumed_at']),
        ]
    
    def __str__(self):
        return f"{self.reagent_item.name} - {self.tests_consumed} tests - {self.consumed_at.strftime('%Y-%m-%d %H:%M')}"


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


class TestPanelReagent(models.Model):
    """
    Links test panels to the reagents they consume.
    Example: Albumin test uses Reagent A and Reagent C
    """
    test_panel = models.ForeignKey('LabTestPanel', on_delete=models.CASCADE, related_name='reagent_links')
    reagent_item = models.ForeignKey('inventory.Item', on_delete=models.CASCADE, limit_choices_to={'category': 'LabReagent'})
    tests_consumed_per_run = models.IntegerField(default=1, help_text="Number of tests consumed from this reagent per lab test run")
    
    class Meta:
        unique_together = ('test_panel', 'reagent_item')
        verbose_name = "Test Panel Reagent"
        verbose_name_plural = "Test Panel Reagents"
    
    def __str__(self):
        return f"{self.test_panel.name} uses {self.reagent_item.name}"


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


class LabTestInterpretation(models.Model):
    '''
    Store interpretation ranges for lab test panels.
    This allows automatic interpretation of results based on numeric values.
    Example: Albumin < 2.0 = "Low albumin (hypoalbuminemia) - may indicate liver disease, malnutrition, or kidney disease"
    '''
    RANGE_TYPE_CHOICES = (
        ('critical_low', 'Critical Low'),
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('critical_high', 'Critical High'),
    )

    SEX_CHOICES = (
        ('M', 'Male'),
        ('F', 'Female'),
        ('B', 'Both'),  # Applies to all genders
    )

    lab_test_panel = models.ForeignKey(
        LabTestPanel, 
        on_delete=models.CASCADE, 
        related_name="interpretations"
    )
    range_type = models.CharField(max_length=20, choices=RANGE_TYPE_CHOICES)
    sex = models.CharField(max_length=1, choices=SEX_CHOICES, default='B')
    age_min = models.IntegerField(null=True, blank=True, help_text="Minimum age in years (leave blank for all ages)")
    age_max = models.IntegerField(null=True, blank=True, help_text="Maximum age in years (leave blank for all ages)")
    
    # Define the range boundaries
    value_min = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Minimum value for this range (leave blank for unbounded)"
    )
    value_max = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Maximum value for this range (leave blank for unbounded)"
    )
    
    # The interpretation text
    interpretation = models.TextField(
        help_text="Clinical interpretation for values in this range"
    )
    
    # Optional recommendations or actions
    clinical_action = models.TextField(
        null=True, 
        blank=True,
        help_text="Recommended clinical actions or follow-up"
    )
    
    # Priority flag for alerts
    requires_immediate_attention = models.BooleanField(
        default=False,
        help_text="Mark as requiring immediate clinical attention"
    )
    
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['lab_test_panel', 'sex', 'age_min', 'value_min']
        verbose_name = "Lab Test Interpretation"
        verbose_name_plural = "Lab Test Interpretations"

    def __str__(self):
        range_str = f"{self.value_min or '-∞'} to {self.value_max or '+∞'}"
        sex_display = self.get_sex_display()
        age_str = ""
        if self.age_min or self.age_max:
            age_str = f" (Age: {self.age_min or '0'}-{self.age_max or '∞'})"
        return f"{self.lab_test_panel.name} - {sex_display}{age_str}: {self.range_type} [{range_str}]"

    def matches_criteria(self, value, patient_sex=None, patient_age=None):
        """
        Check if a given value and patient demographics match this interpretation's criteria.
        
        Args:
            value: The test result value (numeric)
            patient_sex: 'M', 'F', or None
            patient_age: Patient age in years or None
            
        Returns:
            Boolean indicating if this interpretation applies
        """
        # Check sex criteria
        if self.sex != 'B' and patient_sex and self.sex != patient_sex:
            return False
        
        # Check age criteria
        if self.age_min is not None and patient_age is not None and patient_age < self.age_min:
            return False
        if self.age_max is not None and patient_age is not None and patient_age > self.age_max:
            return False
        
        # Check value range
        try:
            value_decimal = float(value)
        except (ValueError, TypeError):
            return False
        
        if self.value_min is not None and value_decimal < float(self.value_min):
            return False
        if self.value_max is not None and value_decimal > float(self.value_max):
            return False
        
        return True


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
            # Lock the table to prevent race conditions during code generation.
            # Find the last sample created in the current year.
            last_sample = PatientSample.objects.select_for_update().filter(
                patient_sample_code__endswith=f"-{current_year}"
            ).order_by('-patient_sample_code').first()

            if last_sample:
                try:
                    # Extract the numeric part of the code, e.g., '00001' from 'DDLR00001-2025'
                    last_number_str = last_sample.patient_sample_code.split('-')[0][len(prefix):]
                    last_number = int(last_number_str)
                    next_number = last_number + 1
                except (ValueError, IndexError): 
                    next_number = 1 # Fallback in case of unexpected format
            else:
                next_number = 1 # First sample of the year

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
    
    # Auto-generated interpretation based on result value
    auto_interpretation = models.TextField(null=True, blank=True, help_text="Auto-generated interpretation based on result ranges")
    clinical_action = models.TextField(null=True, blank=True, help_text="Recommended clinical action from interpretation")
    requires_attention = models.BooleanField(default=False, help_text="Flagged for immediate attention")
    
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
    
    def generate_interpretation(self):
        """
        Auto-generate interpretation based on the result value and patient demographics.
        Returns a tuple of (interpretation_text, clinical_action, requires_attention)
        """
        if not self.result or not self.test_panel:
            return None, None, False
        
        try:
            # Get patient demographics
            patient = self.patient_sample.process.attendanceprocess.patient
            patient_sex = patient.gender  # 'M', 'F', or other
            patient_age = patient.age  # Age in years
            
            # Query matching interpretations
            interpretations = self.test_panel.interpretations.all()
            
            # Find the matching interpretation
            for interp in interpretations:
                if interp.matches_criteria(self.result, patient_sex, patient_age):
                    return (
                        interp.interpretation,
                        interp.clinical_action,
                        interp.requires_immediate_attention
                    )
            
            return None, None, False
        except Exception as e:
            # Log the error but don't break the save
            print(f"Error generating interpretation: {e}")
            return None, None, False
        
    def save(self, *args, **kwargs):
        ''''
        Find or Create PatientSample:
        Attempt to find a PatientSample that matches the current lab_test_request and specimen.
        If no matching PatientSample is found, create a new one.
        Assign this PatientSample to the patient_sample field of the LabTestRequestPanel.
        Set Category: Determine the category (qualitative or quantitative) based on the LabTestPanel's boolean fields.
        Auto-generate interpretation: If result is present, automatically generate interpretation based on defined ranges.
        Save the Model: Call the superclass's save method to ensure the object is saved to the database.
        '''
        if not self.test_code:
            self.test_code = self.generate_test_code()

        # Atomically get or create PatientSample for the request/specimen pair
        if self.lab_test_request and self.test_panel and self.lab_test_request.process:
            with transaction.atomic():
                # Check if there are existing PatientSample objects
                existing_samples = PatientSample.objects.filter(
                    process=self.lab_test_request.process,
                    specimen=self.test_panel.specimen,
                )
                
                if existing_samples.exists():
                    # If there are multiple, use the first one
                    if existing_samples.count() > 1:
                        print(f"Warning: Multiple PatientSample objects found for process={self.lab_test_request.process.id}, specimen={self.test_panel.specimen.id}")
                    self.patient_sample = existing_samples.first()
                else:
                    # Create a new one if none exist
                    self.patient_sample = PatientSample.objects.create(
                        process=self.lab_test_request.process,
                        specimen=self.test_panel.specimen,
                        lab_test_request=self.lab_test_request
                    )

        # Set the category based on the related LabTestPanel
        if self.test_panel.is_qualitative:
            self.category = 'qualitative'
        elif self.test_panel.is_quantitative:
            self.category = 'quantitative'
        else:
            self.category = 'none'

        # Auto-generate interpretation if result is present
        if self.result and self.test_panel and self.patient_sample:
            interpretation, action, attention = self.generate_interpretation()
            if interpretation:
                self.auto_interpretation = interpretation
                self.clinical_action = action
                self.requires_attention = attention

        # Set approved_on timestamp when result is entered or approved
        if self.result and not self.approved_on:
            # Set timestamp when result is first entered
            self.approved_on = datetime.now()
        elif self.result_approved and not self.approved_on:
            # Also set if result_approved is set but approved_on wasn't set
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
