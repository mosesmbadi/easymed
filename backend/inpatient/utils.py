from io import BytesIO
from django.http import HttpResponse
from django.template.loader import render_to_string, get_template
from weasyprint import HTML
from .models import PatientAdmission, PatientDischarge
from company.models import Company
from laboratory.models import LabTestRequest, PatientSample
from patient.models import AttendanceProcess, PrescribedDrug, Triage

def generate_discharge_summary_pdf(admission_id, request):
    admission = PatientAdmission.objects.get(admission_id=admission_id)
    if not hasattr(admission, 'discharge'):
        return None, {"error": "No discharge record found."}
    discharge = admission.discharge
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

    company_logo_url = request.build_absolute_uri(company.logo.url) if company and company.logo else None

    context = {
        'company': {
            'name': company.name if company else '',
            'address1': company.address1 if company else '',
            'phone1': company.phone1 if company else '',
            'email1': company.email1 if company else '',
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

    html_string = render_to_string('discharge_summary.html', context)
    html = HTML(string=html_string)
    pdf_file = BytesIO()
    html.write_pdf(pdf_file)
    pdf_file.seek(0)
    return pdf_file, None
