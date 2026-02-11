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
from django.template.loader import render_to_string
from weasyprint import HTML
from django.template.loader import get_template

from company.models import Company
from patient.models import Patient
from patient.models import AttendanceProcess


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
    TestKit,
    TestKitCounter,
    ReagentConsumptionLog,
    ReferenceValue
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
    TestKitCounterSerializer,
    TestKitSerializer,
    ReagentConsumptionLogSerializer,
    LowStockReagentSerializer,
    ReferenceValueSerializer
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


class TestKitViewSet(viewsets.ModelViewSet):
    queryset = TestKit.objects.all()
    serializer_class = TestKitSerializer


class TestKitCounterViewSet(viewsets.ModelViewSet):
    queryset = TestKitCounter.objects.all()
    serializer_class = TestKitCounterSerializer


class LabReagentViewSet(viewsets.ModelViewSet):
    queryset = LabReagent.objects.all()
    serializer_class = LabReagentSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser,)

class LabEquipmentViewSet(viewsets.ModelViewSet):
    queryset = LabEquipment.objects.all()
    serializer_class = LabEquipmentSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser,)

class SpecimenViewSet(viewsets.ModelViewSet):
    queryset = Specimen.objects.all()
    serializer_class = SpecimenSerializer
    # permission_classes = (IsLabTechUser,)


class ReferenceValueViewSet(viewsets.ModelViewSet):
    queryset = ReferenceValue.objects.all()
    serializer_class = ReferenceValueSerializer
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
    queryset = LabTestPanel.objects.all()
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
        return PatientSample.objects.filter(process=process_id)

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
    queryset = PatientSample.objects.all().order_by('-id')
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
    
    context = {
        'processtestrequest': processtestrequest,
        'labtestrequests': labtestrequests,
        'qualitative_panels': [],
        'quantitative_panels': [],
        'patient': patient,
        'company': company,
        'company_logo_url': company_logo_url,
        'attendance_process': attendance_process,
        'approved_on': first_panel.approved_on if first_panel else None,
        'first_labtestrequest': first_request,
        'requested_date': first_request.created_on if first_request else None,
        'requested_time': first_request.requested_on if first_request else None,
        'result_entered_datetime': first_panel.approved_on if first_panel else None,
    }

    # Only process panels that have results (already filtered in the query)
    for panel in panels:
        panel_data = {
            'test_panel_name': panel.test_panel.name,
            'result': panel.result,
            'flag': 'N/A',
            'ref_value_low': 'N/A',
            'ref_value_high': 'N/A',
            'unit': panel.test_panel.unit,
            'interpretation': panel.auto_interpretation,
            'clinical_action': panel.clinical_action,
            'requires_attention': panel.requires_attention,
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
        """Get recently used reagents with their current stock levels"""
        from django.db.models import Max
        from datetime import timedelta
        from django.utils import timezone
        
        # Get reagents used in the last 24 hours
        recent_time = timezone.now() - timedelta(hours=24)
        
        recent_consumptions = ReagentConsumptionLog.objects.filter(
            consumed_at__gte=recent_time
        ).values('reagent_item').annotate(
            last_used=Max('consumed_at')
        ).order_by('-last_used')[:10]
        
        # Get full details for these reagents
        reagent_ids = [item['reagent_item'] for item in recent_consumptions]
        counters = TestKitCounter.objects.filter(
            reagent_item_id__in=reagent_ids
        ).select_related('reagent_item')
        
        # Build response with stock levels
        result = []
        for counter in counters:
            # Find the last used time for this reagent
            last_used = next(
                (item['last_used'] for item in recent_consumptions if item['reagent_item'] == counter.reagent_item_id),
                None
            )
            
            result.append({
                'reagent_name': counter.reagent_item.name,
                'reagent_code': counter.reagent_item.item_code,
                'available_tests': counter.available_tests,
                'minimum_threshold': counter.minimum_threshold,
                'is_low_stock': counter.is_low_stock(),
                'is_out_of_stock': counter.is_out_of_stock(),
                'stock_percentage': (counter.available_tests / counter.minimum_threshold * 100) if counter.minimum_threshold > 0 else 100,
                'last_used': last_used
            })
        
        # Sort by last_used descending
        result.sort(key=lambda x: x['last_used'] if x['last_used'] else timezone.now(), reverse=True)
        
        return Response(result)


class LowStockReagentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for low stock reagent alerts.
    Returns reagents that are low or out of stock.
    """
    serializer_class = LowStockReagentSerializer
    
    def get_queryset(self):
        queryset = TestKitCounter.objects.filter(
            reagent_item__isnull=False
        ).select_related('reagent_item')
        
        # Filter by stock status if provided
        status_filter = self.request.query_params.get('status', None)
        if status_filter == 'low':
            queryset = [q for q in queryset if q.is_low_stock() and not q.is_out_of_stock()]
        elif status_filter == 'out':
            queryset = [q for q in queryset if q.is_out_of_stock()]
        else:
            # Return all low or out of stock
            queryset = [q for q in queryset if q.is_low_stock() or q.is_out_of_stock()]
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def count(self, request):
        """Get count of low/out of stock reagents"""
        all_counters = TestKitCounter.objects.filter(reagent_item__isnull=False)
        low_stock = sum(1 for c in all_counters if c.is_low_stock() and not c.is_out_of_stock())
        out_of_stock = sum(1 for c in all_counters if c.is_out_of_stock())
        
        return Response({
            'low_stock': low_stock,
            'out_of_stock': out_of_stock,
            'total_alerts': low_stock + out_of_stock
        })
