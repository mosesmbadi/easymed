import django_filters

from .models import (
    LabTestRequest,
)

class LabTestRequestFilter(django_filters.FilterSet):
    patient_ID__id = django_filters.NumberFilter(lookup_expr='exact', label='patient_id')
    class Meta:
        model = LabTestRequest
        fields = "__all__"


        