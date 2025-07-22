import json
import pytest
from django.urls import reverse
from rest_framework import status
from inpatient.models import PatientAdmission, PatientDischarge, Bed


@pytest.mark.django_db
def test_admit_patient_authenticated_doctor(authenticated_doctor_client, doctor, patient, ward, bed):
    """
    Test that an authenticated doctor can admit a patient and the bed is marked as occupied.
    """
    url = reverse('inpatient:patient-admission-list')  
    payload = {
        'patient': patient.id,
        'ward': ward.id,
        'bed': bed.id,
        'reason_for_admission': 'Fever'
    }
    response = authenticated_doctor_client.post(url, payload, format='json')
    
    assert response.status_code == status.HTTP_201_CREATED
    assert PatientAdmission.objects.count() == 1
    admission = PatientAdmission.objects.first()
    assert admission.patient == patient
    assert admission.ward == ward
    assert admission.bed == bed
    assert admission.reason_for_admission == 'Fever'
    assert admission.admitted_by == doctor

    bed.refresh_from_db()
    assert bed.status == 'occupied'

@pytest.mark.django_db
def test_admit_patient_unauthenticated(client, patient, ward, bed):
    """
    Test that an unauthenticated user cannot admit a patient.
    """
    url = reverse('inpatient:patient-admission-list')
    payload = {
        'patient': patient.id,
        'ward': ward.id,
        'bed': bed.id,
        'reason_for_admission': 'Fever'
    }
    response = client.post(url, payload, format='json')
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert PatientAdmission.objects.count() == 0

@pytest.mark.django_db
def test_admit_patient_non_doctor(authenticated_client, patient, ward, bed):
    """
    Test that a non-doctor (e.g., patient user) cannot admit a patient.
    """
    url = reverse('inpatient:patient-admission-list')
    payload = {
        'patient': patient.id,
        'ward': ward.id,
        'bed': bed.id,
        'reason_for_admission': 'Fever'
    }
    response = authenticated_client.post(url, payload, format='json')
    
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert PatientAdmission.objects.count() == 0

@pytest.mark.django_db
def test_admit_patient_occupied_bed(authenticated_doctor_client, patient, ward, occupied_bed):
    """
    Test that admitting a patient to an occupied bed fails.
    """
    url = reverse('inpatient:patient-admission-list')
    payload = {
        'patient': patient.id,
        'ward': ward.id,
        'bed': occupied_bed.id,
        'reason_for_admission': 'Fever'
    }
    response = authenticated_doctor_client.post(url, payload, format='json')
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'bed' in response.data
    assert response.data['bed'][0] == 'This bed is already occupied.'
    assert PatientAdmission.objects.count() == 0


@pytest.mark.django_db
def test_discharge_patient_normal_authenticated_doctor(authenticated_doctor_client, doctor, patient_admission):
    """
    Test that an authenticated doctor can discharge a patient with normal discharge type.
    """
    url = reverse('discharge-list', kwargs={'admission_pk': patient_admission.id})
    payload = {
        'discharge_types': 'normal',
        'discharge_notes': 'Patient recovered, follow up in 2 weeks.',
    }
    response = authenticated_doctor_client.post(url, payload, format='json')
    
    assert response.status_code == status.HTTP_201_CREATED
    assert PatientDischarge.objects.count() == 1
    discharge = PatientDischarge.objects.first()
    assert discharge.admission == patient_admission
    assert discharge.discharged_by == doctor
    assert discharge.discharge_types == 'normal'
    assert discharge.discharge_notes == 'Patient recovered, follow up in 2 weeks.'
    assert discharge.referral is None

    patient_admission.refresh_from_db()
    assert patient_admission.bed is None

@pytest.mark.django_db
def test_discharge_patient_normal_non_doctor(authenticated_client, patient_admission):
    """
    Test that a non-doctor (e.g., patient user) cannot discharge a patient with normal discharge type.
    """
    url = reverse('discharge-list', kwargs={'admission_pk': patient_admission.id})
    payload = {
        'discharge_types': 'normal',
        'discharge_notes': 'Patient recovered, follow up in 2 weeks.',
    }
    response = authenticated_client.post(url, payload, format='json')
    
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert PatientDischarge.objects.count() == 0

@pytest.mark.django_db
def test_discharge_patient_normal_already_discharged(authenticated_doctor_client, patient_discharge_normal):
    """
    Test that discharging an already discharged patient (normal) fails.
    """
    admission = patient_discharge_normal.admission
    url = reverse('discharge-list', kwargs={'admission_pk': admission.id})
    payload = {
        'discharge_types': 'normal',
        'discharge_notes': 'Trying to discharge again',
    }
    response = authenticated_doctor_client.post(
        url,
        data=json.dumps(payload),
        content_type='application/json'
    )    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'error' in response.data
    assert response.data['error'] == 'Patient is already discharged'
    assert PatientDischarge.objects.count() == 1

@pytest.mark.django_db
def test_discharge_patient_referral_authenticated_doctor(authenticated_doctor_client, doctor, patient_admission):
    """
    Test that an authenticated doctor can discharge a patient with referral discharge type.
    """
    url = reverse('discharge-list', kwargs={'admission_pk': patient_admission.id})
    payload = {
        'discharge_types': 'referral',
        'discharge_notes': 'Transfer for cardiology care.',
        'referral_data': {
            'service': 'cardiologist',
            'note': 'Urgent cardiac evaluation required.',
            'email': 'contact@cityhospital.com'
        },
    }
    response = authenticated_doctor_client.post(url, payload, format='json')
    
    assert response.status_code == status.HTTP_201_CREATED
    assert PatientDischarge.objects.count() == 1
    discharge = PatientDischarge.objects.first()
    assert discharge.admission == patient_admission
    assert discharge.discharged_by == doctor
    assert discharge.discharge_types == 'referral'
    assert discharge.discharge_notes == 'Transfer for cardiology care.'
    assert discharge.referral is not None

    patient_admission.refresh_from_db()
    assert patient_admission.bed is None


@pytest.mark.django_db
def test_discharge_patient_deceased_authenticated_doctor(authenticated_doctor_client, doctor, patient_admission):
    """
    Test that an authenticated doctor can discharge a patient with deceased discharge type.
    """
    url = reverse('discharge-list', kwargs={'admission_pk': patient_admission.id})
    payload = {
        'discharge_types': 'deceased',
        'discharge_notes': 'Patient passed away.',
    }
    response = authenticated_doctor_client.post(url, payload, format='json')
    
    assert response.status_code == status.HTTP_201_CREATED
    assert PatientDischarge.objects.count() == 1
    discharge = PatientDischarge.objects.first()
    assert discharge.admission == patient_admission
    assert discharge.discharged_by == doctor
    assert discharge.discharge_types == 'deceased'
    assert discharge.discharge_notes == 'Patient passed away.'
    assert discharge.referral is None

    patient_admission.refresh_from_db()
    assert patient_admission.bed is None

@pytest.mark.django_db
def test_discharge_patient_referral_missing_data(authenticated_doctor_client, patient_admission):
    """
    Test that referral discharge fails without referral_data.
    """
    url = reverse('discharge-list', kwargs={'admission_pk': patient_admission.id})
    payload = {
        'discharge_types': 'referral',
        'discharge_notes': 'Transfer for cardiology care.',
    }
    response = authenticated_doctor_client.post(url, payload, format='json')
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'Referral details are required' in str(response.data)
    assert PatientDischarge.objects.count() == 0

