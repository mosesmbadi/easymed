import django_filters

from .models import Ward, PatientAdmission


class WardFilter(django_filters.FilterSet):
    class Meta:
        model = Ward
        fields = ["gender"]


class PatientAdmissionFilter(django_filters.FilterSet):
    discharged = django_filters.BooleanFilter(
        field_name='is_discharged',
        lookup_expr='exact',
        label='Discharged Admissions'
    )

    class Meta:
        model = PatientAdmission
        fields = ["id", "discharged"]