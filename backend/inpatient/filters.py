import django_filters
from django_filters import rest_framework as filters

from .models import Ward, PatientAdmission

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
