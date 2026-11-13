"""
What the lab and the requester write about a request, on the printed report:
the lab's comment under the results of the profile it is about, and every
request's note, not only the first's.
"""
import re

import pytest

from inventory.models import Item
from laboratory.models import LabTestPanel, LabTestProfile, LabTestRequest
from laboratory.tests.test_report_signoff import api, lab_setup, report_html, results  # noqa: F401  (fixtures)
from patient.models import AttendanceProcess


@pytest.fixture
def two_profile_visit(api, patient, company):
    """One visit with two profiles requested, so two lab requests on one report."""
    profiles, panels = [], []
    for name in ('Haematology', 'Chemistry'):
        response = api.post('/lab/lab-test-profile/', {'name': name, 'sale_price': '500.00'}, format='json')
        assert response.status_code == 201, response.data
        profile = LabTestProfile.objects.get(pk=response.data['id'])
        item = Item.objects.create(
            name=f'{name} test', desc=name, category='Lab Test', units_of_measure='test', item_code=f'C-{name}')
        profiles.append(profile)
        panels.append(LabTestPanel.objects.create(name=f'{name} test', test_profile=profile, item=item))

    response = api.post('/lab/walk-in-requests/', {
        'patient': patient.id, 'profiles': [p.id for p in profiles], 'panels': [p.id for p in panels],
    }, format='json')
    assert response.status_code == 201, response.data
    visit = AttendanceProcess.objects.get(pk=response.data['id'])
    results(visit).update(result='1.0')
    return visit


def request_for(visit, profile_name):
    return LabTestRequest.objects.get(process=visit.process_test_req, test_profile__name=profile_name)


def section_text(html, name):
    """The part of the report from one profile's title to the next title (or the end)."""
    titles = list(re.finditer(r'<th class="section-title"[^>]*>\s*(.*?)\s*</th>', html))
    for i, title in enumerate(titles):
        if title.group(1).lower() == name.lower():
            end = titles[i + 1].start() if i + 1 < len(titles) else len(html)
            return html[title.start():end]
    raise AssertionError(f'no section {name!r}')


def test_the_visit_has_one_request_per_profile(two_profile_visit):
    assert LabTestRequest.objects.filter(process=two_profile_visit.process_test_req).count() == 2


def test_the_lab_comment_can_be_saved_on_the_request(api, two_profile_visit):
    request = request_for(two_profile_visit, 'Haematology')

    response = api.patch(f'/lab/lab-test-requests/{request.id}/', {'lab_comment': 'Sample slightly haemolysed.'},
                         format='json')

    assert response.status_code == 200, response.data
    assert response.data['lab_comment'] == 'Sample slightly haemolysed.'
    request.refresh_from_db()
    assert request.lab_comment == 'Sample slightly haemolysed.'


def test_a_comment_prints_under_its_own_profile_only(two_profile_visit, monkeypatch):
    request = request_for(two_profile_visit, 'Haematology')
    request.lab_comment = 'Sample slightly haemolysed.\nRepeat advised.'
    request.save()

    html = report_html(two_profile_visit, monkeypatch)

    haematology = section_text(html, 'Haematology')
    assert 'Comment:' in haematology
    assert re.search(r'Sample slightly haemolysed\.<br\s*/?>Repeat advised\.', haematology)
    assert 'Comment:' not in section_text(html, 'Chemistry')


def test_no_comment_prints_nothing(two_profile_visit, monkeypatch):
    html = report_html(two_profile_visit, monkeypatch)

    assert 'Comment:' not in html


def test_every_requests_note_prints(two_profile_visit, monkeypatch):
    LabTestRequest.objects.filter(
        process=two_profile_visit.process_test_req, test_profile__name='Haematology').update(note='Fasting sample')
    LabTestRequest.objects.filter(
        process=two_profile_visit.process_test_req, test_profile__name='Chemistry').update(note='On warfarin')

    html = report_html(two_profile_visit, monkeypatch)

    notes = re.search(r'<div class="notes">(.*?)</div>', html, re.S).group(1)
    assert 'Fasting sample' in notes
    assert 'On warfarin' in notes


def test_the_same_note_on_two_requests_prints_once(two_profile_visit, monkeypatch):
    LabTestRequest.objects.filter(process=two_profile_visit.process_test_req).update(note='Fasting sample')

    html = report_html(two_profile_visit, monkeypatch)

    assert html.count('Fasting sample') == 1
