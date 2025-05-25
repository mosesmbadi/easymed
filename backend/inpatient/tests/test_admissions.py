import pytest
from django.urls import reverse
from rest_framework import status
from inpatient.models import PatientAdmission, PatientDischarge, Bed

# Test patient admission functionality
@pytest.mark.django_db
def test_admit_patient_authenticated_doctor(authenticated_doctor_client, doctor, patient, ward, bed):
    """
    Test that an authenticated doctor can admit a patient and the bed is marked as occupied.
    """
    url = reverse('patient-admission-list')  
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
    url = reverse('patient-admission-list')
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
    url = reverse('patient-admission-list')
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
    url = reverse('patient-admission-list')
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
def test_discharge_patient_authenticated_doctor(authenticated_doctor_client, doctor, patient_admission):
    """
    Test that an authenticated doctor can discharge a patient and the bed is freed.
    """
    url = reverse('patient-admission-discharge-list', kwargs={'admission_pk': patient_admission.id})
    payload = {
        'discharge_notes': 'Patient recovered successfully'
    }
    response = authenticated_doctor_client.post(url, payload, format='json')
    
    assert response.status_code == status.HTTP_201_CREATED
    assert PatientDischarge.objects.count() == 1
    discharge = PatientDischarge.objects.first()
    assert discharge.admission == patient_admission
    assert discharge.discharged_by == doctor
    assert discharge.discharge_notes == 'Patient recovered successfully'

    patient_admission.refresh_from_db()
    bed = patient_admission.bed
    bed.refresh_from_db()
    assert bed.status == 'available'

@pytest.mark.django_db
def test_discharge_patient_unauthenticated(client, patient_admission):
    """
    Test that an unauthenticated user cannot discharge a patient.
    """
    url = reverse('patient-admission-discharge-list', kwargs={'admission_pk': patient_admission.id})
    payload = {
        'discharge_notes': 'Patient recovered successfully'
    }
    response = client.post(url, payload, format='json')
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert PatientDischarge.objects.count() == 0

@pytest.mark.django_db
def test_discharge_patient_non_doctor(authenticated_client, patient_admission):
    """
    Test that a non-doctor (e.g., patient user) cannot discharge a patient.
    """
    url = reverse('patient-admission-discharge-list', kwargs={'admission_pk': patient_admission.id})
    payload = {
        'discharge_notes': 'Patient recovered successfully'
    }
    response = authenticated_client.post(url, payload, format='json')
    
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert PatientDischarge.objects.count() == 0

@pytest.mark.django_db
def test_discharge_already_discharged_patient(authenticated_doctor_client, patient_discharge):
    """
    Test that discharging an already discharged patient fails.
    """
    admission = patient_discharge.admission
    url = reverse('patient-admission-discharge-list', kwargs={'admission_pk': admission.id})
    payload = {
        'discharge_notes': 'Trying to discharge again'
    }
    response = authenticated_doctor_client.post(url, payload, format='json')
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert PatientDischarge.objects.count() == 1