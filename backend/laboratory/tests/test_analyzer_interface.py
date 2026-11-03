"""
Results from lab analyzers, posted by the LIS server.

A result must land on the test it belongs to, by sample code and the
analyzer's own code -- and when it cannot, it must wait somewhere a person
will see it, never vanish into a log file.
"""
import pytest

from laboratory.models import (
    AnalyzerMessage, AnalyzerResult, AnalyzerTestMapping, LabEquipment, LabTestRequestPanel,
    PatientSample)
from laboratory.tests.test_walk_in import (  # noqa: F401  (fixtures)
    WALK_IN_URL, blood, cash_mode, haematology, lab_client, lab_tech, make_panel,
    new_patient_payload)

MESSAGES_URL = '/lab/analyzer-messages/'
RESULTS_URL = '/lab/analyzer-results/'
MAPPINGS_URL = '/lab/analyzer-test-mappings/'


@pytest.fixture
def wbc(haematology, blood):
    return make_panel("WBC", haematology, blood)


@pytest.fixture
def lymph_pct(haematology, blood):
    return make_panel("LYMP %", haematology, blood)


@pytest.fixture
def analyzer(db):
    return LabEquipment.objects.create(name="HumaCount 30TS", sender_id="HumaCount 30TS")


@pytest.fixture
def sample(lab_client, cash_mode, wbc, lymph_pct):
    response = lab_client.post(WALK_IN_URL, {
        'new_patient': new_patient_payload(), 'panels': [wbc.id, lymph_pct.id],
    }, format='json')
    assert response.status_code == 201, response.data
    return PatientSample.objects.get()


def deliver(client, sample_code, *results, sender="HumaCount 30TS"):
    return client.post(MESSAGES_URL, {
        'sender': sender,
        'sample_code': sample_code,
        'patient_name': 'RUKIA OSMAN',
        'raw_message': 'MSH|^~\\&|HumaCount 30TS|...',
        'results': [{'code': code, 'value': value, 'unit': '10^9/l'} for code, value in results],
    }, format='json')


def run_for(sample, panel):
    return LabTestRequestPanel.objects.get(patient_sample=sample, test_panel=panel)


def statuses(response):
    return {row['analyzer_code']: row['status'] for row in response.data['results']}


@pytest.mark.django_db
def test_a_mapped_code_lands_on_its_panel(lab_client, analyzer, sample, lymph_pct):
    AnalyzerTestMapping.objects.create(equipment=analyzer, analyzer_code='LYM%', test_panel=lymph_pct)

    response = deliver(lab_client, sample.patient_sample_code, ('LYM%', '48.4'))

    assert response.status_code == 201, response.data
    assert response.data['equipment_name'] == 'HumaCount 30TS'
    assert statuses(response) == {'LYM%': 'posted'}
    assert run_for(sample, lymph_pct).result == '48.4'


@pytest.mark.django_db
def test_a_code_named_like_its_panel_is_matched_and_remembered(lab_client, analyzer, sample, wbc):
    response = deliver(lab_client, sample.patient_sample_code, ('WBC', '5.39'))

    assert statuses(response) == {'WBC': 'posted'}
    assert run_for(sample, wbc).result == '5.39'
    # The name match is saved, so it survives the panel being renamed.
    mapping = AnalyzerTestMapping.objects.get(equipment=analyzer, analyzer_code='WBC')
    assert mapping.test_panel == wbc


@pytest.mark.django_db
def test_nothing_is_lost_when_it_cannot_be_placed(lab_client, analyzer, sample):
    no_sample = deliver(lab_client, '', ('WBC', '5.39'))
    unknown_sample = deliver(lab_client, 'DDLR99999-2020', ('WBC', '5.39'))
    unmapped = deliver(lab_client, sample.patient_sample_code, ('GRA%', '42.1'))

    assert statuses(no_sample) == {'WBC': 'no_sample'}
    assert statuses(unknown_sample) == {'WBC': 'sample_not_found'}
    assert statuses(unmapped) == {'GRA%': 'unmapped'}
    assert AnalyzerMessage.objects.count() == 3

    inbox = lab_client.get(RESULTS_URL)
    assert inbox.status_code == 200
    assert sorted(row['status'] for row in inbox.data) == ['no_sample', 'sample_not_found', 'unmapped']


@pytest.mark.django_db
def test_assigning_the_sample_posts_the_waiting_results(lab_client, analyzer, sample, wbc):
    delivered = deliver(lab_client, '', ('WBC', '5.39'))

    response = lab_client.post(
        f"{MESSAGES_URL}{delivered.data['id']}/assign-sample/",
        {'sample_code': sample.patient_sample_code}, format='json')

    assert response.status_code == 200, response.data
    assert [row['status'] for row in response.data] == ['posted']
    assert run_for(sample, wbc).result == '5.39'
    assert lab_client.get(RESULTS_URL).data == []


@pytest.mark.django_db
def test_mapping_a_waiting_code_posts_its_results(lab_client, analyzer, sample, lymph_pct):
    deliver(lab_client, sample.patient_sample_code, ('LYM%', '48.4'))

    codes = lab_client.get(MAPPINGS_URL, {'equipment': analyzer.id})
    unmapped = lab_client.get(f"{MAPPINGS_URL}unmapped-codes/", {'equipment': analyzer.id})
    assert codes.data == []
    assert [(row['analyzer_code'], row['last_value']) for row in unmapped.data] == [('LYM%', '48.4')]

    response = lab_client.post(MAPPINGS_URL, {
        'equipment': analyzer.id, 'analyzer_code': 'LYM%', 'test_panel': lymph_pct.id,
    }, format='json')

    assert response.status_code == 201, response.data
    assert run_for(sample, lymph_pct).result == '48.4'
    assert AnalyzerResult.objects.get().status == 'posted'
    assert lab_client.get(f"{MAPPINGS_URL}unmapped-codes/", {'equipment': analyzer.id}).data == []


@pytest.mark.django_db
def test_codes_set_not_to_import_never_reach_the_inbox(lab_client, analyzer, sample):
    AnalyzerTestMapping.objects.create(equipment=analyzer, analyzer_code='WBC HISTO', test_panel=None)

    response = deliver(lab_client, '', ('WBC HISTO', '0000656'))

    assert statuses(response) == {'WBC HISTO': 'ignored'}
    assert lab_client.get(RESULTS_URL).data == []


@pytest.mark.django_db
def test_an_approved_result_is_never_overwritten(lab_client, analyzer, sample, wbc):
    run = run_for(sample, wbc)
    run.result = '6.10'
    run.result_approved = True
    run.save()

    response = deliver(lab_client, sample.patient_sample_code, ('WBC', '5.39'))

    assert statuses(response) == {'WBC': 'already_approved'}
    assert run_for(sample, wbc).result == '6.10'


@pytest.mark.django_db
def test_a_rerun_replaces_an_unapproved_result(lab_client, analyzer, sample, wbc):
    deliver(lab_client, sample.patient_sample_code, ('WBC', '5.39'))
    response = deliver(lab_client, sample.patient_sample_code, ('WBC', '5.41'))

    assert statuses(response) == {'WBC': 'posted'}
    assert 'replaced 5.39' in response.data['results'][0]['detail']
    assert run_for(sample, wbc).result == '5.41'


@pytest.mark.django_db
def test_a_mapped_test_that_was_not_ordered_waits(lab_client, analyzer, sample, haematology, blood):
    hgb = make_panel("HGB", haematology, blood)
    AnalyzerTestMapping.objects.create(equipment=analyzer, analyzer_code='HGB', test_panel=hgb)

    response = deliver(lab_client, sample.patient_sample_code, ('HGB', '12.3'))

    assert statuses(response) == {'HGB': 'not_requested'}


@pytest.mark.django_db
def test_an_unknown_analyzer_is_placed_once_given_its_sender_id(lab_client, sample, wbc):
    response = deliver(lab_client, sample.patient_sample_code, ('XYZ', '1'), sender='Mystery 5000')
    assert response.data['equipment'] is None
    assert 'not recognised' in response.data['results'][0]['detail']

    analyzer = LabEquipment.objects.create(name="Mystery", sender_id="mystery 5000")
    lab_client.post(f"{RESULTS_URL}retry-open/")

    assert AnalyzerMessage.objects.get().equipment == analyzer


@pytest.mark.django_db
def test_ignoring_clears_a_result_from_the_inbox(lab_client, analyzer, sample):
    deliver(lab_client, sample.patient_sample_code, ('GRA%', '42.1'))
    result = AnalyzerResult.objects.get()

    response = lab_client.post(f"{RESULTS_URL}{result.id}/ignore/")

    assert response.status_code == 200
    assert lab_client.get(RESULTS_URL).data == []
    assert lab_client.post(f"{RESULTS_URL}{result.id}/ignore/").status_code == 400


@pytest.mark.django_db
def test_one_code_maps_once_per_analyzer(lab_client, analyzer, wbc, lymph_pct):
    AnalyzerTestMapping.objects.create(equipment=analyzer, analyzer_code='WBC', test_panel=wbc)

    response = lab_client.post(MAPPINGS_URL, {
        'equipment': analyzer.id, 'analyzer_code': 'wbc ', 'test_panel': lymph_pct.id,
    }, format='json')

    assert response.status_code == 400
    assert 'analyzer_code' in response.data


@pytest.mark.django_db
def test_the_inbox_needs_lab_access(analyzer):
    from rest_framework.test import APIClient
    from django.contrib.auth import get_user_model

    outsider = get_user_model().objects.create_user(email='porter@example.com', password='x')
    client = APIClient()
    client.force_authenticate(outsider)

    assert client.get(RESULTS_URL).status_code == 403
    assert deliver(client, 'X', ('WBC', '1')).status_code == 403
