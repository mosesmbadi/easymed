import django_filters
from django_filters import rest_framework as filters
from rest_framework import filters as drf_filters

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

class InpatientFilterSearch(drf_filters.SearchFilter):
    def get_search_fields(self, view, request):
        # Get the value of the 'search_field' query parameter
        search_field_param = request.query_params.get('search_field')

        # Check if the parameter exists and is a valid field name
        if search_field_param in view.search_fields:
            return [search_field_param]
        
        # If the parameter is not provided or is invalid, use the view's default search fields
        return super().get_search_fields(view, request)
