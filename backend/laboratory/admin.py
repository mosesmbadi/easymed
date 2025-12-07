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
    TestKitCounter
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
admin.site.register(TestKitCounter)


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

