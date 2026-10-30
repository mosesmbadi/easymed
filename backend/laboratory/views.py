import os
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import generics, viewsets, status
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.conf import settings
from datetime import timedelta
from django.utils import timezone
from django.template.loader import get_template, render_to_string
from weasyprint import HTML

from company.models import Company
from patient.models import Patient
from patient.models import AttendanceProcess
from inventory.models import StockBalance
from inventory.services import stock as stock_service
from .utils import lab_department, reagent_stock, reagent_stock_rows

# Lab stock lives in these categories. 'Lab Test' is a service (billable, no
# stock), so it is deliberately absent.
LAB_STOCK_CATEGORIES = ['LabReagent', 'LabConsumable']


from .models import (
    LabReagent,
    LabTestRequest,
    LabTestProfile,
    LabEquipment,
    PublicLabTestRequest,
    LabTestPanel,
    LabTestRequestPanel,
    ProcessTestRequest,
    PatientSample,
    Specimen,
    SpecimenConsumable,
    TestPanelReagent,
    ReagentConsumptionLog,
    ReferenceValue,
    LabTestInterpretation,
    LabSettings,
    Archive,
    ArchiveComponent,
    ArchiveSection,
    ArchiveRack,
    ArchivePosition,
    PatientSampleArchive,
    DisposedSample,
    RetestSample,
    ReleasedSample
)

from .serializers import (
    LabReagentSerializer,
    LabTestRequestSerializer,
    LabTestProfileSerializer,
    LabEquipmentSerializer,
    PublicLabTestRequestSerializer,
    LabTestPanelSerializer,
    LabTestRequestPanelSerializer,
    ProcessTestRequestSerializer,
    PatientSampleSerializer,
    SpecimenSerializer,
    SpecimenConsumableSerializer,
    TestPanelReagentSerializer,
    ReagentStockSerializer,
    ReagentConsumptionLogSerializer,
    LowStockReagentSerializer,
    ReferenceValueSerializer,
    LabTestInterpretationSerializer,
    LabSettingsSerializer,
    ArchiveSerializer,
    ArchiveComponentSerializer,
    ArchiveSectionSerializer,
    ArchiveRackSerializer,
    ArchivePositionSerializer,
    PatientSampleArchiveSerializer,
    DisposedSampleSerializer,
    RetestSampleSerializer,
    ReleasedSampleSerializer
)

from authperms.permissions import (
    IsStaffUser,
    IsDoctorUser,
    IsLabTechUser,
    IsNurseUser,
    IsSystemsAdminUser,
    IsPatientUser,
    IsReceptionistUser
)

# filters
from .filters import (
    LabTestRequestFilter,
)


class TestKitCounterViewSet(viewsets.ViewSet):
    """
    Reagent availability, derived from the stock ledger.

    Kept at its historical route so the lab dashboard keeps working. There is
    no counter table any more -- the number is computed from StockMovement, so
    it cannot drift away from actual stock.
    """
    serializer_class = ReagentStockSerializer

    def list(self, request):
        return Response(reagent_stock_rows())

    def retrieve(self, request, pk=None):
        from inventory.models import Item
        item = get_object_or_404(Item, pk=pk, category='LabReagent')
        return Response(reagent_stock(item))


class LabReagentViewSet(viewsets.ModelViewSet):
    queryset = LabReagent.objects.all()
    serializer_class = LabReagentSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser,)

class LabEquipmentViewSet(viewsets.ModelViewSet):
    queryset = LabEquipment.objects.all()
    serializer_class = LabEquipmentSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser,)

class SpecimenViewSet(viewsets.ModelViewSet):
    queryset = Specimen.objects.prefetch_related('consumables__item').all()
    serializer_class = SpecimenSerializer
    # permission_classes = (IsLabTechUser,)


class SpecimenConsumableViewSet(viewsets.ModelViewSet):
    """
    What collecting one sample of a specimen uses up.

    Deducted when the sample is marked collected, not when a test is billed, so
    several panels off one draw share one syringe and a retest off an archived
    sample spends nothing.
    """
    queryset = SpecimenConsumable.objects.select_related('specimen', 'item')
    serializer_class = SpecimenConsumableSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser,)
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['specimen', 'item']


class TestPanelReagentViewSet(viewsets.ModelViewSet):
    """
    The reagents a test panel consumes on every run. A panel can have many:
    a CBC burns diluent, lyse and cleaner, and each is deducted when the
    panel is billed.
    """
    queryset = TestPanelReagent.objects.select_related(
        'test_panel', 'reagent_item').all()
    serializer_class = TestPanelReagentSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser,)
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['test_panel', 'reagent_item']


class ReferenceValueViewSet(viewsets.ModelViewSet):
    queryset = ReferenceValue.objects.all()
    serializer_class = ReferenceValueSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser,)


class LabTestInterpretationViewSet(viewsets.ModelViewSet):
    queryset = LabTestInterpretation.objects.all()
    serializer_class = LabTestInterpretationSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser,)


'''Lab Test Profile and Panel'''
class LabTestProfileViewSet(viewsets.ModelViewSet):
    queryset = LabTestProfile.objects.all()
    serializer_class = LabTestProfileSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsPatientUser | IsReceptionistUser,)


class LabTestPanelViewSet(viewsets.ModelViewSet):
    '''
    This need s whole lot of testing to see if the ref value are actually
    gotten dynamically using the patients age and sex
    '''
    queryset = LabTestPanel.objects.select_related(
        'item', 'specimen', 'test_profile', 'units').prefetch_related(
        'reagent_links__reagent_item', 'specimen__consumables__item')
    serializer_class = LabTestPanelSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser,)

    @action(detail=False, methods=['get'], url_path='labtestpanels-byprofile-id/(?P<profile_id>[^/.]+)')
    def by_test_profile(self, request, profile_id=None):
        """
        Retrieve LabTestPanel items by a given TestProfile ID.
        """
        try:
            test_profile = LabTestProfile.objects.get(pk=profile_id)
        except LabTestProfile.DoesNotExist:
            return Response({"error": "Test Profile not found."}, status=status.HTTP_404_NOT_FOUND)

        # Retrieve patient details from request (assuming patient_id is provided)
        patient_id = request.query_params.get('patient_id')
        patient = None
        if patient_id:
            try:
                patient = Patient.objects.get(pk=patient_id)
            except Patient.DoesNotExist:
                return Response({"error": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)

        lab_test_panels = LabTestPanel.objects.filter(test_profile=test_profile)
        serializer = LabTestPanelSerializer(lab_test_panels, many=True, context={'patient': patient})
        return Response(serializer.data)


'''Lab Test Request and lab Test Request Panel'''
class LabTestRequestViewSet(viewsets.ModelViewSet):
    queryset = LabTestRequest.objects.all().order_by('-id')
    serializer_class = LabTestRequestSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser,)
    filter_backends = (DjangoFilterBackend,)
    filterset_class = LabTestRequestFilter


class LabTestRequestByPatientIdAPIView(APIView):
    def get_lab_test_requests_by_patient(self, patient_id: int):
        try:
            patient = get_object_or_404(Patient, id=patient_id)
            attendance_processes = AttendanceProcess.objects.filter(patient=patient)
            process_test_requests = ProcessTestRequest.objects.filter(attendanceprocess__in=attendance_processes)
            lab_test_requests = LabTestRequest.objects.filter(process__in=process_test_requests)
            return lab_test_requests
        except Patient.DoesNotExist:
            return None

    @extend_schema(
        responses=LabTestRequestSerializer,
    )
    def get(self, request: Request, patient_id: int, *args, **kwargs):
        lab_test_requests = self.get_lab_test_requests_by_patient(patient_id)
        if lab_test_requests is None:
            return Response({"error_message": f"Patient ID {patient_id} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)
        
        if not lab_test_requests.exists():
            return Response({"error_message": "No lab test requests found for the given patient"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = LabTestRequestSerializer(lab_test_requests, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
 

class LabTestRequestPanelViewSet(viewsets.ModelViewSet):
    queryset = LabTestRequestPanel.objects.all()
    serializer_class = LabTestRequestPanelSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsSystemsAdminUser | IsReceptionistUser,)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            context['patient'] = get_object_or_404(Patient, id=patient_id)
        return context


class LabTestRequestPanelByLabTestRequestId(generics.ListAPIView):
    serializer_class = LabTestRequestPanelSerializer

    def get_queryset(self):
        lab_test_request_id = self.kwargs['lab_test_request_id']
        return LabTestRequestPanel.objects.filter(lab_test_request_id=lab_test_request_id)
    
    
class PatientSampleByProcessId(generics.ListAPIView):
    serializer_class = PatientSampleSerializer 

    def get_queryset(self):
        process_id = self.kwargs['process_id']
        # The serializer lists each sample's specimen consumables, so pull them
        # in one go rather than per sample.
        return PatientSample.objects.filter(process=process_id).select_related(
            'specimen').prefetch_related('specimen__consumables__item')

class LabTestRequestByProcessId(generics.ListAPIView):
    serializer_class = LabTestRequestSerializer

    def get_queryset(self):
        process_id = self.kwargs['process_id']
        return LabTestRequest.objects.filter(process_id=process_id)

class PublicLabTestRequestViewSet(viewsets.ModelViewSet):
    queryset = PublicLabTestRequest.objects.all()
    serializer_class = PublicLabTestRequestSerializer
    permission_classes = (IsDoctorUser | IsPatientUser,)


class ProcessTestRequestViewSet(viewsets.ModelViewSet):
    queryset = ProcessTestRequest.objects.all().order_by('-id')
    serializer_class = ProcessTestRequestSerializer


class PatientSampleViewSet(viewsets.ModelViewSet):
    queryset = PatientSample.objects.select_related('specimen').prefetch_related(
        'specimen__consumables__item', 'consumables_used__item').order_by('-id')
    serializer_class = PatientSampleSerializer

'''
TODO: This is not shwoing is_billed in response
'''
class LabTestRequestPanelBySampleView(generics.ListAPIView):
    serializer_class = LabTestRequestPanelSerializer

    def get_queryset(self):
        patient_sample_code = self.kwargs.get('patient_sample_code')
        try:
            patient_sample = PatientSample.objects.get(patient_sample_code=patient_sample_code)
        except PatientSample.DoesNotExist:
            return LabTestRequestPanel.objects.none()  # No panels if patient sample is not found

        return LabTestRequestPanel.objects.filter(patient_sample=patient_sample)

    def get(self, request, *args, **kwargs):
        patient_sample_code = self.kwargs.get('patient_sample_code')
        patient_id = request.query_params.get('patient_id')

        try:
            patient_sample = PatientSample.objects.get(patient_sample_code=patient_sample_code)
        except PatientSample.DoesNotExist:
            return Response({"error": "PatientSample not found"}, status=status.HTTP_404_NOT_FOUND)

        patient = None
        if patient_id:
            try:
                patient = Patient.objects.get(id=patient_id)
            except Patient.DoesNotExist:
                return Response({"error": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)

        queryset = self.get_queryset()
        serializer_context = self.get_serializer_context()
        serializer_context['patient'] = patient

        serializer = self.get_serializer(queryset, many=True, context=serializer_context)
        return Response(serializer.data)


def download_labtestresult_pdf(request, processtestrequest_id):
    '''
    This view gets the generated PDF and downloads it locally
    pdf accessed here http://127.0.0.1:8080/download_labtestresult_pdf/26/
    Only displays lab test panels that have results
    '''
    processtestrequest = get_object_or_404(ProcessTestRequest, pk=processtestrequest_id)
    labtestrequests = LabTestRequest.objects.filter(process=processtestrequest)
    
    # Filter panels to only include those with results
    panels = LabTestRequestPanel.objects.filter(
        lab_test_request__in=labtestrequests
    ).exclude(result__isnull=True).exclude(result='')
    
    company = Company.objects.first()

    # Retrieve the patient from the AttendanceProcess linked via ProcessTestRequest
    attendance_process = get_object_or_404(AttendanceProcess, process_test_req=processtestrequest)
    patient = attendance_process.patient

    # Construct full logo URL for template
    company_logo_url = request.build_absolute_uri(company.logo.url) if company.logo else None

    first_request = labtestrequests.first() if labtestrequests.exists() else None
    first_panel = panels.first() if panels.exists() else None
    
    # Get signature URLs
    doctor_sig_url = request.build_absolute_uri(attendance_process.doctor.signature.url) if attendance_process.doctor and attendance_process.doctor.signature else None
    lab_tech_sig_url = request.build_absolute_uri(attendance_process.lab_tech.signature.url) if attendance_process.lab_tech and attendance_process.lab_tech.signature else None

    context = {
        'processtestrequest': processtestrequest,
        'labtestrequests': labtestrequests,
        'qualitative_panels': [],
        'quantitative_panels': [],
        'profile_interpretations': [],
        'patient': patient,
        'company': company,
        'company_logo_url': company_logo_url,
        'doctor_sig_url': doctor_sig_url,
        'lab_tech_sig_url': lab_tech_sig_url,
        'attendance_process': attendance_process,
        'approved_on': first_panel.approved_on if first_panel else None,
        'first_labtestrequest': first_request,
        'requested_date': first_request.created_on if first_request else None,
        'requested_time': first_request.requested_on if first_request else None,
        'result_entered_datetime': first_panel.approved_on if first_panel else None,
    }

    profile_interpretations_dict = {}

    # Only process panels that have results (already filtered in the query)
    for panel in panels:
        interpretation, action, attention = panel.generate_interpretation()
        
        profile = panel.test_panel.test_profile
        if profile and profile.id not in profile_interpretations_dict:
            if interpretation or panel.auto_interpretation:
                profile_interpretations_dict[profile.id] = {
                    'profile_name': profile.name,
                    'interpretation': interpretation or panel.auto_interpretation,
                    'clinical_action': action or panel.clinical_action,
                    'requires_attention': attention if interpretation else panel.requires_attention,
                }
                
        panel_data = {
            'test_panel_name': panel.test_panel.name,
            'result': panel.result,
            'flag': 'N/A',
            'ref_value_low': 'N/A',
            'ref_value_high': 'N/A',
            'unit': panel.test_panel.units.symbol if panel.test_panel.units else '',
        }

        if panel.test_panel.is_qualitative:
            context['qualitative_panels'].append(panel_data)
        else:
            # Fetch reference values based on the patient
            reference_value = panel.test_panel.reference_values.filter(
                sex=patient.gender,
                age_min__lte=patient.age,
                age_max__gte=patient.age
            ).first()
            
            # If no exact match for gender (e.g., gender 'O'), try male reference values as fallback
            if not reference_value and patient.gender not in ['M', 'F']:
                reference_value = panel.test_panel.reference_values.filter(
                    sex='M',
                    age_min__lte=patient.age,
                    age_max__gte=patient.age
                ).first()

            if reference_value:
                result = panel.result
                try:
                    if float(result) < reference_value.ref_value_low:
                        flag = 'Low'
                    elif float(result) > reference_value.ref_value_high:
                        flag = 'High'
                    else:
                        flag = 'Normal'
                    
                    panel_data['flag'] = flag
                    panel_data['ref_value_low'] = reference_value.ref_value_low
                    panel_data['ref_value_high'] = reference_value.ref_value_high
                except (ValueError, TypeError):
                    # Handle non-numeric results
                    pass

            context['quantitative_panels'].append(panel_data)

    context['profile_interpretations'] = list(profile_interpretations_dict.values())

    html_template = get_template('labtestresult.html').render(context)


    pdf_file = HTML(string=html_template).write_pdf()

    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="labtest_report_{processtestrequest_id}.pdf"'

    return response


class ReagentConsumptionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for reagent consumption logs.
    Provides list and detail views for tracking reagent usage.
    """
    queryset = ReagentConsumptionLog.objects.select_related(
        'reagent_item', 'test_panel', 'performed_by'
    ).all()
    serializer_class = ReagentConsumptionLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['reagent_item', 'test_panel', 'consumed_at']
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get consumption summary grouped by reagent"""
        from django.db.models import Sum, Count, Avg
        from django.db.models.functions import TruncDate
        
        # Group by reagent
        summary = ReagentConsumptionLog.objects.values(
            'reagent_item__name'
        ).annotate(
            total_tests_consumed=Sum('tests_consumed'),
            consumption_count=Count('id'),
            avg_tests_per_use=Avg('tests_consumed')
        ).order_by('-total_tests_consumed')
        
        return Response(summary)
    
    @action(detail=False, methods=['get'])
    def daily_consumption(self, request):
        """Get daily consumption trends"""
        from django.db.models import Sum
        from django.db.models.functions import TruncDate
        
        daily = ReagentConsumptionLog.objects.annotate(
            date=TruncDate('consumed_at')
        ).values('date', 'reagent_item__name').annotate(
            tests_consumed=Sum('tests_consumed')
        ).order_by('-date')[:30]  # Last 30 days
        
        return Response(daily)
    
    @action(detail=False, methods=['get'])
    def recent_usage(self, request):
        """Recently used reagents with their current stock levels, from the ledger."""
        from datetime import timedelta

        from django.db.models import Max
        from django.utils import timezone

        from inventory.models import Item

        recent_time = timezone.now() - timedelta(hours=24)

        recent_consumptions = ReagentConsumptionLog.objects.filter(
            consumed_at__gte=recent_time
        ).values('reagent_item').annotate(
            last_used=Max('consumed_at')
        ).order_by('-last_used')[:10]

        last_used_by_item = {c['reagent_item']: c['last_used'] for c in recent_consumptions}
        items = Item.objects.filter(id__in=last_used_by_item.keys())

        result = []
        for row in reagent_stock_rows(items=items):
            row['last_used'] = last_used_by_item.get(row['reagent_item'])
            result.append(row)

        result.sort(key=lambda x: x['last_used'] or timezone.now(), reverse=True)
        return Response(result)


class LowStockReagentViewSet(viewsets.ViewSet):
    """
    Lab reagents that are low or out of stock, derived from the stock ledger.
    """

    def list(self, request):
        status_filter = request.query_params.get('status', None)

        result = []
        for row in reagent_stock_rows():
            is_out = row['is_out_of_stock']
            is_low = row['is_low_stock']

            if status_filter == 'low' and not (is_low and not is_out):
                continue
            if status_filter == 'out' and not is_out:
                continue
            if status_filter is None and not (is_low or is_out):
                continue

            result.append(row)

        return Response(result)

    @action(detail=False, methods=['get'])
    def count(self, request):
        """Get count of low/out of stock reagents"""
        low_stock = 0
        out_of_stock = 0

        for row in reagent_stock_rows():
            if row['is_out_of_stock']:
                out_of_stock += 1
            elif row['is_low_stock']:
                low_stock += 1

        return Response({
            'low_stock': low_stock,
            'out_of_stock': out_of_stock,
            'total_alerts': low_stock + out_of_stock,
        })

class LabSettingsViewSet(viewsets.ModelViewSet):
    queryset = LabSettings.objects.all()
    serializer_class = LabSettingsSerializer
    permission_classes = (IsLabTechUser | IsStaffUser,)

    def get_queryset(self):
        return LabSettings.objects.all()

    def get_object(self):
        return LabSettings.get_settings()

    @action(detail=False, methods=['get'])
    def get_settings(self, request):
        settings = LabSettings.get_settings()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)
class LabDashboardMetricsView(APIView):
    def get(self, request, *args, **kwargs):
        # 1. TAT Analysis Summary
        now = timezone.now()
        lab_settings = LabSettings.get_settings()
        default_tat = timedelta(minutes=lab_settings.default_tat_minutes)
        
        # Tests with collected samples (for TAT analysis)
        with_samples = LabTestRequestPanel.objects.filter(
            patient_sample__collected_on__isnull=False
        ).select_related('test_panel', 'patient_sample')
        
        # Pending tests (ALL not yet approved, even without samples)
        pending_panels = LabTestRequestPanel.objects.filter(result_approved=False)
        pending_count = pending_panels.count()
        
        # Late pending tests (unapproved, with samples, duration > TAT)
        late_pending_count = 0
        pending_with_samples = pending_panels.filter(patient_sample__collected_on__isnull=False).select_related('test_panel', 'patient_sample')
        
        for panel in pending_with_samples:
            tat_limit = panel.test_panel.tat if panel.test_panel.tat else default_tat
            if tat_limit:
                duration = now - panel.patient_sample.collected_on
                if duration > tat_limit:
                    late_pending_count += 1

        # 2. Short Expiries for Lab Items
        today = timezone.now().date()
        date_limit = today + timedelta(days=90)
        
        short_expiries_count = StockBalance.objects.filter(
            item__category__in=LAB_STOCK_CATEGORIES,
            quantity__gt=0,
            lot__expiry_date__lte=date_limit,
            lot__expiry_date__gt=today,
        ).count()

        # 3. Re-order Levels for Lab Items. Evaluated per item per location by
        # the service layer -- a per-lot re-order level says nothing useful.
        reorder_count = sum(
            len(stock_service.items_below_reorder_level(category=category))
            for category in LAB_STOCK_CATEGORIES
        )

        return Response({
            'late_pending': late_pending_count,
            'pending_tat': pending_count,
            'short_expiries': short_expiries_count,
            'reorder_levels': reorder_count
        })

def print_lab_report(request):
    report_type = request.GET.get('type')
    company = Company.objects.first()
    today = timezone.now()
    company_logo_url = request.build_absolute_uri(company.logo.url) if (company and getattr(company, 'logo', None)) else None
    
    data = {
        'company': company,
        'company_logo_url': company_logo_url,
        'today': today,
        'report_type': report_type,
    }
    
    template_name = 'lab_metrics_report.html'
    
    if report_type == 'tat':
        now = timezone.now()
        lab_settings = LabSettings.get_settings()
        default_tat = timedelta(minutes=lab_settings.default_tat_minutes)

        # All tests with collected samples
        all_tests = LabTestRequestPanel.objects.filter(
            patient_sample__collected_on__isnull=False
        ).select_related('test_panel', 'patient_sample')
        
        report_items = []
        for panel in all_tests:
            # Time taken: if approved, use approved_on - collected_on, else use now - collected_on
            if panel.result_approved and panel.approved_on:
                duration = panel.approved_on - panel.patient_sample.collected_on
            else:
                duration = now - panel.patient_sample.collected_on
            
            # Prevent negative duration display due to timezone drift or old records
            if duration.total_seconds() < 0:
                duration = timedelta(0)

            # Format duration
            total_seconds = int(duration.total_seconds())
            hours, remainder = divmod(total_seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            time_taken_str = f"{hours}h {minutes}m"
            
            # TAT Goal string
            tat_limit = panel.test_panel.tat if panel.test_panel.tat else default_tat
            panel.tat_limit_str = f"{int(tat_limit.total_seconds() // 60)} mins" if tat_limit else "N/A"

            # Determine Status and Color
            if not panel.result_approved:
                status_text = "PENDING"
                status_color = "#ed6c02" # Orange
            else:
                if tat_limit and duration > tat_limit:
                    status_text = "FAILED"
                    status_color = "#d32f2f" # Red
                else:
                    status_text = "PASSED"
                    status_color = "#2e7d32" # Green
            
            # Add extra info to the object for the template
            panel.time_taken_str = time_taken_str
            panel.status_text = status_text
            panel.status_color = status_color
            report_items.append(panel)
            
        data['items'] = report_items
        data['title'] = "Laboratory TAT Analysis Report (Full)"
        
    elif report_type == 'expiry':
        today_date = today.date()
        date_limit = today_date + timedelta(days=90)
        data['items'] = StockBalance.objects.filter(
            item__category__in=LAB_STOCK_CATEGORIES,
            quantity__gt=0,
            lot__expiry_date__lte=date_limit,
            lot__expiry_date__gt=today_date,
        ).select_related('item', 'lot', 'department')
        data['title'] = "Lab Items Short Expiry Report"

    elif report_type == 'reorder':
        rows = []
        for category in LAB_STOCK_CATEGORIES:
            rows.extend(stock_service.items_below_reorder_level(category=category))
        data['items'] = rows
        data['title'] = "Lab Items Re-order Level Report"
    
    html_content = render_to_string(template_name, data)
    pdf_file = HTML(string=html_content).write_pdf()
    
    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="lab_{report_type}_report_{today.strftime("%Y%m%d")}.pdf"'
    return response


class ArchiveViewSet(viewsets.ModelViewSet):
    queryset = Archive.objects.all().order_by('-id')
    serializer_class = ArchiveSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser | IsSystemsAdminUser,)


class ArchiveComponentViewSet(viewsets.ModelViewSet):
    queryset = ArchiveComponent.objects.all().order_by('-id')
    serializer_class = ArchiveComponentSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser | IsSystemsAdminUser,)


class ArchiveSectionViewSet(viewsets.ModelViewSet):
    queryset = ArchiveSection.objects.all().order_by('-id')
    serializer_class = ArchiveSectionSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser | IsSystemsAdminUser,)


class ArchiveRackViewSet(viewsets.ModelViewSet):
    queryset = ArchiveRack.objects.all().order_by('-id')
    serializer_class = ArchiveRackSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser | IsSystemsAdminUser,)


class ArchivePositionViewSet(viewsets.ModelViewSet):
    queryset = ArchivePosition.objects.all().order_by('-id')
    serializer_class = ArchivePositionSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser | IsSystemsAdminUser,)


class PatientSampleArchiveViewSet(viewsets.ModelViewSet):
    queryset = PatientSampleArchive.objects.all().order_by('-id')
    serializer_class = PatientSampleArchiveSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser | IsSystemsAdminUser,)


class DisposedSampleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DisposedSample.objects.all().order_by('-id')
    serializer_class = DisposedSampleSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser | IsSystemsAdminUser,)


class RetestSampleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RetestSample.objects.all().order_by('-id')
    serializer_class = RetestSampleSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser | IsSystemsAdminUser,)


class ReleasedSampleViewSet(viewsets.ModelViewSet):
    queryset = ReleasedSample.objects.all().order_by('-id')
    serializer_class = ReleasedSampleSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser | IsSystemsAdminUser,)

    def perform_create(self, serializer):
        serializer.save(released_by=self.request.user)
