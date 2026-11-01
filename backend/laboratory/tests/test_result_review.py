"""
A reviewer who won't approve a result sends the test back to the bench:
run again on the same sample, or on a fresh draw when the sample is the
problem.
"""
import pytest
from rest_framework.test import APIClient

from customuser.models import CustomUser
from inventory.models import Item
from laboratory.models import LabResultRejection, LabTestPanel, LabTestRequestPanel, PatientSample
from laboratory.serializers import LabTestRequestPanelSerializer


@pytest.fixture
def reviewer(db):
    user = CustomUser.objects.create_user(email='reviewer@example.com', password='x',
                                          role=CustomUser.SYS_ADMIN)
    user.is_superuser = True
    user.save()
    return user


@pytest.fixture
def reviewer_client(reviewer):
    client = APIClient()
    client.force_authenticate(reviewer)
    return client


def panel(name, specimen, profile):
    item = Item.objects.create(name=name, desc=name, category='Lab Test',
                               units_of_measure='test', item_code=f'LAB-{name.upper()}')
    return LabTestPanel.objects.create(name=name, specimen=specimen, test_profile=profile, item=item)


@pytest.fixture
def glucose(specimen, lab_test_profile):
    return panel('Glucose', specimen, lab_test_profile)


@pytest.fixture
def entered(glucose, lab_test_request):
    """A test with a result waiting for review."""
    panel = LabTestRequestPanel.objects.create(test_panel=glucose, lab_test_request=lab_test_request)
    sample = panel.patient_sample
    sample.is_sample_collected = True
    sample.save()
    panel.result = '34'
    panel.save()
    return panel


def url(panel):
    return f'/lab/lab-test-requests-panel/{panel.id}/reject/'


@pytest.mark.django_db
def test_a_rerun_clears_the_result_and_keeps_the_sample(reviewer_client, entered, reviewer):
    sample = entered.patient_sample

    response = reviewer_client.post(url(entered), {'reason': 'qc_failure', 'action': 'rerun',
                                                   'note': 'Level 2 control high'})

    assert response.status_code == 201, response.data
    entered.refresh_from_db()
    assert entered.result is None and not entered.result_approved and entered.approved_on is None
    assert entered.patient_sample == sample
    rejection = entered.rejections.get()
    assert rejection.result == '34'
    assert rejection.rejected_by == reviewer
    assert rejection.replacement_sample is None


@pytest.mark.django_db
def test_a_recollection_moves_the_test_to_a_new_uncollected_sample(reviewer_client, entered):
    old = entered.patient_sample

    response = reviewer_client.post(url(entered), {'reason': 'haemolysed', 'action': 'recollect'})

    assert response.status_code == 201, response.data
    entered.refresh_from_db()
    assert entered.patient_sample != old
    assert not entered.patient_sample.is_sample_collected
    assert entered.patient_sample.process == old.process
    assert response.data['replacement_sample_code'] == entered.patient_sample.patient_sample_code

    # Saving the test again leaves it on the new sample.
    entered.save()
    entered.refresh_from_db()
    assert entered.patient_sample != old


@pytest.mark.django_db
def test_tests_recollected_off_one_sample_share_one_new_draw(reviewer_client, entered, glucose,
                                                            lab_test_request, specimen, lab_test_profile):
    urea = panel('Urea', specimen, lab_test_profile)
    second = LabTestRequestPanel.objects.create(test_panel=urea, lab_test_request=lab_test_request)
    second.result = '5'
    second.save()

    reviewer_client.post(url(entered), {'reason': 'clotted', 'action': 'recollect'})
    reviewer_client.post(url(second), {'reason': 'clotted', 'action': 'recollect'})

    entered.refresh_from_db()
    second.refresh_from_db()
    assert entered.patient_sample == second.patient_sample
    assert PatientSample.objects.filter(process=lab_test_request.process).count() == 2


@pytest.mark.django_db
def test_nothing_to_reject_without_a_result_or_once_approved(reviewer_client, glucose, lab_test_request, entered):
    blank = LabTestRequestPanel.objects.create(test_panel=glucose, lab_test_request=lab_test_request)
    entered.result_approved = True
    entered.save()

    assert reviewer_client.post(url(blank), {'reason': 'other', 'action': 'rerun'}).status_code == 400
    assert reviewer_client.post(url(entered), {'reason': 'other', 'action': 'rerun'}).status_code == 400
    assert not LabResultRejection.objects.exists()


@pytest.mark.django_db
def test_a_result_cannot_be_approved_before_it_is_entered(reviewer_client, glucose, lab_test_request):
    blank = LabTestRequestPanel.objects.create(test_panel=glucose, lab_test_request=lab_test_request)

    response = reviewer_client.patch(f'/lab/lab-test-requests-panel/{blank.id}/',
                                     {'result_approved': True}, format='json')

    assert response.status_code == 400
    blank.refresh_from_db()
    assert not blank.result_approved


@pytest.mark.django_db
def test_the_test_says_why_it_came_back(reviewer_client, entered):
    reviewer_client.post(url(entered), {'reason': 'delta', 'action': 'rerun'})
    entered.refresh_from_db()

    last = LabTestRequestPanelSerializer().get_last_rejection(entered)

    assert last['reason_display'] == 'Differs sharply from previous result'
    assert last['action'] == 'rerun'
    assert last['result'] == '34'
