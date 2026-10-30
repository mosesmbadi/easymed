"""
A walk-in at the lab, and a standalone lab that has no triage or doctor.

The walk-in has to land in exactly the state a doctor's lab order leaves --
on the lab queue, with a request per profile, a panel per test and an invoice
line per test -- or every screen after it would need a special case.
"""
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from authperms.models import Group, Permission
from billing.models import InvoiceItem, PaymentMode
from company.models import Company
from inventory.models import Item
from inventory.services import stock as stock_service
from laboratory.models import (
    LabTestPanel, LabTestProfile, LabTestRequest, LabTestRequestPanel, Specimen)
from patient.models import AttendanceProcess, Patient

User = get_user_model()

WALK_IN_URL = '/lab/walk-in-requests/'


@pytest.fixture
def cash_mode(db):
    return PaymentMode.objects.create(
        payment_mode='Cash', payment_category='cash', is_default=True)


def make_panel(name, profile, specimen, price=Decimal('300.00')):
    item = Item.objects.create(
        name=name, desc=name, category="Lab Test", units_of_measure="test",
        item_code=f"LAB-{name.upper()}")
    if price is not None:
        stock_service.set_sale_price(item, price)
    return LabTestPanel.objects.create(
        name=name, specimen=specimen, test_profile=profile, item=item)


@pytest.fixture
def blood(db):
    return Specimen.objects.create(name="Blood")


@pytest.fixture
def renal(db):
    return LabTestProfile.objects.create(name="Renal")


@pytest.fixture
def haematology(db):
    return LabTestProfile.objects.create(name="Haematology")


@pytest.fixture
def urea(renal, blood):
    return make_panel("Urea", renal, blood)


@pytest.fixture
def creatinine(renal, blood):
    return make_panel("Creatinine", renal, blood)


@pytest.fixture
def cbc(haematology, blood):
    return make_panel("CBC", haematology, blood, price=Decimal('800.00'))


@pytest.fixture
def lab_tech(db):
    permission = Permission.objects.create(name='CAN_ACCESS_LABORATORY_DASHBOARD')
    group = Group.objects.create(name='LAB_TECH')
    group.permissions.add(permission)
    user = User.objects.create_user(
        email='bench@example.com', password='x', first_name='Bench', last_name='Tech')
    user.group = group
    user.save()
    return user


@pytest.fixture
def lab_client(lab_tech):
    client = APIClient()
    client.force_authenticate(lab_tech)
    return client


def new_patient_payload(**overrides):
    payload = {
        'first_name': 'Wanjiru', 'second_name': 'Kamau', 'gender': 'F',
        'date_of_birth': '1990-04-02', 'phone': '0700000000',
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
def test_walk_in_lands_on_the_lab_queue_like_a_doctors_order(
        lab_client, cash_mode, urea, creatinine, cbc):
    response = lab_client.post(WALK_IN_URL, {
        'new_patient': new_patient_payload(),
        'panels': [urea.id, creatinine.id, cbc.id],
        'referring_doctor': 'Dr. Otieno',
        'referring_facility': 'Kisumu Medical Centre',
    }, format='json')

    assert response.status_code == 201, response.data
    visit = AttendanceProcess.objects.get(id=response.data['id'])
    assert visit.track == 'lab'
    assert visit.patient.first_name == 'Wanjiru'

    # One request per profile, as the doctor's modal makes them.
    requests = LabTestRequest.objects.filter(process=visit.process_test_req)
    assert sorted(r.test_profile.name for r in requests) == ['Haematology', 'Renal']
    assert all(r.referring_doctor == 'Dr. Otieno' for r in requests)
    assert all(r.referring_facility == 'Kisumu Medical Centre' for r in requests)

    panels = LabTestRequestPanel.objects.filter(lab_test_request__in=requests)
    assert panels.count() == 3
    # All three are blood: one draw, one sample.
    assert len({p.patient_sample_id for p in panels}) == 1

    lines = InvoiceItem.objects.filter(invoice=visit.invoice)
    assert sorted(line.item.name for line in lines) == ['CBC', 'Creatinine', 'Urea']
    visit.invoice.refresh_from_db()
    assert visit.invoice.invoice_amount == Decimal('1400.00')


@pytest.mark.django_db
def test_walk_in_for_an_existing_patient_does_not_register_them_again(
        lab_client, cash_mode, urea):
    patient = Patient.objects.create(
        first_name='Juma', second_name='Ali', gender='M', date_of_birth=date(1980, 1, 1))

    response = lab_client.post(
        WALK_IN_URL, {'patient': patient.id, 'panels': [urea.id]}, format='json')

    assert response.status_code == 201, response.data
    assert Patient.objects.count() == 1
    assert AttendanceProcess.objects.get(id=response.data['id']).patient == patient


@pytest.mark.django_db
def test_the_same_test_twice_is_billed_once(lab_client, cash_mode, urea):
    response = lab_client.post(WALK_IN_URL, {
        'new_patient': new_patient_payload(), 'panels': [urea.id, urea.id],
    }, format='json')

    assert response.status_code == 201, response.data
    visit = AttendanceProcess.objects.get(id=response.data['id'])
    assert InvoiceItem.objects.filter(invoice=visit.invoice).count() == 1


@pytest.mark.django_db
def test_an_unpriced_test_is_refused_and_nothing_is_created(
        lab_client, cash_mode, renal, blood, urea):
    unpriced = make_panel("Uric Acid", renal, blood, price=None)

    response = lab_client.post(WALK_IN_URL, {
        'new_patient': new_patient_payload(), 'panels': [urea.id, unpriced.id],
    }, format='json')

    assert response.status_code == 400
    assert 'Uric Acid' in str(response.data)
    assert Patient.objects.count() == 0
    assert AttendanceProcess.objects.count() == 0


@pytest.mark.django_db
def test_patient_must_be_picked_or_registered_not_both(lab_client, cash_mode, urea):
    patient = Patient.objects.create(
        first_name='Juma', second_name='Ali', gender='M', date_of_birth=date(1980, 1, 1))

    both = lab_client.post(WALK_IN_URL, {
        'patient': patient.id, 'new_patient': new_patient_payload(), 'panels': [urea.id],
    }, format='json')
    neither = lab_client.post(WALK_IN_URL, {'panels': [urea.id]}, format='json')

    assert both.status_code == 400
    assert neither.status_code == 400


@pytest.mark.django_db
def test_walk_in_needs_lab_or_reception_access(cash_mode, urea):
    outsider = User.objects.create_user(email='porter@example.com', password='x')
    client = APIClient()
    client.force_authenticate(outsider)

    response = client.post(WALK_IN_URL, {
        'new_patient': new_patient_payload(), 'panels': [urea.id],
    }, format='json')

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# A standalone lab
# ---------------------------------------------------------------------------

@pytest.fixture
def standalone_lab(db):
    return Company.objects.create(
        name='Bench Diagnostics', facility_type=Company.FacilityType.STANDALONE_LAB)


@pytest.mark.django_db
def test_facility_endpoint_tells_any_signed_in_user_what_is_switched_off(
        lab_client, standalone_lab):
    response = lab_client.get('/company/facility/')

    assert response.status_code == 200
    assert response.data['facility_type'] == 'standalone_lab'
    assert {'triage', 'doctor', 'inpatient'} <= set(response.data['disabled_modules'])


@pytest.mark.django_db
def test_a_lab_cannot_send_a_visit_to_triage_or_a_doctor(
        lab_client, standalone_lab, cash_mode, urea):
    created = lab_client.post(WALK_IN_URL, {
        'new_patient': new_patient_payload(), 'panels': [urea.id],
    }, format='json')
    visit_id = created.data['id']

    for track in ('triage', 'doctor'):
        response = lab_client.patch(
            f'/patients/initiate-attendance-process/{visit_id}/', {'track': track}, format='json')
        assert response.status_code == 400, track

    assert AttendanceProcess.objects.get(id=visit_id).track == 'lab'


@pytest.mark.django_db
def test_a_lab_cannot_record_triage(lab_client, standalone_lab):
    response = lab_client.post('/patients/triage/', {'temperature': 37}, format='json')

    assert response.status_code == 403


@pytest.mark.django_db
def test_a_hospital_keeps_every_module(lab_client, db):
    Company.objects.create(name='General Hospital')

    response = lab_client.get('/company/facility/')

    assert response.data['facility_type'] == 'hospital'
    assert response.data['disabled_modules'] == []


@pytest.mark.django_db
def test_the_platform_sets_the_facility_type_not_the_tenant(standalone_lab, admin_user):
    client = APIClient()
    client.force_authenticate(admin_user)

    client.patch(f'/company/company/{standalone_lab.id}/', {'facility_type': 'hospital'}, format='json')

    standalone_lab.refresh_from_db()
    assert standalone_lab.facility_type == 'standalone_lab'


@pytest.mark.django_db
def test_the_lab_can_find_a_returning_patient(lab_client):
    Patient.objects.create(
        first_name='Juma', second_name='Ali', gender='M', date_of_birth=date(1980, 1, 1))
    Patient.objects.create(
        first_name='Wanjiru', second_name='Kamau', gender='F', date_of_birth=date(1990, 1, 1))

    response = lab_client.get('/lab/walk-in-requests/patients/', {'search': 'juma ali'})

    assert response.status_code == 200
    assert [p['name'] for p in response.data] == ['Juma Ali']


@pytest.mark.django_db
def test_the_walk_in_screen_can_open_on_a_known_patient(lab_client):
    juma = Patient.objects.create(
        first_name='Juma', second_name='Ali', gender='M', date_of_birth=date(1980, 1, 1))

    response = lab_client.get('/lab/walk-in-requests/patients/', {'id': juma.id})

    assert response.status_code == 200
    assert [p['id'] for p in response.data] == [juma.id]
    assert lab_client.get('/lab/walk-in-requests/patients/', {'id': 'x'}).data == []
