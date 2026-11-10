"""
A profile ordered as a whole: a CBC or a urinalysis is run complete, so an
order for it cannot leave panels off. A profile left unlocked -- a menu such as
Microbiology -- still lets the counter pick only the tests wanted.
"""
from decimal import Decimal

import pytest

from laboratory.models import LabTestProfile, LabTestRequestPanel
from laboratory.tests.test_walk_in import (  # noqa: F401  (fixtures)
    blood, cash_mode, lab_client, lab_tech, make_panel, new_patient_payload)

WALK_IN_URL = '/lab/walk-in-requests/'
PROFILE_URL = '/lab/lab-test-profile/'


@pytest.fixture
def urinalysis(db):
    return LabTestProfile.objects.create(name="URINALYSIS REPORT", orders_as_whole=True)


@pytest.fixture
def microscopy(urinalysis):
    return LabTestProfile.objects.create(name="Microscopy", parent=urinalysis)


@pytest.fixture
def ua_panels(urinalysis, microscopy, blood):
    return [
        make_panel("Colour", urinalysis, blood, price=None),
        make_panel("Pus Cells", microscopy, blood, price=None),
    ]


@pytest.fixture
def microbiology(db):
    return LabTestProfile.objects.create(name="Microbiology")


def order(client, panels):
    return client.post(WALK_IN_URL, {
        'new_patient': new_patient_payload(),
        'panels': [panel.id for panel in panels],
    }, format='json')


@pytest.mark.django_db
def test_existing_profiles_stay_unlocked(db):
    assert LabTestProfile.objects.create(name="Renal").orders_as_whole is False


@pytest.mark.django_db
def test_a_locked_profile_is_ordered_with_every_panel(lab_client, cash_mode, ua_panels):
    response = order(lab_client, ua_panels)

    assert response.status_code == 201, response.data
    assert LabTestRequestPanel.objects.count() == 2


@pytest.mark.django_db
def test_a_locked_profile_cannot_leave_a_panel_off(lab_client, cash_mode, ua_panels):
    colour, _pus_cells = ua_panels

    response = order(lab_client, [colour])

    assert response.status_code == 400
    assert "Pus Cells" in str(response.data)
    assert LabTestRequestPanel.objects.count() == 0


@pytest.mark.django_db
def test_a_sub_profile_of_a_locked_profile_cannot_be_ordered_alone(
        lab_client, cash_mode, ua_panels):
    _colour, pus_cells = ua_panels

    response = order(lab_client, [pus_cells])

    assert response.status_code == 400
    assert "URINALYSIS REPORT" in str(response.data)


@pytest.mark.django_db
def test_an_unlocked_profile_still_takes_a_single_test(
        lab_client, cash_mode, microbiology, blood):
    culture = make_panel("Urine Culture", microbiology, blood, price=Decimal('900.00'))
    make_panel("Gram Stain", microbiology, blood)

    response = order(lab_client, [culture])

    assert response.status_code == 201, response.data
    assert LabTestRequestPanel.objects.count() == 1


@pytest.mark.django_db
def test_the_profile_list_says_what_locks_each_profile(
        lab_client, urinalysis, microscopy, microbiology):
    rows = {row['id']: row for row in lab_client.get(PROFILE_URL).data}

    assert rows[urinalysis.id]['locked_by'] == urinalysis.id
    assert rows[microscopy.id]['locked_by'] == urinalysis.id
    assert rows[microscopy.id]['locked_by_name'] == "URINALYSIS REPORT"
    assert rows[microbiology.id]['locked_by'] is None


@pytest.mark.django_db
def test_a_profile_can_be_locked_from_settings(lab_client, microbiology):
    response = lab_client.patch(
        f'{PROFILE_URL}{microbiology.id}/', {'orders_as_whole': True}, format='json')

    assert response.status_code == 200, response.data
    microbiology.refresh_from_db()
    assert microbiology.orders_as_whole is True
