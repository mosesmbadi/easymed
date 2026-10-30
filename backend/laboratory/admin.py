from django.contrib import admin
from .models import (
    LabReagent,
    LabTestProfile,
    LabTestPanel,
    LabTestRequest,
    LabTestRequestPanel,
    ProcessTestRequest,
    LabEquipment,
    Specimen,
    SpecimenConsumable,
    PatientSample,
    PatientSampleConsumable,
    ReferenceValue,
    LabTestInterpretation,
    TestPanelReagent,
    ReagentConsumptionLog
)

admin.site.register(LabReagent)
@admin.register(LabTestProfile)
class LabTestProfileAdmin(admin.ModelAdmin):
    class LabTestInterpretationInline(admin.TabularInline):
        model = LabTestInterpretation
        extra = 1

    inlines = [LabTestInterpretationInline]

@admin.register(LabTestPanel)
class LabTestPanelAdmin(admin.ModelAdmin):
    list_display = ['name', 'test_profile', 'specimen', 'units', 'is_qualitative', 'is_quantitative']
    list_filter = ['test_profile', 'specimen', 'is_qualitative', 'is_quantitative']
    search_fields = ['name', 'test_profile__name', 'specimen__name']

    class ReferenceValueInline(admin.TabularInline):
        model = ReferenceValue
        extra = 1

    class TestPanelReagentInline(admin.TabularInline):
        model = TestPanelReagent
        extra = 1

    inlines = [ReferenceValueInline, TestPanelReagentInline]
admin.site.register(ProcessTestRequest)
admin.site.register(LabTestRequest)
admin.site.register(LabTestRequestPanel)
admin.site.register(LabEquipment)
@admin.register(Specimen)
class SpecimenAdmin(admin.ModelAdmin):
    list_display = ['name', 'max_archive_duration']
    search_fields = ['name']

    class SpecimenConsumableInline(admin.TabularInline):
        model = SpecimenConsumable
        extra = 1

    inlines = [SpecimenConsumableInline]


@admin.register(SpecimenConsumable)
class SpecimenConsumableAdmin(admin.ModelAdmin):
    list_display = ['specimen', 'item', 'quantity_per_collection', 'is_required']
    list_filter = ['specimen', 'is_required']
    search_fields = ['specimen__name', 'item__name']


@admin.register(PatientSample)
class PatientSampleAdmin(admin.ModelAdmin):
    list_display = ['patient_sample_code', 'specimen', 'is_sample_collected', 'collected_on']
    list_filter = ['is_sample_collected', 'specimen']
    search_fields = ['patient_sample_code']

    class PatientSampleConsumableInline(admin.TabularInline):
        model = PatientSampleConsumable
        extra = 0
        readonly_fields = ['item', 'quantity', 'quantity_required',
                           'stock_movement_reference', 'recorded_on']

        def has_add_permission(self, request, obj=None):
            # Written by the collection, not typed in after the fact.
            return False

    inlines = [PatientSampleConsumableInline]
admin.site.register(ReferenceValue)
@admin.register(TestPanelReagent)
class TestPanelReagentAdmin(admin.ModelAdmin):
    list_display = ['test_panel', 'reagent_item', 'units_consumed_per_run']
    list_filter = ['test_panel__test_profile']
    search_fields = ['test_panel__name', 'reagent_item__name']


# Reagent stock levels are not a table any more. They are derived from the
# stock ledger, so browse them under Inventory > Stock balances (filtered to
# Lab Reagent) instead of a counter that could drift.


@admin.register(ReagentConsumptionLog)
class ReagentConsumptionLogAdmin(admin.ModelAdmin):
    list_display = ['reagent_item', 'test_panel', 'tests_consumed', 'patient_name', 'consumed_at', 'available_tests_after']
    list_filter = ['consumed_at', 'reagent_item', 'test_panel']
    search_fields = ['reagent_item__name', 'test_panel__name', 'patient_name']
    readonly_fields = ['consumed_at', 'available_tests_before', 'available_tests_after',
                       'stock_movement_reference']
    date_hierarchy = 'consumed_at'
    
    def has_add_permission(self, request):
        # Consumption logs are created automatically, not manually
        return False
    
    def has_change_permission(self, request, obj=None):
        # Consumption logs should not be edited
        return False


@admin.register(LabTestInterpretation)
class LabTestInterpretationAdmin(admin.ModelAdmin):
    list_display = ['test_profile', 'requires_immediate_attention']
    list_filter = ['test_profile', 'requires_immediate_attention']
    search_fields = ['test_profile__name', 'interpretation', 'clinical_action']
    fieldsets = (
        ('Test Information', {
            'fields': ('test_profile',)
        }),
        ('Interpretation', {
            'fields': ('interpretation', 'clinical_action', 'requires_immediate_attention')
        }),
    )

