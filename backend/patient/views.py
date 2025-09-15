import os
from datetime import datetime
from weasyprint import HTML
from django.http import HttpResponse, HttpResponseBadRequest
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.template.loader import render_to_string
from rest_framework import viewsets, status
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from drf_spectacular.utils import (extend_schema)


from authperms.permissions import (IsReceptionistUser)
from laboratory.models import LabTestRequest
from company.models import Company
from customuser.models import CustomUser
from .models import (
    ContactDetails,
    Patient,
    NextOfKin,
    Prescription,
    PrescribedDrug,
    PublicAppointment,
    Consultation,
    Referral,
    Triage,
    AttendanceProcess,
)
from .serializers import (
    ContactDetailsSerializer,
    PatientSerializer,
    NextOfKinSerializer,
    PrescriptionSerializer,
    PrescribedDrugSerializer,
    PublicAppointmentSerializer,
    ConsultationSerializer,
    ReferralSerializer,
    TriageSerializer,
    AttendanceProcessSerializer,
)
from .filters import (
    AttendanceProcessFilter,
    PatientFilter,
    ConsultationFilter,
    PatientFilterSearch,
    TriageFilter,
    PrescriptionFilter,
    PrescribedDrugFilter
)


class ConsultationViewSet(viewsets.ModelViewSet):
    queryset = Consultation.objects.all()
    serializer_class = ConsultationSerializer
    filter_backends = (DjangoFilterBackend,)
    filterset_class = ConsultationFilter
    

class ContactDetailsViewSet(viewsets.ModelViewSet):
    queryset = ContactDetails.objects.all()
    serializer_class = ContactDetailsSerializer


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by('-id')
    serializer_class = PatientSerializer
    filterset_class = PatientFilter
    permission_classes = (IsReceptionistUser,)
    filter_backends = [PatientFilterSearch, DjangoFilterBackend]
    search_fields = [
        'unique_id', 'first_name', 'email', 'phone',
        'second_name', 'insurances__name', 'next_of_kin__first_name', 'next_of_kin__second_name',
        'next_of_kin__contacts__tel_no', 'next_of_kin__contacts__email_address',
    ]



class PatientByUserIdAPIView(APIView):
    def get_object(self, user_id: int):
        try:
            return CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return None

    @extend_schema(
        responses=PatientSerializer,
    )
    def get(self, request: Request, user_id: int = None, *args, **kwargs):
        user = self.get_object(user_id)

        if user is None:
            return Response({"error_message": f"user id {user_id} doesn't exist"})

        patient = Patient.objects.filter(user_id__pk=user.pk)
        if not patient.exists():
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = PatientSerializer(patient.first())
        return Response(serializer.data, status=status.HTTP_200_OK)


class PrescribedDrugByPatientIdAPIView(APIView):
    def get_prescribed_drugs_by_patient(self, patient_id: int):
        try:
            patient = get_object_or_404(Patient, id=patient_id)
            attendance_processes = AttendanceProcess.objects.filter(patient=patient)
            prescriptions = Prescription.objects.filter(attendanceprocess__in=attendance_processes)
            prescribed_drugs = PrescribedDrug.objects.filter(prescription__in=prescriptions)
            return prescribed_drugs
        except Patient.DoesNotExist:
            return None

    @extend_schema(
        responses=PrescribedDrugSerializer,
    )
    def get(self, request: Request, patient_id: int, *args, **kwargs):
        prescribed_drugs = self.get_prescribed_drugs_by_patient(patient_id)
        if prescribed_drugs is None:
            return Response({"error_message": f"Patient ID {patient_id} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)
        
        if not prescribed_drugs.exists():
            return Response({"error_message": "No prescribed drugs found for the given patient"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = PrescribedDrugSerializer(prescribed_drugs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PrescribedDrugByPrescriptionViewSet(viewsets.ModelViewSet):
    '''
    Get prescribed drugs by prescription ID
    '''
    queryset = PrescribedDrug.objects.all()
    serializer_class = PrescribedDrugSerializer

    # Override the queryset to filter by prescription_id
    def get_queryset(self):
        prescription_id = self.kwargs.get('prescription_id')
        print(f"Prescription ID: {prescription_id}")
        return PrescribedDrug.objects.filter(prescription__id=prescription_id)


class NextOfKinViewSet(viewsets.ModelViewSet):
    queryset = NextOfKin.objects.all()
    serializer_class = NextOfKinSerializer

        
class ConsultationViewSet(viewsets.ModelViewSet):
    queryset = Consultation.objects.all()
    serializer_class = ConsultationSerializer


class PublicAppointmentViewSet(viewsets.ModelViewSet):
    queryset = PublicAppointment.objects.all()
    serializer_class = PublicAppointmentSerializer


class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer
    filter_backends = (DjangoFilterBackend,)
    filterset_class = PrescriptionFilter


class PrescribedDrugViewSet(viewsets.ModelViewSet):
    queryset = PrescribedDrug.objects.all()
    serializer_class = PrescribedDrugSerializer
    filter_backends = (DjangoFilterBackend,)
    filterset_class = PrescribedDrugFilter


class ReferralViewSet(viewsets.ModelViewSet):
    queryset = Referral.objects.all()
    serializer_class = ReferralSerializer


class TriageViewSet(viewsets.ModelViewSet):
    queryset = Triage.objects.all()
    serializer_class = TriageSerializer
    filter_backends = (DjangoFilterBackend,)
    filterset_class = TriageFilter


class AttendanceProcessViewSet(viewsets.ModelViewSet):
    queryset = AttendanceProcess.objects.all().order_by('-id')
    serializer_class = AttendanceProcessSerializer
    filter_backends = [AttendanceProcessFilter, DjangoFilterBackend]
    filterset_fields = ['track']
    search_fields = [
        'patient__first_name', 'patient__second_name', 'track_number', 'patient_number',
        'doctor__first_name', 'doctor__last_name',
        'lab_tech__first_name', 'lab_tech__last_name',
        'pharmacist__first_name', 'pharmacist__last_name', "reason", 
        "clinical_note__diagnosis", "clinical_note__doctors_note", "clinical_note__signs_and_symptoms",
        "process_test_req__attendace_test_requests__test_profile__name",
        "prescription__attendance_prescribed_drugs__item__name",
    ]
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# VIEWS FOR REPORTS GENERATION WILL GO HERE
def download_prescription_pdf(request, prescription_id):
    '''
    This view gets the geneated pdf and downloads it locally
    pdf accessed here http://127.0.0.1:8080/patients/reports/download_prescription_pdf/26/
    '''
    prescription = get_object_or_404(Prescription, pk=prescription_id)
    prescribed_drugs = PrescribedDrug.objects.filter(prescription=prescription)
    company = Company.objects.first()

    # Render the HTML template with the context
    html = render_to_string('prescription.html', {
        'prescription': prescription,
        'prescribed_drugs': prescribed_drugs,
        'company': company
        })

    # Use WeasyPrint to generate the PDF from the rendered HTML
    pdf_file = HTML(string=html).write_pdf()

    # Create the HTTP response with the PDF file
    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{prescription.id}.pdf"'
    return response


def generate_lab_tests_report(request):
    '''
    This will give you all lab test requests by a given doctor and date range
    http://127.0.0.1:8080/patients/reports/lab-tests/?doctor_id=1&start_date=2024-08-01&end_date=2024-08-31

    If no date range is specified it will get you a report for all lab test requests
    http://127.0.0.1:8080/patients/reports/lab-tests/?doctor_id=2
    '''
    doctor_id = request.GET.get('doctor_id')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    company= Company.objects.first()

    if not doctor_id:
        return HttpResponseBadRequest("Missing doctor_id parameter.")
    
    # Handle date range
    if start_date and end_date:
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
            end_date = end_date.replace(hour=23, minute=59, second=59)
        except ValueError:
            return HttpResponseBadRequest("Invalid date format. Please use YYYY-MM-DD.")
    else:
        # If no date range is provided, set start_date and end_date to None
        start_date = None
        end_date = None

    # Get lab test requests by doctor and date range
    if start_date and end_date:
        lab_test_requests = LabTestRequest.objects.filter(
            requested_by_id=doctor_id,
            created_on__range=(start_date.date(), end_date.date())
        ).order_by('created_on')
    else:
        lab_test_requests = LabTestRequest.objects.filter(
            requested_by_id=doctor_id
        ).order_by('created_on')

    if not lab_test_requests.exists():
        return HttpResponse("No lab test requests found for the given doctor.", content_type="text/plain")

    # Render the lab test requests to a template
    html_content = render_to_string('lab_tests_report.html', {'lab_test_requests': lab_test_requests, 'company': company})
    html = HTML(string=html_content)

    try:
        pdf_bytes = html.write_pdf()

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="lab_tests_report_{doctor_id}.pdf"'
        return response
    except Exception as e:
        return HttpResponseBadRequest(f"Error generating PDF: {str(e)}")
