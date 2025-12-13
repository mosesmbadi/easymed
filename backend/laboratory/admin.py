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
    PatientSample,
    ReferenceValue,
    LabTestInterpretation,
    ProcessTestRequest,
    TestKit,
    TestKitCounter,
    TestPanelReagent,
    ReagentConsumptionLog
)

admin.site.register(LabReagent)
admin.site.register(LabTestProfile)
admin.site.register(LabTestPanel)
admin.site.register(ProcessTestRequest)
admin.site.register(LabTestRequest)
admin.site.register(LabTestRequestPanel)
admin.site.register(LabEquipment)
admin.site.register(Specimen)
admin.site.register(PatientSample)
admin.site.register(ReferenceValue)
admin.site.register(TestKit)


@admin.register(TestPanelReagent)
class TestPanelReagentAdmin(admin.ModelAdmin):
    list_display = ['test_panel', 'reagent_item', 'tests_consumed_per_run']
    list_filter = ['test_panel__test_profile']
    search_fields = ['test_panel__name', 'reagent_item__name']


@admin.register(TestKitCounter)
class TestKitCounterAdmin(admin.ModelAdmin):
    list_display = ['reagent_item', 'available_tests', 'minimum_threshold', 'stock_status', 'last_updated']
    list_filter = ['last_updated']
    search_fields = ['reagent_item__name']
    readonly_fields = ['last_updated']
    
    def stock_status(self, obj):
        if obj.is_out_of_stock():
            return '🔴 Out of Stock'
        elif obj.is_low_stock():
            return '🟡 Low Stock'
        return '🟢 In Stock'
    stock_status.short_description = 'Status'


@admin.register(ReagentConsumptionLog)
class ReagentConsumptionLogAdmin(admin.ModelAdmin):
    list_display = ['reagent_item', 'test_panel', 'tests_consumed', 'patient_name', 'consumed_at', 'available_tests_after']
    list_filter = ['consumed_at', 'reagent_item', 'test_panel']
    search_fields = ['reagent_item__name', 'test_panel__name', 'patient_name']
    readonly_fields = ['consumed_at', 'available_tests_before', 'available_tests_after']
    date_hierarchy = 'consumed_at'
    
    def has_add_permission(self, request):
        # Consumption logs are created automatically, not manually
        return False
    
    def has_change_permission(self, request, obj=None):
        # Consumption logs should not be edited
        return False


@admin.register(LabTestInterpretation)
class LabTestInterpretationAdmin(admin.ModelAdmin):
    list_display = ['lab_test_panel', 'range_type', 'sex', 'value_min', 'value_max', 'requires_immediate_attention']
    list_filter = ['lab_test_panel', 'range_type', 'sex', 'requires_immediate_attention']
    search_fields = ['lab_test_panel__name', 'interpretation', 'clinical_action']
    fieldsets = (
        ('Test Information', {
            'fields': ('lab_test_panel', 'range_type')
        }),
        ('Patient Criteria', {
            'fields': ('sex', 'age_min', 'age_max')
        }),
        ('Value Range', {
            'fields': ('value_min', 'value_max'),
            'description': 'Leave blank for unbounded ranges (e.g., blank max for "greater than X")'
        }),
        ('Interpretation', {
            'fields': ('interpretation', 'clinical_action', 'requires_immediate_attention')
        }),
    )

