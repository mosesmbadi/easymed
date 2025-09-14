import django_filters
from rest_framework import filters

# models
from .models import (
    AttendanceProcess,
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


# class AttendanceProcessFilter(filters.SearchFilter):
#     patient__user__get_fullname = django_filters.CharFilter(lookup_expr="icontains")
#     patient__second_name = django_filters.CharFilter(lookup_expr="icontains")
#     patient__first_name = django_filters.CharFilter(lookup_expr="icontains")
#     class Meta:
#         model = AttendanceProcess
#         fields = "__all__"

class AttendanceProcessFilter(filters.SearchFilter):
    def get_search_fields(self, view, request):
        # Get the value of the 'search_field' query parameter
        search_field_param = request.query_params.get('search_field')

        # Check if the parameter exists and is a valid field name
        if search_field_param in view.search_fields:
            return [search_field_param]
        
        # If the parameter is not provided or is invalid, use the view's default search fields
        return super().get_search_fields(view, request)

