import logging
from django.db import models
from django.db.models import Q, Sum
from random import randrange, choices
from django.conf import settings
from datetime import datetime
from django.utils import timezone
from django.db import transaction, IntegrityError
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError

from customuser.models import CustomUser
from .rich_text import without_images


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
    # What the analyzer calls itself in its messages (HL7 MSH-3, ASTM H-5).
    # The LIS server passes it along with every result so results can be told
    # apart by machine; the Analyzer Inbox shows it for messages it could not
    # place, so it can be copied here.
    sender_id = models.CharField(max_length=100, blank=True, default='')
    is_active = models.BooleanField(default=True)

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
    """
    A named group of tests. Profiles nest: URINALYSIS REPORT is what a doctor
    requests, and Macroscopy, Microscopy and Biochemistry are the sub profiles
    its panels are reported under.

    `sort_order` is what puts sub profiles in order under their parent on the
    report, and `item` is what lets the profile itself be charged for when its
    panels are never sold alone.
    """
    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        'self', on_delete=models.PROTECT, null=True, blank=True, related_name='sub_profiles',
        help_text="The main profile this one is reported under. Empty for a main profile.")
    sort_order = models.PositiveIntegerField(
        default=0, help_text="Lower numbers print first among profiles at the same level")
    item = models.OneToOneField(
        'inventory.Item', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='lab_test_profile',
        help_text="The invoice line raised when this profile is requested. Empty when only its panels are charged.")
    # A CBC or a urinalysis is run whole, so it is ordered whole. A catch-all
    # such as Microbiology is a menu of separate tests and is left unlocked.
    # This decides what can be ordered, not how it is priced.
    orders_as_whole = models.BooleanField(
        default=False,
        help_text="Every panel under this profile, sub profiles included, is ordered "
                  "whenever it is requested; none can be left off.")

    def __str__(self):
        return self.name

    def locked_by(self):
        """The outermost profile in this one's lineage that is ordered whole, or None."""
        return next((profile for profile in self.lineage() if profile.orders_as_whole), None)

    def lineage(self):
        """This profile's chain of parents, outermost first, ending with itself."""
        chain, seen, node = [], set(), self
        while node is not None and node.pk not in seen:
            seen.add(node.pk)
            chain.insert(0, node)
            node = node.parent
        return chain

    @property
    def full_name(self):
        return " > ".join(profile.name for profile in self.lineage())

    def display_key(self):
        """Sorts profiles into report order: a parent, then its sub profiles in turn."""
        return tuple((profile.sort_order, profile.name.lower(), profile.pk) for profile in self.lineage())

    def with_descendants(self):
        """This profile and everything nested under it."""
        found, queue = {}, [self]
        while queue:
            node = queue.pop()
            if node.pk not in found:
                found[node.pk] = node
                queue.extend(node.sub_profiles.all())
        return list(found.values())

    def panels_in_report_order(self):
        """Every panel under this profile, in the order the report prints them."""
        panels = LabTestPanel.objects.filter(
            test_profile__in=[profile.pk for profile in self.with_descendants()],
        ).select_related(
            'item', 'specimen', 'units', 'test_profile__parent__parent',
        ).prefetch_related(
            'reagent_links__reagent_item', 'specimen__consumables__item')
        return sorted(panels, key=LabTestPanel.display_key)

    @property
    def sale_price(self):
        """What requesting this profile costs on top of its panels' own prices."""
        return self.item.current_sale_price if self.item_id else None

    def set_sale_price(self, price, created_by=None):
        from inventory.services import stock as stock_service

        return stock_service.set_sale_price(self.item, price, created_by=created_by)

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
    test_profile = models.ForeignKey(LabTestProfile, on_delete=models.PROTECT)
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
    sort_order = models.PositiveIntegerField(
        default=0, help_text="Lower numbers print first among the panels of a profile")
    # Blocks with no heading of their own, as an analyzer lays out a CBC. Use a
    # sub profile instead when the block needs a name on the report.
    report_group = models.PositiveSmallIntegerField(
        default=0, help_text="Panels sharing a number print together, with a gap before the next number")

    @property
    def report_block(self):
        """The block it prints in. Under a sub profile the heading is the grouping,
        so Report Order alone decides and a report_group left over has no say."""
        return 0 if self.test_profile.parent_id else self.report_group

    def display_key(self):
        """Sorts panels into report order, profile first."""
        return (self.test_profile.display_key(), self.report_block, self.sort_order, self.name.lower(), self.pk)

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

    def reference_range_for(self, patient):
        """
        The ReferenceValue that applies to this patient, or None.

        A blank age means no limit on that side, so a range with both blank
        covers every age. A patient whose age is unknown only matches those.
        When several match, the patient's own sex wins over the fallback, then
        the range with the most specific ages.
        """
        ranges = self.reference_values.all()
        age = patient.age
        if age is None:
            ranges = ranges.filter(age_min__isnull=True, age_max__isnull=True)
        else:
            ranges = ranges.filter(
                Q(age_min__isnull=True) | Q(age_min__lte=age),
                Q(age_max__isnull=True) | Q(age_max__gte=age))

        # Anyone not recorded as M or F falls back to the male ranges when no
        # range of their own matches.
        sexes = [patient.gender] if patient.gender in ('M', 'F') else [patient.gender, 'M']
        return min(
            ranges.filter(sex__in=sexes),
            key=lambda row: (
                row.sex != patient.gender,
                (row.age_min is None) + (row.age_max is None),
                row.pk),
            default=None)

    def get_reference_values(self, patient):
        """The patient's range in the shape the API returns it."""
        reference_value = self.reference_range_for(patient)
        if reference_value is None:
            return None
        return {
            "low": reference_value.ref_value_low,
            "high": reference_value.ref_value_high,
            "critical_low": reference_value.critical_low,
            "critical_high": reference_value.critical_high,
        }

    def missing_setup(self):
        """
        What this panel lacks to print a unit and a flag on the report.
        A qualitative result has neither, so it lacks nothing.
        """
        if self.is_qualitative:
            return []
        missing = []
        if not self.units_id:
            missing.append('unit')
        if not self.reference_values.all():
            missing.append('reference range')
        return missing

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


class SampleConsignment(models.Model):
    """
    A delivery of samples from another facility: one cool box, one request
    form, any number of patients. Each patient in it becomes a lab visit of
    their own, billed to the sending facility's account.
    """
    reference = models.CharField(max_length=30, unique=True, editable=False)
    facility = models.ForeignKey(
        'company.InsuranceCompany', on_delete=models.PROTECT, related_name='consignments',
        help_text="The referring facility's credit account.")
    received_at = models.DateTimeField(default=timezone.now)
    received_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    courier = models.CharField(max_length=150, blank=True, default='')
    request_form = models.FileField(
        upload_to="Lab Test Requests/referred", max_length=254, null=True, blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'png', 'jpg', 'jpeg'])])
    note = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-received_at']

    def save(self, *args, **kwargs):
        if not self.reference:
            day = timezone.localtime(self.received_at or timezone.now())
            prefix = f"RS-{day:%y%m%d}-"
            count = SampleConsignment.objects.filter(reference__startswith=prefix).count()
            self.reference = f"{prefix}{count + 1:03d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference} from {self.facility}"


class LabTestRequest(models.Model):
    process = models.ForeignKey(ProcessTestRequest, on_delete=models.CASCADE, null=True, blank=True, related_name="attendace_test_requests") # from patient app
    test_profile = models.ForeignKey(LabTestProfile, on_delete=models.CASCADE, null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    requested_by = models.ForeignKey(CustomUser, on_delete=models.PROTECT, null=True, blank=True)
    # Who ordered the test when it was not one of our own doctors: a walk-in
    # carrying a referral from a clinician elsewhere. Printed on the report.
    referring_doctor = models.CharField(max_length=150, null=True, blank=True)
    referring_facility = models.CharField(max_length=150, null=True, blank=True)
    # A sample sent in by another facility: the delivery it came in, and the
    # sender's own number for the patient or request, printed on the report.
    consignment = models.ForeignKey(
        SampleConsignment, on_delete=models.SET_NULL, null=True, blank=True, related_name='requests')
    external_reference = models.CharField(max_length=60, blank=True, default='')
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

    # A sample another facility drew and sent in. Its draw kit was theirs, so
    # none of ours is deducted; and it arrives in some condition, which may
    # mean it can't be run.
    class Condition(models.TextChoices):
        ACCEPTABLE = 'acceptable', 'Acceptable'
        HAEMOLYSED = 'haemolysed', 'Haemolysed'
        CLOTTED = 'clotted', 'Clotted'
        LIPAEMIC = 'lipaemic', 'Lipaemic'
        INSUFFICIENT = 'insufficient', 'Insufficient volume'
        LEAKED = 'leaked', 'Leaked or broken'
        UNLABELLED = 'unlabelled', 'Unlabelled or mislabelled'
        WRONG_CONTAINER = 'wrong_container', 'Wrong container'
        DELAYED = 'delayed', 'Delayed in transit'

    collected_externally = models.BooleanField(default=False)
    collected_by = models.CharField(max_length=150, blank=True, default='')
    received_on = models.DateTimeField(null=True, blank=True)
    condition = models.CharField(
        max_length=20, choices=Condition.choices, blank=True, default='')
    rejected = models.BooleanField(default=False)
    rejection_reason = models.CharField(max_length=255, blank=True, default='')

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
    test_panel = models.ForeignKey(LabTestPanel, on_delete=models.PROTECT)
    lab_test_request = models.ForeignKey(LabTestRequest, on_delete=models.CASCADE)
    test_code = models.CharField(max_length=100, null=True)
    category = models.CharField(max_length=30, default="none")
    result_approved=models.BooleanField(default=False)
    approved_on = models.DateTimeField(null=True, blank=True) 
    # Who signed the result off; their name and registration number print on
    # the report.
    approved_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_results')
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
        return f"{patient.display_name}, Age: {patient.age}, Sex: {patient.gender}"
    
    def generate_interpretation(self):
        """
        Auto-generate interpretation based on the test profile's static interpretation.
        Returns a tuple of (interpretation_text, clinical_action, requires_attention)
        """
        if not self.test_panel or not self.test_panel.test_profile:
            return None, None, False
        
        try:
            # The panel's own profile speaks first, then whichever main profile
            # it is reported under.
            for profile in reversed(self.test_panel.test_profile.lineage()):
                interp = profile.interpretations.first()
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
                # A copy on every result of the profile, returned with each of them,
                # so a CBC would carry its images twenty times over. The report
                # prints them from the profile's own interpretation.
                self.auto_interpretation = without_images(interpretation)
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


class AnalyzerTestMapping(models.Model):
    """
    Which test panel an analyzer's result code is the result for.

    Matching by panel name breaks the day someone renames a panel, and cannot
    tell two panels of the same name apart; a mapping points at the panel
    itself. Codes the analyzer sends that nobody wants imported (histograms,
    scale markers, parameters the lab does not report) are mapped to no
    panel, which files them as ignored instead of leaving them in the inbox.
    """
    equipment = models.ForeignKey(
        LabEquipment, on_delete=models.CASCADE, related_name='test_mappings')
    analyzer_code = models.CharField(max_length=50)
    test_panel = models.ForeignKey(
        LabTestPanel, on_delete=models.CASCADE, null=True, blank=True,
        related_name='analyzer_mappings')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['analyzer_code']
        constraints = [
            models.UniqueConstraint(
                fields=['equipment', 'analyzer_code'], name='unique_analyzer_code_per_equipment'),
        ]

    def save(self, *args, **kwargs):
        self.analyzer_code = self.analyzer_code.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        target = self.test_panel.name if self.test_panel else 'ignored'
        return f"{self.equipment.name}: {self.analyzer_code} -> {target}"


class AnalyzerMessage(models.Model):
    """
    One message from an analyzer, kept as received.

    Stored before anything is matched, so a result is never lost because its
    sample was not registered yet or its code was not mapped: it waits in the
    Analyzer Inbox until someone sorts it out.
    """
    equipment = models.ForeignKey(
        LabEquipment, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='messages')
    sender = models.CharField(max_length=100, blank=True, default='')
    # The sample code as the analyzer sent it; corrected in place when a
    # technician assigns the results to the right sample.
    sample_code = models.CharField(max_length=100, blank=True, default='', db_index=True)
    patient_name = models.CharField(max_length=255, blank=True, default='')
    raw_message = models.TextField(blank=True, default='')
    received_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return f"{self.sender or 'Unknown analyzer'} / {self.sample_code or 'no sample'} @ {self.received_at}"


class AnalyzerResult(models.Model):
    """One result from an analyzer message and what became of it."""

    class Status(models.TextChoices):
        POSTED = 'posted', 'Posted'
        NO_SAMPLE = 'no_sample', 'No sample code'
        SAMPLE_NOT_FOUND = 'sample_not_found', 'Sample not found'
        UNMAPPED = 'unmapped', 'Code not mapped'
        NOT_REQUESTED = 'not_requested', 'Test not requested'
        ALREADY_APPROVED = 'already_approved', 'Result already approved'
        INVALID = 'invalid', 'Invalid value'
        IGNORED = 'ignored', 'Ignored'

    # Statuses that are finished with; everything else waits in the inbox.
    CLOSED_STATUSES = (Status.POSTED, Status.IGNORED)

    message = models.ForeignKey(
        AnalyzerMessage, on_delete=models.CASCADE, related_name='results')
    analyzer_code = models.CharField(max_length=50)
    value = models.CharField(max_length=255, blank=True, default='')
    unit = models.CharField(max_length=50, blank=True, default='')
    flag = models.CharField(max_length=20, blank=True, default='')
    reference_range = models.CharField(max_length=50, blank=True, default='')
    status = models.CharField(max_length=20, choices=Status.choices, db_index=True)
    detail = models.CharField(max_length=255, blank=True, default='')
    lab_test_request_panel = models.ForeignKey(
        LabTestRequestPanel, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='analyzer_results')
    updated_at = models.DateTimeField(auto_now=True)
    resolved_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='resolved_analyzer_results')

    class Meta:
        ordering = ['-message__received_at', 'id']

    @property
    def is_open(self):
        return self.status not in self.CLOSED_STATUSES

    def __str__(self):
        return f"{self.analyzer_code}={self.value} ({self.status})"
