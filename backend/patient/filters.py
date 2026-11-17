from datetime import date

import django_filters
from django.db.models import Q
from django.utils import timezone
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



def visit_day(value):
    """
    The day asked for by `?visited_on=`: 'today' (the facility's today, in
    TIME_ZONE) or a YYYY-MM-DD date. None when it is neither.
    """
    if value == 'today':
        return timezone.localdate()
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


class PatientFilter(django_filters.FilterSet):
    first_name = django_filters.CharFilter(lookup_expr="icontains")
    second_name = django_filters.CharFilter(lookup_expr="icontains")
    user_id__id = django_filters.NumberFilter(lookup_expr="exact", label="user_id")
    # Patients registered that day or with a visit that day: who came in.
    visited_on = django_filters.CharFilter(method='filter_visited_on')

    class Meta:
        model = Patient
        fields = ("user_id__id", "first_name", "second_name", "gender")

    def filter_visited_on(self, queryset, name, value):
        day = visit_day(value)
        if day is None:
            return queryset
        return queryset.filter(
            Q(registered_at__date=day)
            | Q(pk__in=AttendanceProcess.objects.filter(created_at__date=day).values('patient_id')))


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
    prescription = django_filters.NumberFilter(field_name='prescription__id', lookup_expr='exact', label='prescription')
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

class AttendanceProcessTrackFilter(django_filters.FilterSet):
    """
    `?track=lab` or several at once, `?track=lab,pharmacy,doctor`. Each screen
    asks only for the visits on its own track(s), so the list it gets is its
    queue rather than every visit the facility has ever had.
    """
    track = django_filters.CharFilter(method='filter_track')
    # `?visited_on=today` (or a YYYY-MM-DD date): only that day's visits.
    visited_on = django_filters.CharFilter(method='filter_visited_on')

    class Meta:
        model = AttendanceProcess
        fields = ['track']

    def filter_track(self, queryset, name, value):
        tracks = [t.strip() for t in value.split(',') if t.strip()]
        return queryset.filter(track__in=tracks) if tracks else queryset

    def filter_visited_on(self, queryset, name, value):
        day = visit_day(value)
        return queryset.filter(created_at__date=day) if day else queryset


class AttendanceProcessFilter(filters.SearchFilter):
    def get_search_fields(self, view, request):
        # Get the value of the 'search_field' query parameter
        search_field_param = request.query_params.get('search_field')

        # Check if the parameter exists and is a valid field name
        if search_field_param in view.search_fields:
            return [search_field_param]
        
        # If the parameter is not provided or is invalid, use the view's default search fields
        return super().get_search_fields(view, request)
    
class PatientFilterSearch(filters.SearchFilter):
    def get_search_fields(self, view, request):
        # Get the value of the 'search_field' query parameter
        search_field_param = request.query_params.get('search_field')

        # Check if the parameter exists and is a valid field name
        if search_field_param in view.search_fields:
            return [search_field_param]
        
        # If the parameter is not provided or is invalid, use the view's default search fields
        return super().get_search_fields(view, request)

