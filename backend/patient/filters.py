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
    # `?referred=false`: our own patients, not those known only through
    # samples another facility sent.
    referred = django_filters.BooleanFilter(field_name="referred_from", lookup_expr="isnull", exclude=True)
    # `?id__in=1,2,3`: just the patients a screen needs to name.
    id__in = django_filters.BaseInFilter(field_name="id", lookup_expr="in")

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



class CharInFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass


class NumberInFilter(django_filters.BaseInFilter, django_filters.NumberFilter):
    pass


def _has_billed_line(category):
    from django.db.models import Exists, OuterRef
    from billing.models import InvoiceItem
    return Exists(InvoiceItem.objects.filter(
        invoice=OuterRef('invoice'), status='billed', item__category__icontains=category))


class AttendanceProcessFilterSet(django_filters.FilterSet):
    """
    Each queue asks for its own visits, so no screen downloads every visit
    ever recorded to filter them in the browser.

    - `track` / `track__in=reception,triage`
    - `queue=nursing`: everyone in triage, and anyone further on whose
      consultation is billed -- the doctor sees nobody who hasn't paid it.
    - `queue=lab_requests`: visits with a billed lab test, the only ones the
      bench may run.
    - `process_test_req__in=1,2`: the visits behind a list of samples.
    """
    QUEUES = (('nursing', 'Nursing station'), ('lab_requests', 'Lab requests'))

    track__in = CharInFilter(field_name='track', lookup_expr='in')
    process_test_req__in = NumberInFilter(field_name='process_test_req', lookup_expr='in')
    queue = django_filters.ChoiceFilter(choices=QUEUES, method='filter_queue')

    class Meta:
        model = AttendanceProcess
        fields = ['track', 'patient']

    def filter_queue(self, queryset, name, value):
        from django.db.models import Q
        if value == 'nursing':
            return queryset.filter(Q(track='triage') | Q(_has_billed_line('appointment')))
        if value == 'lab_requests':
            return queryset.filter(_has_billed_line('lab test'), process_test_req__isnull=False)
        return queryset
