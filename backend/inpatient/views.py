import logging
from io import BytesIO

from django.shortcuts import get_object_or_404
from django.db.models import Prefetch
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse
from django.utils import timezone
from django.template.loader import get_template
from rest_framework import status, viewsets
from rest_framework.response import Response
from django.template.loader import render_to_string
from rest_framework.decorators import action

from weasyprint import HTML


from authperms.permissions import IsDoctorUser, IsSeniorNurseUser
from company.models import Company
from laboratory.models import LabTestRequest, PatientSample
from patient.models import Triage, AttendanceProcess, PrescribedDrug

from .filters import WardFilter, PatientAdmissionFilter
from .models import (Bed, PatientAdmission, PatientDischarge, Ward,
                     WardNurseAssignment)
from .serializers import (BedSerializer, PatientAdmissionSerializer,
                          PatientDischargeSerializer,
                          WardNurseAssignmentSerializer, WardSerializer)


logger = logging.getLogger(__name__)

class PatientAdmissionViewSet(viewsets.ModelViewSet):
    queryset = PatientAdmission.objects.all()
    serializer_class = PatientAdmissionSerializer
    permission_classes = [IsDoctorUser]
    filter_backends = [DjangoFilterBackend] 
    filterset_class = PatientAdmissionFilter

    def get_queryset(self):
        return PatientAdmission.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            bed = serializer.validated_data["bed"]
            bed.status = "occupied"
            bed.save()
            serializer.save(admitted_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"Cannot admit patient": str(e)}, status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'], url_path='generate-summary')
    def download_discharge_summary(self, request, pk=None, admission_pk=None):
        """
        Generate a discharge summary PDF for the specified discharge, including patient details,
        last lab results, prescription, vitals, and type-specific data (referral or cause of death).
        """
        
        try:
            admission = self.get_object()
            if not hasattr(admission, 'discharge'):
                return Response({"error": "No discharge record found."}, status=status.HTTP_404_NOT_FOUND)
            discharge = admission.discharge
            patient = admission.patient

            # Last lab result
            last_lab_request = LabTestRequest.objects.filter(
                process__attendanceprocess__patient=patient
            ).order_by('-requested_on').first()
            lab_results = []
            if last_lab_request:
                samples = PatientSample.objects.filter(lab_test_request=last_lab_request)
                lab_results = [{
                    'test_name': last_lab_request.test_profile.name,
                    'result': sample.result or 'N/A',
                    'specimen': sample.specimen.name,
                    'date': sample.created_on
                } for sample in samples]

            # Last prescription
            last_attendance = AttendanceProcess.objects.filter(
                patient=patient
            ).order_by('-created_at').first()
            prescription_details = []
            if last_attendance and last_attendance.prescription:
                prescribed_drugs = PrescribedDrug.objects.filter(prescription=last_attendance.prescription)
                prescription_details = [{
                    'medication': drug.item.name,
                    'dosage': drug.dosage,
                    'frequency': drug.frequency,
                    'duration': drug.duration,
                    'prescribed_by': last_attendance.prescription.created_by.get_fullname() if last_attendance.prescription.created_by else 'N/A',
                    'date': last_attendance.prescription.date_created
                } for drug in prescribed_drugs]

            # Latest triage vitals
            last_triage = Triage.objects.filter(
                attendanceprocess__patient=patient
            ).order_by('-date_created').first()
            triage_data = {}
            if last_triage:
                triage_data = {
                    'blood_pressure': f"{last_triage.systolic}/{last_triage.diastolic}" if last_triage.systolic and last_triage.diastolic else 'N/A',
                    'pulse': last_triage.pulse,
                    'temperature': last_triage.temperature,
                    'recorded_at': last_triage.date_created
                }
            context = {
                'patient': {
                    'name': f"{patient.first_name} {patient.second_name}",
                    'age': patient.age,
                    'gender': patient.get_gender_display(),
                    'unique_id': patient.unique_id
                },
                'admission': {
                    'id': admission.admission_id,
                    'reason': admission.reason_for_admission,
                    'admitted_at': admission.admitted_at,
                    'ward': admission.ward.name if admission.ward else 'N/A',
                    'bed': admission.bed.bed_number if admission.bed else 'N/A'
                },
                'discharge': {
                    'type': discharge.get_discharge_types_display(),
                    'notes': discharge.discharge_notes or 'N/A',
                    'discharged_at': discharge.discharged_at,
                    'discharged_by': discharge.discharged_by.get_fullname() if discharge.discharged_by else 'N/A'
                },
                'lab_results': lab_results,
                'prescription': prescription_details,
                'triage': triage_data
            }

            # Type-specific data
            if discharge.discharge_types == 'referral' and discharge.referral:
                context['referral'] = {
                    'service': discharge.referral.get_service_display(),
                    'note': discharge.referral.note,
                    'email': discharge.referral.email,
                    'referred_by': discharge.referral.referred_by.get_fullname() if discharge.referral.referred_by else 'N/A'
                }
            if discharge.discharge_types == 'deceased':
                context['cause_of_death': discharge.cause_of_death or 'Not specified']

            # Render template
            html_string = render_to_string('inpatient/discharge_summary.html', context)
            html = HTML(string=html_string)
            pdf_file = BytesIO()
            html.write_pdf(pdf_file)

            # Return PDF
            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="discharge_summary_{admission.admission_id}.pdf"'
            response.write(pdf_file.getvalue())
            return response

        except Exception as e:
            logger.error(f"Failed to generate discharge summary: {str(e)}", exc_info=True)
            return Response({"error": f"Failed to generate discharge summary: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        serializer.save(referred_by=self.request.user)

    
class WardNurseAssignmentViewSet(viewsets.ModelViewSet):
    queryset = WardNurseAssignment.objects.all()
    serializer_class = WardNurseAssignmentSerializer
    permission_classes = [IsSeniorNurseUser]

    def get_queryset(self):
        user = self.request.user
        if user:
            return self.queryset.filter(assigned_by=user)
        return self.queryset.none()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        instance = self.get_object() 
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            instance.assigned_by = request.user  
            instance.assigned_at = timezone.now()
            instance.save()
            self.perform_update(serializer)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.all()
    serializer_class = WardSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = WardFilter

    def update(self, request, *args, **kwargs):
        instance = self.get_object() 
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_update(serializer)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BedViewSet(viewsets.ModelViewSet):
    serializer_class = BedSerializer

    def get_queryset(self):
        ward_id = self.kwargs.get('ward_pk')
        queryset = Bed.objects.select_related('ward').prefetch_related(
            Prefetch(
                'current_patient',
                queryset=PatientAdmission.objects.filter(discharge__isnull=True).select_related('patient', 'admitted_by')
            )
        )
        if ward_id:
            return queryset.filter(ward_id=ward_id)
        return queryset

    def create(self, request, *args, **kwargs):
        ward = get_object_or_404(Ward, pk=kwargs.get("ward_pk"))
        existing_beds_count = Bed.objects.filter(ward=ward).count()
        if existing_beds_count >= ward.capacity:
            return Response(
                {"error": f"Ward {ward.name} has reached its capacity of {ward.capacity} beds."},
                status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save(ward=ward)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"Cannot create bed": str(e)}, status=status.HTTP_400_BAD_REQUEST
                )


class PatientDischargeViewset(viewsets.ModelViewSet):
    queryset = PatientDischarge.objects.all()
    serializer_class = PatientDischargeSerializer
    permission_classes = [IsDoctorUser]

    def create(self, request, *args, **kwargs):
        """
        Create a discharge record for a patient admission.
        """
        admission = get_object_or_404(PatientAdmission, pk=kwargs.get("admission_pk"))
        if hasattr(admission, 'discharge'):
            return Response({"error": "Patient is already discharged"},  status=status.HTTP_400_BAD_REQUEST)
        try:
            serializer = self.get_serializer(data=request.data, context={'request': request, 'admission': admission})
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Failed to discharge patient: {str(e)}", exc_info=True)
            return Response({"error": f"Failed to discharge patient: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


def download_discharge_summary(request, discharge_id):
    """
    Generate a discharge summary PDF for the specified discharge, including patient details,
    last lab results, prescription, vitals, and type-specific data (referral or cause of death).
    """
    
    try:
        discharge = get_object_or_404(PatientDischarge, pk=discharge_id)
        admission = discharge.admission
        patient = admission.patient
        company = Company.objects.first()

        # Last lab result
        last_lab_request = LabTestRequest.objects.filter(
            process__attendanceprocess__patient=patient
        ).order_by('-requested_on').first()
        lab_results = []
        if last_lab_request:
            samples = PatientSample.objects.filter(lab_test_request=last_lab_request)
            lab_results = [{
                'test_name': last_lab_request.test_profile.name,
                'result': sample.result or 'N/A',
                'specimen': sample.specimen.name,
                'date': sample.created_on
            } for sample in samples]

        # Last prescription
        last_attendance = AttendanceProcess.objects.filter(
            patient=patient
        ).order_by('-created_at').first()
        prescription_details = []
        if last_attendance and last_attendance.prescription:
            prescribed_drugs = PrescribedDrug.objects.filter(prescription=last_attendance.prescription)
            prescription_details = [{
                'medication': drug.item.name,
                'dosage': drug.dosage,
                'frequency': drug.frequency,
                'duration': drug.duration,
                'prescribed_by': last_attendance.prescription.created_by.get_fullname() if last_attendance.prescription.created_by else 'N/A',
                'date': last_attendance.prescription.date_created
            } for drug in prescribed_drugs]

        # Latest triage vitals
        last_triage = Triage.objects.filter(
            attendanceprocess__patient=patient
        ).order_by('-date_created').first()
        triage_data = {}
        if last_triage:
            triage_data = {
                'blood_pressure': f"{last_triage.systolic}/{last_triage.diastolic}" if last_triage.systolic and last_triage.diastolic else 'N/A',
                'pulse': last_triage.pulse,
                'temperature': last_triage.temperature,
                'recorded_at': last_triage.date_created
            }

        company_logo_url = request.build_absolute_uri(company.logo.url) if company.logo else None

        # Prepare context
        context = {
            'company': {
            'name': company.name,
            'address1': company.address1,
            'phone1': company.phone1,
            'email1': company.email1,
            'logo_url': company_logo_url
            },
            'patient': {
                'name': f"{patient.first_name} {patient.second_name}",
                'age': patient.age,
                'gender': patient.get_gender_display(),
                'unique_id': patient.unique_id
            },
            'admission': {
                'id': admission.admission_id,
                'reason': admission.reason_for_admission,
                'admitted_at': admission.admitted_at,
                'ward': admission.ward.name if admission.ward else 'N/A',
                'bed': admission.bed.bed_number if admission.bed else 'N/A'
            },
            'discharge': {
                'type': discharge.get_discharge_types_display(),
                'notes': discharge.discharge_notes or 'N/A',
                'discharged_at': discharge.discharged_at,
                'discharged_by': discharge.discharged_by.get_fullname() if discharge.discharged_by else 'N/A'
            },
            'lab_results': lab_results,
            'prescription': prescription_details,
            'triage': triage_data
        }

        # Type-specific data
        if discharge.discharge_types == 'referral' and discharge.referral:
            context['referral'] = {
                'service': discharge.referral.get_service_display(),
                'note': discharge.referral.note,
                'email': discharge.referral.email,
                'referred_by': discharge.referral.referred_by.get_fullname() if discharge.referral.referred_by else 'N/A'
            }
       

        html_template = get_template('discharge_summary.html').render(context)
        pdf_file = HTML(string=html_template).write_pdf()
        response = HttpResponse(pdf_file, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="discharge_summary_{admission.admission_id}.pdf"'
        return response

    except Exception as e:
        logger.error(f"Failed to generate discharge summary: {str(e)}", exc_info=True)
        return HttpResponse(f"Failed to generate discharge summary: {str(e)}", status=500)
        