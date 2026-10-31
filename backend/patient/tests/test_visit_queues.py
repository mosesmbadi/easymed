"""
Each queue asks the server for its own visits, a page at a time, instead of
downloading every visit ever recorded and filtering in the browser.
"""
import pytest
from rest_framework.test import APIClient

from billing.models import InvoiceItem, PaymentMode
from customuser.models import CustomUser
from inventory.models import Department, Item
from inventory.services import stock as stock_service
from patient.models import AttendanceProcess, Patient

URL = '/patients/initiate-attendance-process/'


@pytest.fixture
def staff(db):
    user = CustomUser.objects.create_user(email='reception@example.com', password='x',
                                          role=CustomUser.SYS_ADMIN)
    user.is_superuser = True
    user.save()
    return user


@pytest.fixture
def staff_client(staff):
    client = APIClient()
    client.force_authenticate(staff)
    return client


@pytest.fixture
def visits(staff):
    """One visit per situation a queue has to tell apart."""
    Department.objects.create(name='Lab', is_stock_location=True)
    cash = PaymentMode.objects.create(payment_mode='Cash', payment_category='cash', is_default=True)

    def item(name, category):
        made = Item.objects.create(name=name, desc=name, category=category,
                                   units_of_measure='unit', item_code=name.upper())
        stock_service.set_sale_price(made, 500)
        return made

    consultation = item('Consultation', 'General Appointment')
    malaria = item('Malaria', 'Lab Test')

    def visit(name, track, *lines):
        patient = Patient.objects.create(first_name=name, second_name='Test', gender='F')
        made = AttendanceProcess.objects.create(patient=patient, reason='test', created_by=staff)
        made.track = track
        made.save()
        for line_item, status in lines:
            line = InvoiceItem.objects.create(invoice=made.invoice, item=line_item, payment_mode=cash)
            if status == 'billed':
                line.status = 'billed'
                line.save()
        return made

    return {
        'reception': visit('Reception', 'reception'),
        'triage': visit('Triage', 'triage', (consultation, 'pending')),
        'doctor_paid': visit('DoctorPaid', 'doctor', (consultation, 'billed')),
        'doctor_unpaid': visit('DoctorUnpaid', 'doctor', (consultation, 'pending')),
        'lab_paid': visit('LabPaid', 'lab', (malaria, 'billed')),
        'lab_unpaid': visit('LabUnpaid', 'lab', (malaria, 'pending')),
    }


def ids(response):
    rows = response.data['results'] if isinstance(response.data, dict) else response.data
    return {row['id'] for row in rows}


@pytest.mark.django_db
def test_the_nursing_queue_is_triage_plus_anyone_whose_consultation_is_paid(staff_client, visits):
    response = staff_client.get(URL, {'queue': 'nursing'})

    assert ids(response) == {visits['triage'].id, visits['doctor_paid'].id}


@pytest.mark.django_db
def test_a_nursing_tab_narrows_it_to_one_track(staff_client, visits):
    response = staff_client.get(URL, {'queue': 'nursing', 'track': 'doctor'})

    assert ids(response) == {visits['doctor_paid'].id}


@pytest.mark.django_db
def test_the_lab_sees_only_visits_with_a_billed_test(staff_client, visits):
    response = staff_client.get(URL, {'queue': 'lab_requests', 'track': 'lab'})

    assert ids(response) == {visits['lab_paid'].id}


@pytest.mark.django_db
def test_several_tracks_at_once(staff_client, visits):
    response = staff_client.get(URL, {'track__in': 'reception,triage'})

    assert ids(response) == {visits['reception'].id, visits['triage'].id}


@pytest.mark.django_db
def test_asking_for_a_page_gets_a_page_and_the_total(staff_client, visits):
    first = staff_client.get(URL, {'page': 1, 'page_size': 4})
    second = staff_client.get(URL, {'page': 2, 'page_size': 4})

    assert first.data['count'] == 6 and second.data['count'] == 6
    assert len(first.data['results']) == 4 and len(second.data['results']) == 2
    assert not ids(first) & ids(second)
    # Newest first.
    assert first.data['results'][0]['id'] == visits['lab_unpaid'].id


@pytest.mark.django_db
def test_without_a_page_the_list_comes_back_whole(staff_client, visits):
    response = staff_client.get(URL)

    assert isinstance(response.data, list) and len(response.data) == 6


@pytest.mark.django_db
def test_filters_and_search_still_page(staff_client, visits):
    response = staff_client.get(URL, {'track': 'doctor', 'search': 'DoctorPaid', 'page': 1})

    assert response.data['count'] == 1
    assert ids(response) == {visits['doctor_paid'].id}


@pytest.mark.django_db
def test_track_counts(staff_client, visits):
    response = staff_client.get(URL + 'track-counts/')

    assert response.data == {'reception': 1, 'triage': 1, 'doctor': 2, 'lab': 2}


@pytest.mark.django_db
def test_a_page_of_visits_costs_a_handful_of_queries(staff_client, visits, django_assert_max_num_queries):
    with django_assert_max_num_queries(15):
        staff_client.get(URL, {'page': 1, 'page_size': 50})


# ---------------------------------------------------------------------------
# Visits carry the patient's details; patients and samples page too
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_a_visit_carries_what_clinical_screens_show_about_the_patient(staff_client, visits):
    row = staff_client.get(URL, {'track': 'triage', 'page': 1}).data['results'][0]

    details = row['patient_details']
    assert details['name'] == 'Triage Test'
    assert details['gender'] == 'Female'
    assert details['unique_id'] == visits['triage'].patient.unique_id
    assert details['insurances'] == []


@pytest.mark.django_db
def test_patients_page_and_filter_on_the_server(staff_client, visits):
    from company.models import InsuranceCompany
    clinic = InsuranceCompany.objects.create(name='Clinic', account_type='facility')
    Patient.objects.create(first_name='', second_name='', referred_from=clinic, external_id='CCC 1')

    page = staff_client.get('/patients/patients/', {'page': 1, 'page_size': 4})
    ours = staff_client.get('/patients/patients/', {'referred': 'false', 'page': 1})
    referred = staff_client.get('/patients/patients/', {'referred': 'true', 'page': 1})
    two = list(Patient.objects.values_list('id', flat=True)[:2])
    picked = staff_client.get('/patients/patients/', {'id__in': ','.join(map(str, two))})

    assert page.data['count'] == 7 and len(page.data['results']) == 4
    assert ours.data['count'] == 6
    assert referred.data['count'] == 1
    assert referred.data['results'][0]['display_name'] == 'Clinic CCC 1'
    assert {p['id'] for p in picked.data} == set(two)
    # Without `page`, the whole list, as before.
    assert isinstance(staff_client.get('/patients/patients/').data, list)
