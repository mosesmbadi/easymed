import django_filters
from django_filters import rest_framework as filters

from .models import Ward, PatientAdmission, WardNurseAssignment

class WardFilter(django_filters.FilterSet):
    class Meta:
        model = Ward
        fields = ["gender"]

class PatientAdmissionFilter(filters.FilterSet):
    status = filters.CharFilter(method='filter_status')

    class Meta:
        model = PatientAdmission
        fields = ['status', 'ward']

    def filter_status(self, queryset, name, value):
        if value == "admitted":
            return queryset.filter(discharge__isnull=True)
        elif value == "discharged":
            return queryset.filter(discharge__isnull=False)
        return queryset

class WardNurseAssignmentFilter(filters.FilterSet):
    nurse_id = filters.NumberFilter(field_name="nurse__id", lookup_expr="exact")
    ward_id = filters.NumberFilter(field_name="ward__id", lookup_expr="exact")

    class Meta:
        model = WardNurseAssignment
        fields = ["nurse_id", "ward_id"]
