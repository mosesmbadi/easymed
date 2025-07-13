import django_filters 

# models
from .models import (
    Patient,
    Consultation,
    Triage,
    Prescription,
    PrescribedDrug,
)



class PatientFilter(django_filters.FilterSet):
    first_name = django_filters.CharFilter(lookup_expr="icontains")
    second_name = django_filters.CharFilter(lookup_expr="icontains")
    user_id__id = django_filters.NumberFilter(lookup_expr="exact", label="user_id")

    class Meta:
        model = Patient
        fields = ("user_id__id", "first_name", "second_name", "gender")


class ConsultationFilter(django_filters.FilterSet):
    doctor_ID__id = django_filters.NumberFilter(lookup_expr="exact", label="doctor_id")
    patient_id__id = django_filters.NumberFilter(
        lookup_expr="exact", label="patient_id"
    )

    class Meta:
        model = Consultation
        fields = (
            "doctor_ID__id",
            "patient_id__id",
        )


class TriageFilter(django_filters.FilterSet):
    patient_id__id = django_filters.NumberFilter(
        lookup_expr="exact", label="patient_id"
    )

    class Meta:
        model = Triage
        fields = ("patient_id__id", )

class PrescriptionFilter(django_filters.FilterSet):
    patient_id__id = django_filters.NumberFilter(lookup_expr='exact', label='patient_id')
    class Meta:
        model = Prescription
        fields = ("patient_id__id",)

class PrescribedDrugFilter(django_filters.FilterSet):
    prescription_id__id = django_filters.NumberFilter(lookup_expr='exact', label='prescription_id')
    item_ID__id = django_filters.NumberFilter(lookup_expr='exact', label='item_id')
    class Meta:
        model = PrescribedDrug
        fields = "__all__"



