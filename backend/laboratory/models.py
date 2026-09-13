import logging
from django.db import models
from django.db.models import Sum
from random import randrange, choices
from django.conf import settings
from datetime import datetime
from django.utils import timezone
from django.db import transaction, IntegrityError
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError

from customuser.models import CustomUser


# TestKitCounter used to live here, mirroring reagent stock alongside
# Inventory.quantity_at_hand. Two counters for one quantity always drift, so
# reagent availability is now derived from the stock ledger --
# see laboratory.utils.reagent_stock().


class ReagentConsumptionLog(models.Model):
    """
    Tracks every reagent consumption event for audit trail and reporting.
    Written automatically when a lab test result is recorded, which is the
    moment the reagent was actually spent.
    """
    reagent_item = models.ForeignKey('inventory.Item', on_delete=models.CASCADE, 
                                      related_name='consumption_logs')
    test_panel = models.ForeignKey('LabTestPanel', on_delete=models.CASCADE,
                                    related_name='reagent_consumptions')
    lab_test_request_panel = models.ForeignKey('LabTestRequestPanel', on_delete=models.CASCADE,
                                                 related_name='reagent_consumptions')
    tests_consumed = models.IntegerField(help_text="Number of tests consumed from reagent")
    available_tests_before = models.IntegerField(help_text="Reagent stock before consumption, from the ledger")
    available_tests_after = models.IntegerField(help_text="Reagent stock after consumption, from the ledger")
    stock_movement_reference = models.UUIDField(
        null=True, blank=True,
        help_text="Groups the StockMovement rows this consumption produced")
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
    """
    Chemistry metadata for lab reagents (CAS number, molecular weight, purity).
    NOT used for stock tracking -- the stock ledger is the source of truth.
    """
    name = models.CharField(max_length=255)
    cas_number = models.CharField(max_length=255)
    molecular_weight = models.DecimalField(max_digits=10, decimal_places=2)
    purity = models.DecimalField(max_digits=10, decimal_places=2)
    item = models.OneToOneField('inventory.Item', on_delete=models.CASCADE, related_name='lab_reagent_metadata')

    def __str__(self):
        return self.name


class LabTestProfile(models.Model):
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name

    def billing_items(self):
        """Return the set of billing Items for all panels in this profile."""
        from inventory.models import Item
        item_ids = self.labtestpanel_set.values_list('item_id', flat=True)
        return Item.objects.filter(id__in=item_ids)


class Specimen(models.Model):
    name = models.CharField(max_length=255)
    max_archive_duration = models.PositiveIntegerField(default=1, null=True, blank=True, help_text="Maximum duration a specimen can be archived (in days)")

    def collection_requirements(self):
        """What a phlebotomist uses up taking one sample of this specimen."""
        return list(self.consumables.select_related('item').all())

    def __str__(self):
        return self.name


class SpecimenConsumable(models.Model):
    """
    What it takes to collect one sample of a specimen: a syringe, a vacutainer,
    a pair of gloves, a slide.

    These belong to the draw, not to the test. Three panels ordered off one
    blood sample share one syringe, and a retest off an archived sample uses
    none at all -- which is why they are deducted when the sample is collected
    rather than when a panel is billed.
    """
    specimen = models.ForeignKey(Specimen, on_delete=models.CASCADE, related_name='consumables')
    item = models.ForeignKey(
        'inventory.Item', on_delete=models.PROTECT,
        limit_choices_to={'category_one': 'Internal'},
        related_name='specimen_consumable_links',
        help_text="An internal consumable held in stock: syringe, tube, gloves")
    quantity_per_collection = models.PositiveIntegerField(
        default=1,
        help_text="Base units deducted each time a sample of this specimen is collected")
    is_required = models.BooleanField(
        default=True,
        help_text="Required items warn loudly when short; optional ones only note it")

    class Meta:
        unique_together = ('specimen', 'item')
        ordering = ['specimen', 'item']
        verbose_name = "Specimen Consumable"
        verbose_name_plural = "Specimen Consumables"

    def clean(self):
        if self.item_id and not self.item.is_stock_tracked:
            raise ValidationError(
                {'item': f"{self.item.name} holds no stock, so it cannot be "
                         f"deducted when a sample is collected."})
        if self.quantity_per_collection is not None and self.quantity_per_collection < 1:
            raise ValidationError(
                {'quantity_per_collection': "A collection uses at least one of these."})

    def __str__(self):
        return f"{self.specimen.name} needs {self.quantity_per_collection} x {self.item.name}"


class TestPanelReagent(models.Model):
    """
    Links test panels to the reagents they consume.
    Example: Albumin test uses Reagent A and Reagent C

    Reagents only. Syringes and tubes are tied to the specimen the sample is
    drawn into, not to the panel run off it -- see SpecimenConsumable.
    """
    test_panel = models.ForeignKey('LabTestPanel', on_delete=models.CASCADE, related_name='reagent_links')
    reagent_item = models.ForeignKey('inventory.Item', on_delete=models.CASCADE, limit_choices_to={'category': 'LabReagent'})
    units_consumed_per_run = models.PositiveIntegerField(default=1, help_text="Base inventory units consumed from this reagent per test run")
    
    class Meta:
        unique_together = ('test_panel', 'reagent_item')
        verbose_name = "Test Panel Reagent"
        verbose_name_plural = "Test Panel Reagents"
    
    def __str__(self):
        return f"{self.test_panel.name} uses {self.reagent_item.name}"


class LabTestPanel(models.Model):
    name = models.CharField(max_length=255)
    specimen = models.ForeignKey(Specimen, on_delete=models.CASCADE, null=True, blank=True)
    test_profile = models.ForeignKey(LabTestProfile, on_delete=models.CASCADE)
    units = models.ForeignKey('inventory.Unit', on_delete=models.SET_NULL, null=True, blank=True, related_name='lab_test_panels')
    # The catalogue entry an invoice line points at. One panel, one item: the
    # panel's sale price is stored against it, so two panels sharing one would
    # mean pricing a Urea silently repriced a Creatinine -- and billing raises
    # a line per panel, so they would also charge the patient twice for it.
    item = models.OneToOneField(
        'inventory.Item', on_delete=models.CASCADE, related_name='lab_test_panel')
    is_qualitative = models.BooleanField(default=False)
    is_quantitative = models.BooleanField(default=True)
    # turn around time
    tat = models.DurationField(null=True, blank=True)

    def clean(self):
        if self.item and self.item.category != 'Lab Test':
            raise ValidationError(
                {"item": "Panel billing item must have category 'Lab Test'."}
            )

    @property
    def sale_price(self):
        """
        What the patient pays for this test.

        The panel is the lab's finished product -- the thing assembled out of a
        reagent, a syringe and a tube -- so this is the only place in the lab a
        price is set. It is stored against the panel's billing item, because
        that is what an invoice line points at and what keeps historic
        invoices at the price they were raised at.
        """
        return self.item.current_sale_price if self.item_id else None

    def set_sale_price(self, price, created_by=None):
        """Open a new cash price for this panel, effective today."""
        from inventory.services import stock as stock_service

        if not self.item_id:
            raise ValidationError(
                {"item": "A panel needs a billing item before it can be priced."})
        return stock_service.set_sale_price(self.item, price, created_by=created_by)

    def collection_requirements(self):
        """
        The consumables a draw for this panel uses, via its specimen.

        Read-only here: the panel does not own them, and two panels off one
        blood sample do not mean two syringes.
        """
        return self.specimen.collection_requirements() if self.specimen_id else []

    def can_run(self, runs=1):
        """
        Can this panel actually be run `runs` times right now?

        Returns (ok, message). Availability comes from the ledger and excludes
        expired lots and stock already reserved for other work, so this answers
        "can we do this today", not "does the catalogue list it".

        A panel with no reagents configured can always run: plenty of tests are
        read off a machine or a slide and consume nothing trackable. Absence of
        reagents is a real answer, not an unfinished setup.
        """
        from inventory.services import stock as stock_service

        from .utils import lab_department

        runs = max(runs or 1, 1)
        department = lab_department()
        for link in self.reagent_links.select_related('reagent_item'):
            needed = link.units_consumed_per_run * runs
            available = stock_service.available_quantity(link.reagent_item, department)
            if available < needed:
                return False, (
                    f"Insufficient stock for {link.reagent_item.name} "
                    f"(need {needed}, have {available})"
                )
        return True, "OK"

    def available_runs(self):
        """
        How many times this test panel can run with current stock.
        Bottlenecked by the reagent with least stock relative to consumption.
        """
        from inventory.services import stock as stock_service

        from .utils import lab_department

        links = list(self.reagent_links.select_related('reagent_item'))
        if not links:
            return 0

        department = lab_department()
        min_runs = float('inf')
        for link in links:
            available = stock_service.available_quantity(link.reagent_item, department)
            if link.units_consumed_per_run > 0:
                runs = available // link.units_consumed_per_run
            else:
                runs = float('inf')
            min_runs = min(min_runs, runs)

        return min_runs if min_runs != float('inf') else 0

    def __str__(self):
        unit_symbol = self.units.symbol if self.units else ''
        return f"{self.name} {unit_symbol} - {self.test_profile.name}"


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
    critical_low = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    critical_high = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"{self.lab_test_panel.name} - {self.sex} - {self.age_min}-{self.age_max}: {self.ref_value_low} - {self.ref_value_high}"


class LabTestInterpretation(models.Model):
    '''
    Store static interpretation for a lab test profile.
    This allows an interpretation to be displayed on all test panels within that profile.
    '''
    test_profile = models.ForeignKey(
        LabTestProfile, 
        on_delete=models.CASCADE, 
        related_name="interpretations",
        null=True,
        blank=True
    )
    
    # The interpretation text
    interpretation = models.TextField(
        help_text="Clinical interpretation for this test profile"
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
        ordering = ['test_profile']
        verbose_name = "Lab Test Interpretation"
        verbose_name_plural = "Lab Test Interpretations"

    def __str__(self):
        return f"{self.test_profile.name} Interpretation"


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
    collected_on = models.DateTimeField(null=True, blank=True)

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

        if self.is_sample_collected and not self.collected_on:
            self.collected_on = timezone.now()

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


class PatientSampleConsumable(models.Model):
    """
    What was actually used up taking one sample.

    Written when the sample is marked collected, from the specimen's
    requirements at that moment, so a later edit to the specimen never
    rewrites what the phlebotomist already spent. This is the row the
    collection screen shows back, and a retest produces none of them because a
    retest collects nothing.
    """
    patient_sample = models.ForeignKey(
        PatientSample, on_delete=models.CASCADE, related_name='consumables_used')
    item = models.ForeignKey(
        'inventory.Item', on_delete=models.PROTECT, related_name='sample_collection_uses')
    quantity = models.PositiveIntegerField(help_text="Base units actually issued")
    quantity_required = models.PositiveIntegerField(
        default=0,
        help_text="What the specimen called for, which a short shelf may not have covered")
    stock_movement_reference = models.UUIDField(
        null=True, blank=True,
        help_text="Groups the StockMovement rows this collection produced")
    recorded_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('patient_sample', 'item')
        ordering = ['item']
        verbose_name = "Patient Sample Consumable"
        verbose_name_plural = "Patient Sample Consumables"

    @property
    def is_short(self):
        return self.quantity < self.quantity_required

    def __str__(self):
        return (f"{self.patient_sample.patient_sample_code}: "
                f"{self.quantity} x {self.item.name}")


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
        Auto-generate interpretation based on the test profile's static interpretation.
        Returns a tuple of (interpretation_text, clinical_action, requires_attention)
        """
        if not self.test_panel or not self.test_panel.test_profile:
            return None, None, False
        
        try:
            # Get the interpretation for this profile
            interp = self.test_panel.test_profile.interpretations.first()
            if interp:
                return (
                    interp.interpretation,
                    interp.clinical_action,
                    interp.requires_immediate_attention
                )
            return None, None, False
        except Exception as e:
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
            self.approved_on = timezone.now()
        elif self.result_approved and not self.approved_on:
            # Also set if result_approved is set but approved_on wasn't set
            self.approved_on = timezone.now()
            
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

class LabSettings(models.Model):
    """
    Global settings for the laboratory module.
    Implemented as a singleton.
    """
    default_tat_minutes = models.PositiveIntegerField(
        default=60, 
        help_text="Global default Turnaround Time in minutes if not specified per test panel"
    )
    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Lab Settings"
        verbose_name_plural = "Lab Settings"

    def __str__(self):
        return f"Lab Settings (Default TAT: {self.default_tat_minutes} mins)"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and LabSettings.objects.exists():
            return LabSettings.objects.first()
        return super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        settings, created = cls.objects.get_or_create(pk=1)
        return settings


class Archive(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class ArchiveComponent(models.Model):
    archive = models.ForeignKey(Archive, on_delete=models.CASCADE, related_name='components')
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.archive.name} - {self.name}"

class ArchiveSection(models.Model):
    component = models.ForeignKey(ArchiveComponent, on_delete=models.CASCADE, related_name='sections')
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.component.name} - {self.name}"

class ArchiveRack(models.Model):
    section = models.ForeignKey(ArchiveSection, on_delete=models.CASCADE, related_name='racks')
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.section.name} - {self.name}"

class ArchivePosition(models.Model):
    rack = models.ForeignKey(ArchiveRack, on_delete=models.CASCADE, related_name='positions', null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.rack.name} - {self.name}"

class PatientSampleArchive(models.Model):
    ACTION_CHOICES = (
        ('dispose', 'Dispose'),
        ('retest', 'Retest'),
        ('released', 'Released'),
    )

    patient_sample = models.OneToOneField(PatientSample, on_delete=models.CASCADE, related_name='archive_record')
    position = models.OneToOneField(ArchivePosition, on_delete=models.CASCADE, related_name='sample_archive')
    archiving_date = models.DateField(auto_now_add=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, null=True, blank=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.patient_sample.patient_sample_code} at {self.position.name}"


class DisposedSample(models.Model):
    """Records samples that have been disposed from the archive."""
    patient_sample_code = models.CharField(max_length=255)
    position_name = models.CharField(max_length=255)
    archiving_date = models.DateField()
    disposed_on = models.DateField(auto_now_add=True)
    disposed_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.patient_sample_code} - Disposed on {self.disposed_on}"


class RetestSample(models.Model):
    """Records samples that have been sent for retesting from the archive."""
    patient_sample_code = models.CharField(max_length=255)
    position_name = models.CharField(max_length=255)
    archiving_date = models.DateField()
    retested_on = models.DateField(auto_now_add=True)
    retested_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='retest_samples')

    def __str__(self):
        return f"{self.patient_sample_code} - Retested on {self.retested_on}"


class ReleasedSample(models.Model):
    """Records samples that have been released to an external facility."""
    patient_sample = models.OneToOneField(
        PatientSample, on_delete=models.CASCADE, related_name='release_record'
    )
    patient_sample_code = models.CharField(max_length=255)
    facility_name = models.CharField(max_length=255)
    receiving_lab_tech = models.CharField(max_length=255)
    reason = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    released_on = models.DateTimeField(auto_now_add=True)
    released_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='released_samples'
    )

    def __str__(self):
        return f"{self.patient_sample_code} - Released to {self.facility_name}"
