"""
Samples sent in by another facility, tests billed on account, and a walk-in
who gives only their age.

A referred sample arrives drawn and labelled: it must go straight to the
bench, billed to the clinic, without our draw kit being spent on it -- or be
turned away, uncharged, with the clinic told why.
"""
import json
from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from billing.models import InvoiceItem, PaymentMode
from company.models import InsuranceCompany
from inventory.models import Item
from laboratory.models import (
    LabTestRequest, LabTestRequestPanel, PatientSample, SampleConsignment, TestPanelReagent)
from laboratory.tests.test_walk_in import (  # noqa: F401  (fixtures)
    WALK_IN_URL, blood, cash_mode, creatinine, haematology, cbc, lab_client, lab_tech,
    make_panel, new_patient_payload, renal, urea)
from notifications.models import OutboundMessage
from patient.models import AttendanceProcess, Patient

URL = '/lab/referred-samples/'


@pytest.fixture(autouse=True)
def lab_stock(db):
    """Billing a test checks the lab's shelf, so the lab needs to exist."""
    from inventory.models import Department

    return Department.objects.create(name='Lab', is_stock_location=True)


@pytest.fixture
def clinic(db):
    return InsuranceCompany.objects.create(
        name='Mama Lucy Clinic', account_type=InsuranceCompany.AccountType.FACILITY,
        contact_person='Dr. Njoroge', email='lab@mamalucy.test', phone='0722111222')


@pytest.fixture
def employer(db):
    return InsuranceCompany.objects.create(
        name='Safaricom PLC', account_type=InsuranceCompany.AccountType.CORPORATE)


def entry(panels, **extra):
    return {'new_patient': {'first_name': 'Achieng', 'second_name': 'Otieno', 'gender': 'F',
                            'age_years': 34},
            'external_reference': 'ML-0042', 'panels': [p.id for p in panels], **extra}


def receive(client, clinic, *entries, **extra):
    return client.post(URL, {'facility': clinic.id, 'entries': list(entries), **extra}, format='json')


@pytest.mark.django_db
def test_a_referred_sample_goes_straight_to_the_bench_billed_to_the_clinic(
        lab_client, cash_mode, clinic, urea, creatinine):
    response = receive(lab_client, clinic, entry([urea, creatinine], referring_doctor='Dr. Njoroge'),
                       courier='Rider 7')

    assert response.status_code == 201, response.data
    consignment = SampleConsignment.objects.get()
    assert consignment.reference.startswith('RS-')
    assert response.data['patients'][0]['external_reference'] == 'ML-0042'

    visit = AttendanceProcess.objects.get()
    assert visit.track == 'lab'
    lines = InvoiceItem.objects.filter(invoice=visit.invoice)
    assert {line.status for line in lines} == {'billed'}
    assert {line.payment_mode.insurance_id for line in lines} == {clinic.id}
    assert all(run.is_billed for run in LabTestRequestPanel.objects.all())

    sample = PatientSample.objects.get()
    assert sample.is_sample_collected and sample.collected_externally
    assert sample.condition == 'acceptable'
    assert not sample.consumables_used.exists()

    request = LabTestRequest.objects.first()
    assert request.consignment == consignment
    assert request.referring_facility == 'Mama Lucy Clinic'

    patient = visit.patient
    assert patient.referred_from == clinic and patient.external_id == 'ML-0042'
    assert patient.date_of_birth_estimated and patient.age in (33, 34)


@pytest.mark.django_db
def test_the_clinics_next_sample_for_a_patient_finds_them(lab_client, cash_mode, clinic, urea):
    receive(lab_client, clinic, entry([urea]))
    receive(lab_client, clinic, entry([urea]))

    assert Patient.objects.count() == 1
    assert AttendanceProcess.objects.count() == 2


@pytest.mark.django_db
def test_a_rejected_sample_is_not_charged_and_the_clinic_is_told(
        lab_client, cash_mode, clinic, urea, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        response = receive(lab_client, clinic, entry(
            [urea], condition='haemolysed', rejection_reason='Haemolysed, cannot run potassium'))

    assert response.status_code == 201
    assert response.data['patients'][0]['rejected'] is True
    assert not InvoiceItem.objects.exists()
    assert not LabTestRequestPanel.objects.filter(is_billed=True).exists()
    sample = PatientSample.objects.get()
    assert sample.rejected and sample.condition == 'haemolysed'

    messages = OutboundMessage.objects.filter(dedupe_key__startswith='sample-rejected')
    assert {m.channel for m in messages} == {'email', 'sms'}
    email = messages.get(channel='email')
    assert email.recipient == 'lab@mamalucy.test'
    assert 'ML-0042' in email.body
    # No SMS or email provider is set up in tests: recorded, not sent.
    assert email.status == OutboundMessage.Status.SKIPPED


@pytest.mark.django_db
def test_no_reagent_means_nothing_is_booked_in(lab_client, cash_mode, clinic, urea):
    reagent = Item.objects.create(name='Urea reagent', desc='r', category='LabReagent',
                                  units_of_measure='ml', item_code='RGT-UREA')
    TestPanelReagent.objects.create(test_panel=urea, reagent_item=reagent, units_consumed_per_run=1)

    response = receive(lab_client, clinic, entry([urea]))

    assert response.status_code == 400
    assert 'cannot run' in response.data['detail']
    assert not SampleConsignment.objects.exists()
    assert not Patient.objects.exists()


@pytest.mark.django_db
def test_only_a_referring_facility_can_send_samples(lab_client, cash_mode, employer, urea):
    response = receive(lab_client, employer, entry([urea]))

    assert response.status_code == 400
    assert 'facility' in response.data


@pytest.mark.django_db
def test_the_request_form_can_come_with_it(lab_client, cash_mode, clinic, urea):
    form = SimpleUploadedFile('form.pdf', b'%PDF-1.4 request form', content_type='application/pdf')

    response = lab_client.post(URL, {
        'facility': clinic.id, 'request_form': form,
        'entries': json.dumps([entry([urea])]),
    }, format='multipart')

    assert response.status_code == 201, response.data
    assert SampleConsignment.objects.get().request_form.name.endswith('.pdf')


@pytest.mark.django_db
def test_consignments_are_listed_per_facility(lab_client, cash_mode, clinic, urea):
    receive(lab_client, clinic, entry([urea]))

    response = lab_client.get(URL, {'facility': clinic.id})

    assert response.status_code == 200
    assert response.data[0]['facility_name'] == 'Mama Lucy Clinic'
    assert response.data[0]['patients'][0]['tests'] == ['Urea']


# ---------------------------------------------------------------------------
# Walk-ins billed on account, and by age
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_a_walk_in_on_an_employers_account_skips_the_till(lab_client, cash_mode, employer, urea):
    mode = PaymentMode.objects.get(insurance=employer)

    response = lab_client.post(WALK_IN_URL, {
        'new_patient': new_patient_payload(), 'panels': [urea.id], 'payment_mode': mode.id,
    }, format='json')

    assert response.status_code == 201
    assert InvoiceItem.objects.get().status == 'billed'
    assert LabTestRequestPanel.objects.get().is_billed


@pytest.mark.django_db
def test_an_insurers_walk_in_still_waits_for_the_cashier(lab_client, cash_mode, urea):
    insurer = InsuranceCompany.objects.create(name='AAR')

    lab_client.post(WALK_IN_URL, {
        'new_patient': new_patient_payload(), 'panels': [urea.id],
        'payment_mode': PaymentMode.objects.get(insurance=insurer).id,
    }, format='json')

    assert InvoiceItem.objects.get().status == 'pending'


@pytest.mark.django_db
def test_a_walk_in_can_give_their_age_instead_of_a_birthday(lab_client, cash_mode, urea):
    patient = new_patient_payload()
    del patient['date_of_birth']

    missing = lab_client.post(WALK_IN_URL, {'new_patient': patient, 'panels': [urea.id]}, format='json')
    assert missing.status_code == 400

    patient['age_years'] = 52
    response = lab_client.post(WALK_IN_URL, {'new_patient': patient, 'panels': [urea.id]}, format='json')

    assert response.status_code == 201
    registered = Patient.objects.get()
    assert registered.date_of_birth_estimated
    assert registered.age in (51, 52)


# ---------------------------------------------------------------------------
# Results ready
# ---------------------------------------------------------------------------

@pytest.fixture
def bench_tech(lab_tech):
    """Approving results takes the lab technician role, not just dashboard access."""
    lab_tech.role = lab_tech.LAB_TECH
    lab_tech.is_staff = True
    lab_tech.registration_number = 'KMLTTB/12345'
    lab_tech.save()
    return lab_tech


def approve_everything(client):
    for run in LabTestRequestPanel.objects.all():
        run.result = '5.1'
        run.save()
        response = client.patch(f'/lab/lab-test-requests-panel/{run.id}/', {'result_approved': True},
                                format='json')
        assert response.status_code == 200, response.data


@pytest.mark.django_db
def test_approving_the_last_result_tells_the_walk_in_and_the_clinic_once(
        lab_client, bench_tech, cash_mode, clinic, urea, creatinine, django_capture_on_commit_callbacks):
    lab_client.post(WALK_IN_URL, {
        'new_patient': new_patient_payload(), 'panels': [urea.id, creatinine.id],
        'referring_facility': 'Mama Lucy Clinic',
        'payment_mode': PaymentMode.objects.get(insurance=clinic).id,
    }, format='json')

    with django_capture_on_commit_callbacks(execute=True):
        approve_everything(lab_client)

    assert all(run.approved_by == bench_tech for run in LabTestRequestPanel.objects.all())
    keys = set(OutboundMessage.objects.values_list('dedupe_key', flat=True))
    process_id = AttendanceProcess.objects.get().process_test_req_id
    assert keys == {f"results-ready:{process_id}:sms", f"results-ready:{process_id}:whatsapp",
                    f"results-ready:{process_id}:facility-email"}
    sms = OutboundMessage.objects.get(channel='sms')
    assert sms.recipient == '0700000000'
    assert '5.1' not in sms.body  # never the result itself


@pytest.mark.django_db
@override_settings(SMS_ENABLED=True, AFRICASTALKING_USERNAME='sandbox', AFRICASTALKING_API_KEY='k')
def test_a_configured_sms_is_sent_through_africas_talking(
        lab_client, bench_tech, cash_mode, urea, monkeypatch, django_capture_on_commit_callbacks):
    sent = []

    def africas_talking(method, url, form=None, headers=None, **kwargs):
        sent.append((url, form, headers))
        return {'SMSMessageData': {'Recipients': [{'status': 'Success', 'messageId': 'ATXid_1'}]}}

    monkeypatch.setattr('integrations.messaging.request_json', africas_talking)
    lab_client.post(WALK_IN_URL, {'new_patient': new_patient_payload(), 'panels': [urea.id]}, format='json')
    for line in InvoiceItem.objects.all():
        line.status = 'billed'
        line.save()

    with django_capture_on_commit_callbacks(execute=True):
        approve_everything(lab_client)

    sms = OutboundMessage.objects.get(channel='sms')
    assert sms.status == OutboundMessage.Status.SENT
    assert sms.provider_reference == 'ATXid_1'
    url, form, headers = sent[0]
    assert 'sandbox' in url and form['to'] == '+254700000000'
    assert headers['apiKey'] == 'k'
