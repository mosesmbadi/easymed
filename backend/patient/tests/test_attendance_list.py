"""
The visit list is paged, filtered by track on the server, and costs the same
handful of queries however many visits there are.

It used to return every visit ever recorded, with several queries per visit,
on every call from about ten screens. As the history grew so did the API
process, until the kernel killed it and took the server down with it.
"""
from decimal import Decimal

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from billing.models import InvoiceItem, PaymentMode
from company.models import InsuranceCompany
from inventory.models import Department, InsuranceItemSalePrice, Item
from inventory.services import stock as stock_service
from laboratory.models import PatientSample, Specimen
from patient.models import AttendanceProcess

URL = '/patients/initiate-attendance-process/'


def make_visits(patient, user, n, track='reception'):
    return [
        AttendanceProcess.objects.create(
            patient=patient, reason='Consult', created_by=user, track=track)
        for _ in range(n)
    ]


@pytest.mark.django_db
def test_list_is_paged_newest_first(authenticated_admin_client, patient, admin_user):
    visits = make_visits(patient, admin_user, 3)

    response = authenticated_admin_client.get(URL, {'page_size': 2})

    assert response.status_code == 200
    body = response.json()
    assert body['count'] == 3
    assert [v['id'] for v in body['results']] == [visits[2].id, visits[1].id]
    assert body['next'] is not None


@pytest.mark.django_db
def test_page_size_is_capped(authenticated_admin_client, patient, admin_user):
    make_visits(patient, admin_user, 2)

    response = authenticated_admin_client.get(URL, {'page_size': 100000})

    assert response.status_code == 200
    assert response.json()['count'] == 2


@pytest.mark.django_db
def test_filters_by_one_or_several_tracks(authenticated_admin_client, patient, admin_user):
    make_visits(patient, admin_user, 1, track='lab')
    make_visits(patient, admin_user, 1, track='pharmacy')
    make_visits(patient, admin_user, 1, track='doctor')

    one = authenticated_admin_client.get(URL, {'track': 'lab'}).json()
    several = authenticated_admin_client.get(URL, {'track': 'lab,pharmacy'}).json()

    assert [v['track'] for v in one['results']] == ['lab']
    assert sorted(v['track'] for v in several['results']) == ['lab', 'pharmacy']


@pytest.fixture
def insured_billing(db):
    """A service, and two insurers: one with an agreed price for it, one without."""
    Department.objects.get_or_create(name='Main', defaults={'is_stock_location': True})
    PaymentMode.objects.create(payment_mode='Cash', payment_category='cash', is_default=True)
    service = Item.objects.create(
        name='Consultation', desc='Consultation', category='General Appointment',
        units_of_measure='unit', item_code='SRV-CONSULT')
    stock_service.set_sale_price(service, Decimal('500.00'))
    agreed, unagreed = (InsuranceCompany.objects.create(name=n) for n in ('AAR', 'Jubilee'))
    InsuranceItemSalePrice.objects.create(
        item=service, insurance_company=agreed, sale_price=Decimal('450.00'))
    modes = [PaymentMode.objects.create(payment_mode=i.name, payment_category='insurance', insurance=i)
             for i in (agreed, unagreed)]
    return service, modes


def make_billed_visits(patient, user, n, insured_billing):
    service, modes = insured_billing
    visits = make_visits(patient, user, n)
    for visit in visits:
        for mode in modes:
            InvoiceItem.objects.create(invoice=visit.invoice, item=service, payment_mode=mode)
    return visits


@pytest.mark.django_db
def test_query_count_does_not_grow_with_the_number_of_visits(
        authenticated_admin_client, patient, admin_user, insured_billing):
    # Each visit has lines billed to insurers, which used to cost a query per
    # line to ask whether the insurer has an agreed price.
    make_billed_visits(patient, admin_user, 2, insured_billing)
    authenticated_admin_client.get(URL)  # warm caches (content types, etc.)
    with CaptureQueriesContext(connection) as few:
        assert authenticated_admin_client.get(URL).status_code == 200

    make_billed_visits(patient, admin_user, 6, insured_billing)
    with CaptureQueriesContext(connection) as many:
        response = authenticated_admin_client.get(URL)
    assert response.status_code == 200
    assert response.json()['count'] == 8

    assert len(many) == len(few)


@pytest.mark.django_db
def test_insurance_lines_keep_their_price_source(
        authenticated_admin_client, patient, admin_user, insured_billing):
    visit = make_billed_visits(patient, admin_user, 1, insured_billing)[0]
    expected = {line.payment_mode.payment_mode: line.price_source
                for line in InvoiceItem.objects.filter(invoice=visit.invoice)}

    row = authenticated_admin_client.get(URL).json()['results'][0]

    listed = {line['payment_mode_name']: line['price_source'] for line in row['invoice_items']}
    assert listed == expected
    assert listed['AAR'] == 'insurance'
    assert listed['Jubilee'] != 'insurance'


@pytest.mark.django_db
def test_list_rows_keep_their_fields(authenticated_admin_client, patient, admin_user):
    make_visits(patient, admin_user, 1)

    row = authenticated_admin_client.get(URL).json()['results'][0]

    assert row['patient_name'] == patient.display_name
    assert row['invoice_items'] == []
    assert len(row['insurances']) == 2
    assert row['has_approved_lab_results'] is False
    assert row['has_critical_triage'] is False


@pytest.mark.django_db
def test_single_visit_is_not_paged(authenticated_admin_client, patient, admin_user):
    visit = make_visits(patient, admin_user, 1)[0]

    response = authenticated_admin_client.get(f'{URL}{visit.id}/')

    assert response.status_code == 200
    assert response.json()['id'] == visit.id


@pytest.mark.django_db
def test_sample_carries_its_visit(authenticated_admin_client, patient, admin_user):
    # The lab's sample list reads the visit off the sample instead of
    # loading every visit to look it up.
    visit = make_visits(patient, admin_user, 1, track='lab')[0]
    sample = PatientSample.objects.create(
        specimen=Specimen.objects.create(name='Blood'),
        process=visit.process_test_req,
        patient_sample_code='S-0001',
    )

    rows = authenticated_admin_client.get('/lab/patient-samples/').json()
    row = next(r for r in rows if r['id'] == sample.id)

    assert row['track_number'] == visit.track_number
    assert row['patient_name'] == patient.display_name
    assert row['patient_number'] == visit.patient_number
