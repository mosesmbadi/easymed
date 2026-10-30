import pdb
from random import randrange, choices

from django.db import transaction

from inventory.models import Item
from rest_framework import serializers
from rest_framework.exceptions import NotFound

from customuser.models import CustomUser
from inventory.services import stock as stock_service
from .models import (
    LabReagent,
    LabTestRequest,
    LabTestProfile,
    LabEquipment,
    PublicLabTestRequest,
    LabTestPanel,
    LabTestRequestPanel,
    ProcessTestRequest,
    PatientSample,
    Specimen,
    SpecimenConsumable,
    PatientSampleConsumable,
    TestPanelReagent,
    LabTestInterpretation,
    ReferenceValue,
    ReagentConsumptionLog,
    LabSettings,
    Archive,
    ArchiveComponent,
    ArchiveSection,
    ArchiveRack,
    ArchivePosition,
    PatientSampleArchive,
    DisposedSample,
    RetestSample,
    ReleasedSample
    )


class ReagentStockSerializer(serializers.Serializer):
    """
    Reagent availability derived from the stock ledger.

    Replaces the old TestKitCounter table: the number is computed from
    StockMovement rather than maintained as a second copy of the same quantity.
    """
    id = serializers.IntegerField(read_only=True)
    reagent_item = serializers.IntegerField(read_only=True)
    reagent_name = serializers.CharField(read_only=True)
    reagent_code = serializers.CharField(read_only=True)
    available_tests = serializers.IntegerField(read_only=True)
    available_stock = serializers.IntegerField(read_only=True)
    minimum_threshold = serializers.IntegerField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)
    stock_status = serializers.CharField(read_only=True)
    stock_percentage = serializers.FloatField(read_only=True)


# Historical names kept so existing imports and routes keep working.
TestKitCounterSerializer = ReagentStockSerializer
LowStockReagentSerializer = ReagentStockSerializer


class LabReagentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabReagent
        fields = '__all__'


class LabTestProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTestProfile
        fields = '__all__'


class PublicLabTestRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicLabTestRequest
        fields = '__all__'

class LabEquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabEquipment
        fields = '__all__'

class LabTestProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTestProfile
        fields = '__all__'        


class LabTestRequestPanelSerializer(serializers.ModelSerializer):
    test_panel_name = serializers.ReadOnlyField(source='test_panel.name')
    item = serializers.CharField(source='test_panel.item.id', read_only=True)
    sale_price = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    patient_age = serializers.SerializerMethodField()
    patient_sex = serializers.SerializerMethodField()
    reference_values = serializers.SerializerMethodField()
    is_qualitative = serializers.ReadOnlyField(source='test_panel.is_qualitative')
    is_quantitative = serializers.ReadOnlyField(source='test_panel.is_quantitative')
    tat = serializers.DurationField(source='test_panel.tat', read_only=True)

    def get_sale_price(self, instance):
        item = instance.test_panel.item if instance.test_panel else None
        return item.current_sale_price if item else None
        
    def get_patient_name(self, instance):
        if instance.patient_sample and instance.patient_sample.process:
            patient = instance.patient_sample.process.attendanceprocess.patient
            return f"{patient.first_name} {patient.second_name}" if patient else None
        return None

    def get_patient_age(self, instance):
        if instance.patient_sample and instance.patient_sample.process:
            patient = instance.patient_sample.process.attendanceprocess.patient
            return patient.age if patient else None
        return None

    def get_patient_sex(self, instance):
        if instance.patient_sample and instance.patient_sample.process:
            patient = instance.patient_sample.process.attendanceprocess.patient
            return patient.gender if patient else None
        return None
    
    def get_reference_values(self, instance):
        patient = self._get_patient(instance)
        if not patient:
            return None

        reference_value = instance.test_panel.reference_values.filter(
            sex=patient.gender,
            age_min__lte=patient.age,
            age_max__gte=patient.age
        ).first()
        
        # If no exact match for gender (e.g., gender 'O'), try male reference values as fallback
        if not reference_value and patient.gender not in ['M', 'F']:
            reference_value = instance.test_panel.reference_values.filter(
                sex='M',
                age_min__lte=patient.age,
                age_max__gte=patient.age
            ).first()

        if reference_value:
            return {
                "low": reference_value.ref_value_low,
                "high": reference_value.ref_value_high,
                "critical_low": reference_value.critical_low,
                "critical_high": reference_value.critical_high,
            }
        return None
    
    def _get_patient(self, instance):
        # Helper method to get the patient object
        if instance.patient_sample and instance.patient_sample.process:
            return instance.patient_sample.process.attendanceprocess.patient
        return None
    
    class Meta:
        model = LabTestRequestPanel
        fields = [
            'id',
            'result',
            'result_approved',
            'test_panel',
            'test_panel_name', 
            'item', 
            'sale_price', 
            'patient_name', 
            'patient_age', 
            'patient_sex',
            'reference_values',
            'lab_test_request',
            'is_billed',
            'is_quantitative',
            'is_qualitative',
            'tat',
            'auto_interpretation',
            'clinical_action',
            'requires_attention',
        ]


class LabTestRequestSerializer(serializers.ModelSerializer):
    patient_first_name = serializers.ReadOnlyField(source='patient.first_name')
    patient_last_name = serializers.ReadOnlyField(source='patient.second_name')
    test_profile_name = serializers.ReadOnlyField(source='test_profile.name')
    requested_by_name = serializers.ReadOnlyField(source='requested_by.get_fullname')
    category = serializers.CharField(source='test_profile.category', read_only=True)
    

    class Meta:
        model = LabTestRequest
        fields = "__all__"


class ProcessTestRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessTestRequest
        fields = '__all__'


class PatientSampleSerializer(serializers.ModelSerializer):
    specimen_name = serializers.SerializerMethodField()
    is_archived = serializers.SerializerMethodField()
    is_disposed = serializers.SerializerMethodField()
    is_retested = serializers.SerializerMethodField()
    is_released = serializers.SerializerMethodField()
    consumables = serializers.SerializerMethodField()
    consumables_used = serializers.SerializerMethodField()

    class Meta:
        model = PatientSample
        fields = [
            'id',
            'patient_sample_code',
            'is_sample_collected',
            'specimen',
            'specimen_name',
            'lab_test_request',
            'process',
            'is_archived',
            'is_disposed',
            'is_retested',
            'is_released',
            'collected_on',
            'consumables',
            'consumables_used',
        ]
        read_only_fields = [
            'patient_sample_code',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Shared across every sample this serializer renders, so a list of
        # blood samples looks up the syringe's stock once, not once per row.
        self._availability_cache = {}

    def get_specimen_name(self, obj):
        return obj.specimen.name

    def get_consumables(self, obj):
        """
        What the phlebotomist needs in hand to take this sample, and whether
        the lab actually has it.

        Read off the specimen, which is where the syringe and the tube are
        declared, so the screen lists exactly what confirming the collection
        will take out of stock.
        """
        return sample_consumable_rows(obj, self._availability_cache)

    def get_consumables_used(self, obj):
        """
        What the collection actually spent.

        Empty until the sample is collected, and empty forever on a retest,
        which reuses a sample somebody already drew.
        """
        return PatientSampleConsumableSerializer(
            obj.consumables_used.select_related('item'), many=True).data

    def get_is_archived(self, obj):
        return hasattr(obj, 'archive_record')

    def get_is_disposed(self, obj):
        from .models import DisposedSample
        return DisposedSample.objects.filter(patient_sample_code=obj.patient_sample_code).exists()

    def get_is_retested(self, obj):
        from .models import RetestSample
        return RetestSample.objects.filter(patient_sample_code=obj.patient_sample_code).exists()

    def get_is_released(self, obj):
        return hasattr(obj, 'release_record')


class SpecimenConsumableSerializer(serializers.ModelSerializer):
    """One line of what a draw for this specimen uses up."""
    item_name = serializers.ReadOnlyField(source='item.name')
    item_code = serializers.ReadOnlyField(source='item.item_code')
    units_of_measure = serializers.ReadOnlyField(source='item.units_of_measure')
    available_quantity = serializers.SerializerMethodField()

    class Meta:
        model = SpecimenConsumable
        fields = [
            'id',
            'specimen',
            'item',
            'item_name',
            'item_code',
            'units_of_measure',
            'quantity_per_collection',
            'is_required',
            'available_quantity',
        ]

    def get_available_quantity(self, obj):
        return _available_quantity(obj.item)

    def validate_item(self, value):
        # limit_choices_to only constrains forms, so the API has to check too.
        if value.category_one != 'Internal':
            raise serializers.ValidationError(
                f"'{value.name}' is a {value.category_one} item. Only internal "
                f"consumables -- syringes, tubes, gloves -- are used up collecting a sample."
            )
        if not value.is_stock_tracked:
            raise serializers.ValidationError(
                f"'{value.name}' holds no stock, so it cannot be deducted on collection.")
        return value

    def validate_quantity_per_collection(self, value):
        if value < 1:
            raise serializers.ValidationError("A collection uses at least one of these.")
        return value


class SpecimenSerializer(serializers.ModelSerializer):
    '''
    A specimen and the raw materials taking one costs.

    Declared here rather than on the test, because the syringe belongs to the
    draw: three panels off one blood sample still only use one.
    '''
    consumables = SpecimenConsumableSerializer(many=True, read_only=True)
    consumable_items = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False,
        help_text="Items required to collect this specimen: [{item: <id>, "
                  "quantity_per_collection: 1, is_required: true}]. Send [] to clear them.")

    class Meta:
        model = Specimen
        fields = ['id', 'name', 'max_archive_duration', 'consumables', 'consumable_items']

    def validate_consumable_items(self, rows):
        '''
        Normalise the posted rows to {item_id: defaults} and reject anything
        unusable here, so a bad payload is a 400 rather than an exception
        halfway through the save.
        '''
        wanted = {}
        for row in rows:
            item_id = row.get('item') or row.get('item_id') or row.get('id')
            if item_id in (None, ''):
                raise serializers.ValidationError("Each line needs an 'item' id.")
            try:
                item_id = int(item_id)
                quantity = int(row.get('quantity_per_collection') or 1)
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    "'item' and 'quantity_per_collection' must be whole numbers.")
            if quantity < 1:
                raise serializers.ValidationError("A collection uses at least one of these.")
            wanted[item_id] = {
                'quantity_per_collection': quantity,
                'is_required': bool(row.get('is_required', True)),
            }

        known = Item.objects.in_bulk(list(wanted))
        missing = set(wanted) - set(known)
        if missing:
            raise serializers.ValidationError(f"Unknown item id(s): {sorted(missing)}")
        for item in known.values():
            if item.category_one != 'Internal' or not item.is_stock_tracked:
                raise serializers.ValidationError(
                    f"{item.name} is not an internal consumable held in stock, so it "
                    f"cannot be used up collecting a sample.")
        return wanted

    def create(self, validated_data):
        wanted = validated_data.pop('consumable_items', None)
        specimen = super().create(validated_data)
        if wanted is not None:
            self._set_consumables(specimen, wanted)
        return specimen

    def update(self, instance, validated_data):
        wanted = validated_data.pop('consumable_items', None)
        specimen = super().update(instance, validated_data)
        if wanted is not None:
            self._set_consumables(specimen, wanted)
        return specimen

    @staticmethod
    def _set_consumables(specimen, wanted):
        '''Replace the list with exactly what was posted, so a dropped row drops.'''
        specimen.consumables.exclude(item_id__in=list(wanted)).delete()
        for item_id, defaults in wanted.items():
            SpecimenConsumable.objects.update_or_create(
                specimen=specimen, item_id=item_id, defaults=defaults)


def _available_quantity(item):
    from .utils import lab_department

    return stock_service.available_quantity(item, lab_department())


class TestPanelReagentSerializer(serializers.ModelSerializer):
    test_panel_name = serializers.ReadOnlyField(source='test_panel.name')
    reagent_name = serializers.ReadOnlyField(source='reagent_item.name')
    reagent_code = serializers.ReadOnlyField(source='reagent_item.item_code')
    available_quantity = serializers.SerializerMethodField()

    class Meta:
        model = TestPanelReagent
        fields = [
            'id',
            'test_panel',
            'test_panel_name',
            'reagent_item',
            'reagent_name',
            'reagent_code',
            'units_consumed_per_run',
            'available_quantity',
        ]

    def get_available_quantity(self, obj):
        return _available_quantity(obj.reagent_item)

    def validate_reagent_item(self, value):
        # limit_choices_to only constrains forms, so the API has to check too.
        if value.category != 'LabReagent':
            raise serializers.ValidationError(
                f"'{value.name}' is a {value.category} item, not a Lab Reagent."
            )
        return value


class LabTestPanelSerializer(serializers.ModelSerializer):
    '''
    The lab's finished product: what the test needs, and what it sells for.

    A panel is assembled from raw materials that are individually worthless to
    a patient -- a reagent, and the syringe its specimen is drawn with -- so
    this is where the reagents are declared and the only place in the lab a
    sale price is set.
    '''
    reference_values = serializers.SerializerMethodField()
    available_runs = serializers.SerializerMethodField()
    item_name = serializers.ReadOnlyField(source='item.name')
    test_profile_name = serializers.ReadOnlyField(source='test_profile.name')
    specimen_name = serializers.ReadOnlyField(source='specimen.name')
    unit_symbol = serializers.ReadOnlyField(source='units.symbol')
    sale_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True,
        help_text="What the patient pays for this test. Opens a new effective-dated "
                  "price on the panel's billing item.")
    reagents = TestPanelReagentSerializer(
        source='reagent_links', many=True, read_only=True)
    reagent_items = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False,
        help_text="Reagents consumed per run: [{reagent_item: <item id>, "
                  "units_consumed_per_run: 1}]. Send [] to clear them.")
    collection_consumables = serializers.SerializerMethodField()

    class Meta:
        model = LabTestPanel
        fields = "__all__"
        # Left out, the panel gets a billing item made from its name.
        extra_kwargs = {'item': {'required': False}}

    def get_reference_values(self, obj):
        patient = self.context.get('patient')
        if patient:
            return obj.get_reference_values(patient)
        return None

    def get_available_runs(self, obj):
        return obj.available_runs()

    def get_collection_consumables(self, obj):
        '''
        The syringe and tube this panel's specimen is drawn with, shown so the
        person pricing the test can see the whole cost. Read-only: they belong
        to the specimen, and a second panel off the same draw adds none.
        '''
        if not obj.specimen_id:
            return []
        return SpecimenConsumableSerializer(
            obj.specimen.consumables.select_related('item'), many=True).data

    def validate_reagent_items(self, rows):
        '''Normalise to {item_id: defaults}, rejecting anything that is not a reagent.'''
        wanted = {}
        for row in rows:
            item_id = row.get('reagent_item') or row.get('item') or row.get('id')
            if item_id in (None, ''):
                raise serializers.ValidationError("Each line needs a 'reagent_item' id.")
            try:
                item_id = int(item_id)
                units = int(row.get('units_consumed_per_run') or 1)
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    "'reagent_item' and 'units_consumed_per_run' must be whole numbers.")
            if units < 1:
                raise serializers.ValidationError("A run consumes at least one unit.")
            wanted[item_id] = {'units_consumed_per_run': units}

        known = Item.objects.in_bulk(list(wanted))
        missing = set(wanted) - set(known)
        if missing:
            raise serializers.ValidationError(f"Unknown item id(s): {sorted(missing)}")
        for item in known.values():
            if item.category != 'LabReagent':
                raise serializers.ValidationError(
                    f"'{item.name}' is a {item.category} item, not a Lab Reagent. "
                    f"Syringes and tubes belong on the specimen, not the panel.")
        return wanted

    def create(self, validated_data):
        sale_price = validated_data.pop('sale_price', None)
        reagent_items = validated_data.pop('reagent_items', None)
        with transaction.atomic():
            if not validated_data.get('item'):
                validated_data['item'] = self._new_billing_item(validated_data['name'])
            panel = super().create(validated_data)
            if reagent_items is not None:
                self._set_reagents(panel, reagent_items)
            self._apply_price(panel, sale_price)
        return panel

    @staticmethod
    def _new_billing_item(name):
        '''
        The catalogue entry a new panel's invoice lines point at, made from
        its name. The panel is the product, so nothing has to be set up in
        inventory before it can be sold.

        An unclaimed Lab Test item of the same name is reused rather than
        duplicated. One already billing for another panel is refused: two
        panels on one item would share a price and bill twice.
        '''
        from inventory.models import Department, ItemDepartment
        from inventory.utils import generate_unique_item_code

        item, _ = Item.objects.get_or_create(
            name=name, category='Lab Test', units_of_measure='test',
            defaults={'desc': f'{name} test', 'item_code': generate_unique_item_code()})
        if LabTestPanel.objects.filter(item=item).exists():
            raise serializers.ValidationError({
                'name': f"'{name}' already bills for another panel. Give this panel "
                        f"a different name, or pick its billing item."})
        lab = Department.objects.filter(name__iexact='Lab').first()
        if lab:
            ItemDepartment.objects.get_or_create(
                item=item, department=lab, defaults={'is_primary': True})
        return item

    def update(self, instance, validated_data):
        sale_price = validated_data.pop('sale_price', None)
        reagent_items = validated_data.pop('reagent_items', None)
        with transaction.atomic():
            panel = super().update(instance, validated_data)
            if reagent_items is not None:
                self._set_reagents(panel, reagent_items)
            self._apply_price(panel, sale_price)
        return panel

    def _apply_price(self, panel, sale_price):
        if sale_price is None or not panel.item_id:
            return
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        panel.set_sale_price(
            sale_price,
            created_by=user if user and user.is_authenticated else None,
        )

    @staticmethod
    def _set_reagents(panel, wanted):
        '''Replace the panel's reagents with exactly what was posted.'''
        panel.reagent_links.exclude(reagent_item_id__in=list(wanted)).delete()
        for item_id, defaults in wanted.items():
            TestPanelReagent.objects.update_or_create(
                test_panel=panel, reagent_item_id=item_id, defaults=defaults)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['sale_price'] = instance.sale_price
        return data


def sample_consumable_rows(sample, availability_cache=None):
    """
    What taking this sample calls for, one row per consumable.

    Read off the specimen, not off the panels ordered against it: the syringe
    belongs to the draw, and three tests off one tube of blood are still one
    tube. These are the rows the collection screen lists before the draw and
    the rows the ledger is charged for when it is confirmed.

    Availability costs an aggregate pair per item, and a page of samples asks
    about the same handful of consumables over and over, so the caller can
    pass a cache to look each one up once.
    """
    cache = {} if availability_cache is None else availability_cache
    rows = []

    for link in sample.specimen.consumables.select_related('item'):
        item = link.item
        if item.id not in cache:
            cache[item.id] = _available_quantity(item)
        rows.append({
            # 'id' and 'item' are the keys the collection screen reads; one
            # row per consumable, so the item's own id serves as both.
            'id': item.id,
            'consumable': item.id,
            'item': item.id,
            'item_name': item.name,
            'item_code': item.item_code,
            'units_of_measure': item.units_of_measure,
            'quantity_per_collection': link.quantity_per_collection,
            'is_required': link.is_required,
            'available_quantity': cache[item.id],
        })

    return sorted(rows, key=lambda row: row['item_name'])


class PatientSampleConsumableSerializer(serializers.ModelSerializer):
    """What a collection actually spent, as recorded at the time."""
    item_name = serializers.ReadOnlyField(source='item.name')
    item_code = serializers.ReadOnlyField(source='item.item_code')
    units_of_measure = serializers.ReadOnlyField(source='item.units_of_measure')
    is_short = serializers.BooleanField(read_only=True)

    class Meta:
        model = PatientSampleConsumable
        fields = [
            'id',
            'item',
            'item_name',
            'item_code',
            'units_of_measure',
            'quantity',
            'quantity_required',
            'is_short',
            'recorded_on',
        ]


class LabTestInterpretationSerializer(serializers.ModelSerializer):
    test_profile_name = serializers.ReadOnlyField(source='test_profile.name')
    
    class Meta:
        model = LabTestInterpretation
        fields = [
            'id',
            'test_profile',
            'test_profile_name',
            'interpretation',
            'clinical_action',
            'requires_immediate_attention',
            'created_on',
            'updated_on',
        ]
        read_only_fields = ['created_on', 'updated_on']


class ReferenceValueSerializer(serializers.ModelSerializer):
    lab_test_panel_name = serializers.ReadOnlyField(source='lab_test_panel.name')

    class Meta:
        model = ReferenceValue
        fields = [
            'id',
            'lab_test_panel',
            'lab_test_panel_name',
            'sex',
            'age_min',
            'age_max',
            'ref_value_low',
            'ref_value_high',
        ]


class ReagentConsumptionLogSerializer(serializers.ModelSerializer):
    reagent_name = serializers.CharField(source='reagent_item.name', read_only=True)
    test_panel_name = serializers.CharField(source='test_panel.name', read_only=True)
    performed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ReagentConsumptionLog
        fields = [
            'id',
            'reagent_item',
            'reagent_name',
            'test_panel',
            'test_panel_name',
            'tests_consumed',
            'available_tests_before',
            'available_tests_after',
            'stock_movement_reference',
            'consumed_at',
            'patient_name',
            'performed_by',
            'performed_by_name'
        ]
        read_only_fields = ['consumed_at']
    
    def get_performed_by_name(self, obj):
        if obj.performed_by:
            return f"{obj.performed_by.first_name} {obj.performed_by.last_name}"
        return "N/A"


class LabSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabSettings
        fields = '__all__'


class ArchiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Archive
        fields = '__all__'


class ArchiveComponentSerializer(serializers.ModelSerializer):
    archive_name = serializers.ReadOnlyField(source='archive.name')

    class Meta:
        model = ArchiveComponent
        fields = '__all__'


class ArchiveSectionSerializer(serializers.ModelSerializer):
    component_name = serializers.ReadOnlyField(source='component.name')

    class Meta:
        model = ArchiveSection
        fields = '__all__'


class ArchiveRackSerializer(serializers.ModelSerializer):
    section_name = serializers.ReadOnlyField(source='section.name')

    class Meta:
        model = ArchiveRack
        fields = '__all__'


class ArchivePositionSerializer(serializers.ModelSerializer):
    rack_name = serializers.ReadOnlyField(source='rack.name')

    class Meta:
        model = ArchivePosition
        fields = '__all__'


class PatientSampleArchiveSerializer(serializers.ModelSerializer):
    patient_sample_code = serializers.ReadOnlyField(source='patient_sample.patient_sample_code')
    position_name = serializers.ReadOnlyField(source='position.name')
    created_by_name = serializers.ReadOnlyField(source='created_by.get_fullname')
    process_reference = serializers.ReadOnlyField(source='patient_sample.process.reference')
    attendance_process_id = serializers.ReadOnlyField(source='patient_sample.process.attendanceprocess.id')
    expiry_date = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = PatientSampleArchive
        fields = '__all__'

    def get_expiry_date(self, obj):
        from datetime import timedelta
        specimen = obj.patient_sample.specimen
        if specimen and specimen.max_archive_duration and obj.archiving_date:
            return obj.archiving_date + timedelta(days=specimen.max_archive_duration)
        return None

    def get_status(self, obj):
        from django.utils import timezone
        expiry_date = self.get_expiry_date(obj)
        if expiry_date and timezone.now().date() > expiry_date:
            return 'Expired'
        return 'Not Expired'


    def validate(self, attrs):
        position = attrs.get('position')
        patient_sample = attrs.get('patient_sample')
        instance = getattr(self, 'instance', None)

        if position:
            # Check if position is already occupied by another archive
            existing_archive_pos = PatientSampleArchive.objects.filter(position=position)
            if instance:
                existing_archive_pos = existing_archive_pos.exclude(pk=instance.pk)
            if existing_archive_pos.exists():
                raise serializers.ValidationError({
                    "position": "This position is already occupied by another patient sample."
                })

        if patient_sample:
            # Check if this sample is already archived
            existing_archive_sample = PatientSampleArchive.objects.filter(patient_sample=patient_sample)
            if instance:
                existing_archive_sample = existing_archive_sample.exclude(pk=instance.pk)
            if existing_archive_sample.exists():
                raise serializers.ValidationError({
                    "patient_sample": "This patient sample has already been archived."
                })

        return attrs


class DisposedSampleSerializer(serializers.ModelSerializer):
    disposed_by_name = serializers.ReadOnlyField(source='disposed_by.get_fullname')

    class Meta:
        model = DisposedSample
        fields = '__all__'


class RetestSampleSerializer(serializers.ModelSerializer):
    retested_by_name = serializers.ReadOnlyField(source='retested_by.get_fullname')

    class Meta:
        model = RetestSample
        fields = '__all__'


class ReleasedSampleSerializer(serializers.ModelSerializer):
    released_by_name = serializers.ReadOnlyField(source='released_by.get_fullname')

    class Meta:
        model = ReleasedSample
        fields = '__all__'
