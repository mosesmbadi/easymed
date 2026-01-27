import pdb
from random import randrange, choices
from rest_framework import serializers
from rest_framework.exceptions import NotFound

from customuser.models import CustomUser
from inventory.models import Inventory
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
    TestKit,
    TestKitCounter,
    LabTestInterpretation,
    ReagentConsumptionLog
    )


class TestKitSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestKit
        fields = '__all__'


class TestKitCounterSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestKitCounter
        fields = '__all__'


class LabReagentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabReagent
        fields = '__all__'


class LabTestProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTestProfile
        fields = '__all__'


class LabTestPanelSerializer(serializers.ModelSerializer):
    reference_values = serializers.SerializerMethodField()
    item_name = serializers.ReadOnlyField(source='item.name')
    test_profile_name = serializers.ReadOnlyField(source='test_profile.name')
    specimen_name = serializers.ReadOnlyField(source='specimen.name')

    class Meta:
        model = LabTestPanel
        fields = "__all__"

    def get_reference_values(self, obj):
        # Assuming `patient` is passed to the serializer context
        patient = self.context.get('patient')
        if patient:
            return obj.get_reference_values(patient)
        return None
    

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
    eta = serializers.DurationField(source='test_panel.eta', read_only=True)

    def get_sale_price(self, instance):
        try:
            inventory = instance.test_panel.item.active_inventory_items.first()
            if inventory:
                return inventory.sale_price
            return None  # Handle case where no inventory is found
        except Inventory.DoesNotExist:
            raise NotFound('Inventory record not found for this item.')
        
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
                "high": reference_value.ref_value_high
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
            'eta',
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

    class Meta:
        model = PatientSample
        fields = [
            'id',
            'patient_sample_code',
            'is_sample_collected',
            'specimen',
            'specimen_name',
            'lab_test_request',
            'process'
        ]
        read_only_fields = [
            'patient_sample_code',
        ]

    def get_specimen_name(self, obj):
        return obj.specimen.name

class SpecimenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specimen
        fields = '__all__'


class LabTestInterpretationSerializer(serializers.ModelSerializer):
    lab_test_panel_name = serializers.ReadOnlyField(source='lab_test_panel.name')
    sex_display = serializers.CharField(source='get_sex_display', read_only=True)
    range_type_display = serializers.CharField(source='get_range_type_display', read_only=True)
    
    class Meta:
        model = LabTestInterpretation
        fields = [
            'id',
            'lab_test_panel',
            'lab_test_panel_name',
            'range_type',
            'range_type_display',
            'sex',
            'sex_display',
            'age_min',
            'age_max',
            'value_min',
            'value_max',
            'interpretation',
            'clinical_action',
            'requires_immediate_attention',
            'created_on',
            'updated_on',
        ]
        read_only_fields = ['created_on', 'updated_on']


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


class LowStockReagentSerializer(serializers.ModelSerializer):
    reagent_name = serializers.CharField(source='reagent_item.name', read_only=True)
    stock_status = serializers.SerializerMethodField()
    
    class Meta:
        model = TestKitCounter
        fields = [
            'id',
            'reagent_item',
            'reagent_name',
            'available_tests',
            'minimum_threshold',
            'stock_status',
            'last_updated'
        ]
    
    def get_stock_status(self, obj):
        if obj.is_out_of_stock():
            return 'out_of_stock'
        elif obj.is_low_stock():
            return 'low_stock'
        return 'in_stock'
