import django_filters

from .models import (
    LabTestRequest,
    PatientSample,
)

class LabTestRequestFilter(django_filters.FilterSet):
    patient_ID__id = django_filters.NumberFilter(lookup_expr='exact', label='patient_id')
    class Meta:
        model = LabTestRequest
        fields = "__all__"


        
class PatientSampleFilter(django_filters.FilterSet):
    """
    `?is_sample_collected=true&released=false` is the bench's list of drawn
    samples not yet sent on; `archived` and `disposed` likewise. The
    disposed filter reads the annotation PatientSampleViewSet adds.
    """
    released = django_filters.BooleanFilter(field_name='release_record', lookup_expr='isnull', exclude=True)
    archived = django_filters.BooleanFilter(field_name='archive_record', lookup_expr='isnull', exclude=True)
    disposed = django_filters.BooleanFilter(field_name='disposed_flag')

    class Meta:
        model = PatientSample
        fields = ['is_sample_collected', 'process', 'specimen']
