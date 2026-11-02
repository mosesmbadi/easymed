"""
Removing a login, or someone who left, must not take records with it. Patients
with billing history and staff who signed records can't be deleted at all.
"""

import pytest

from django.db.models import ProtectedError

from billing.models import Invoice
from utils.exceptions import api_exception_handler


def test_removing_login_keeps_patient(patient):
    patient.user.delete()

    patient.refresh_from_db()
    assert patient.user_id is None


def test_patient_with_invoice_cannot_be_deleted(patient):
    Invoice.objects.create(patient=patient, invoice_amount=0)

    with pytest.raises(ProtectedError):
        patient.delete()


def test_staff_with_records_cannot_be_deleted(db, requisition):
    with pytest.raises(ProtectedError):
        requisition.requested_by.delete()


def test_api_delete_deactivates_user(db, authenticated_admin_client, user):
    response = authenticated_admin_client.delete(f'/users/users/{user.id}/')

    assert response.status_code == 204
    user.refresh_from_db()
    assert user.is_active is False


def test_protected_delete_is_a_conflict():
    response = api_exception_handler(ProtectedError('protected', set()), {})

    assert response.status_code == 409
