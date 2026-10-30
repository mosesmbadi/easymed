import pytest
from django.urls import reverse
from rest_framework import status
from inpatient.models import WardNurseAssignment
from django.contrib.auth import get_user_model
from customuser.models import CustomUser
from inpatient.models import Ward

User = get_user_model()

def test_senior_nurse_can_assign_nurse_to_ward(authenticated_senior_nurse_client, senior_nurse, nurse, ward):
    url = reverse('inpatient:wardnurseassignment-list')
    data = {
        "ward": ward.id,
        "nurse": nurse.id
    }
    response = authenticated_senior_nurse_client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_201_CREATED
    assert WardNurseAssignment.objects.count() == 1
    assignment = WardNurseAssignment.objects.first()
    assert assignment.ward == ward
    assert assignment.nurse == nurse
    assert assignment.assigned_by == senior_nurse
    assert response.data["ward"] == ward.name
    assert response.data["nurse"] == nurse.get_fullname()
    assert response.data["assigned_by"] == senior_nurse.get_fullname()

def test_regular_nurse_cannot_assign_nurse_to_ward(authenticated_nurse_client, nurse, ward):
    url = reverse('inpatient:wardnurseassignment-list')
    data = {
        "ward": ward.id,
        "nurse": nurse.id
    }
    response = authenticated_nurse_client.post(url, data, format='json')
    
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert WardNurseAssignment.objects.count() == 0

def test_senior_nurse_can_only_see_their_assignments(authenticated_senior_nurse_client, senior_nurse, nurse, ward):
    WardNurseAssignment.objects.create(
        ward=ward,
        nurse=nurse,
        assigned_by=senior_nurse
    )

    senior_nurse2 = User.objects.create_user(
        email="seniornurse2@example.com",
        password="password123",
        first_name="Senior",
        last_name="Nurse2",
        role=CustomUser.SENIOR_NURSE,
        is_staff=True
    )
    nurse2 = User.objects.create_user(
        email="nurse2@example.com",
        password="password123",
        first_name="Nurse",
        last_name="Two",
        role=CustomUser.NURSE,
        is_staff=True
    )
    ward2 = Ward.objects.create(
        name="Ward B",
        ward_type="maternity",
        gender="male",
        capacity=10
    )
    WardNurseAssignment.objects.create(
        ward=ward2,
        nurse=nurse2,
        assigned_by=senior_nurse2
    )

    url = reverse('inpatient:wardnurseassignment-list')
    response = authenticated_senior_nurse_client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]["ward"] == ward.name
    assert response.data[0]["nurse"] == nurse.get_fullname()