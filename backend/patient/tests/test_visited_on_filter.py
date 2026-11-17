"""
`?visited_on=today` keeps the Patients, Lab Requests and Lab Results screens
to the day's work. "Today" is the facility's day (TIME_ZONE), not UTC's.
"""
from datetime import datetime, timedelta

import pytest
from django.utils import timezone

from patient.models import AttendanceProcess, Patient

VISITS = '/patients/initiate-attendance-process/'
PATIENTS = '/patients/patients/'


def visit(patient, user, when, track='lab'):
    return AttendanceProcess.objects.create(
        patient=patient, reason='Tests', created_by=user, track=track, created_at=when)


def rows(response):
    assert response.status_code == 200, response.content
    body = response.json()
    return body['results'] if isinstance(body, dict) else body


@pytest.fixture
def yesterday():
    return timezone.now() - timedelta(days=1)


@pytest.mark.django_db
def test_only_todays_visits(authenticated_admin_client, patient, admin_user, yesterday):
    today = visit(patient, admin_user, timezone.now())
    visit(patient, admin_user, yesterday)

    listed = rows(authenticated_admin_client.get(VISITS, {'visited_on': 'today'}))

    assert [v['id'] for v in listed] == [today.id]


@pytest.mark.django_db
def test_it_combines_with_the_track(authenticated_admin_client, patient, admin_user):
    lab = visit(patient, admin_user, timezone.now(), track='lab')
    visit(patient, admin_user, timezone.now(), track='pharmacy')

    listed = rows(authenticated_admin_client.get(VISITS, {'visited_on': 'today', 'track': 'lab'}))

    assert [v['id'] for v in listed] == [lab.id]


@pytest.mark.django_db
def test_without_it_every_day_is_listed(authenticated_admin_client, patient, admin_user, yesterday):
    visit(patient, admin_user, timezone.now())
    visit(patient, admin_user, yesterday)

    assert len(rows(authenticated_admin_client.get(VISITS))) == 2


@pytest.mark.django_db
def test_a_given_date_lists_that_days_visits(authenticated_admin_client, patient, admin_user, yesterday):
    visit(patient, admin_user, timezone.now())
    earlier = visit(patient, admin_user, yesterday)

    listed = rows(authenticated_admin_client.get(
        VISITS, {'visited_on': timezone.localtime(yesterday).date().isoformat()}))

    assert [v['id'] for v in listed] == [earlier.id]


@pytest.mark.django_db
def test_today_is_the_facilitys_day_not_utcs(authenticated_admin_client, patient, admin_user):
    # 00:30 in Nairobi is still the previous day in UTC.
    local_today = timezone.localdate()
    just_after_midnight = timezone.make_aware(
        datetime.combine(local_today, datetime.min.time()) + timedelta(minutes=30))
    early = visit(patient, admin_user, just_after_midnight)

    listed = rows(authenticated_admin_client.get(VISITS, {'visited_on': 'today'}))

    assert early.id in [v['id'] for v in listed]


@pytest.mark.django_db
def test_rubbish_is_ignored(authenticated_admin_client, patient, admin_user, yesterday):
    visit(patient, admin_user, timezone.now())
    visit(patient, admin_user, yesterday)

    assert len(rows(authenticated_admin_client.get(VISITS, {'visited_on': 'someday'}))) == 2


def registered(first_name, when):
    """A patient registered at `when`; None for one registered before dates were kept."""
    patient = Patient.objects.create(first_name=first_name, second_name='Test', gender='M')
    Patient.objects.filter(pk=patient.pk).update(registered_at=when)
    return patient


@pytest.mark.django_db
def test_a_patient_registered_now_carries_the_time(patient):
    assert timezone.localdate(patient.registered_at) == timezone.localdate()


@pytest.mark.django_db
def test_patients_with_a_visit_today(authenticated_admin_client, admin_user, yesterday):
    came_in = registered('Amina', yesterday)
    stayed_home = registered('Peter', yesterday)
    visit(came_in, admin_user, timezone.now())
    visit(came_in, admin_user, timezone.now())  # twice today, listed once
    visit(stayed_home, admin_user, yesterday)

    listed = rows(authenticated_admin_client.get(PATIENTS, {'visited_on': 'today'}))

    assert [p['id'] for p in listed] == [came_in.id]


@pytest.mark.django_db
def test_patients_registered_today_count_without_a_visit(authenticated_admin_client, yesterday):
    new = registered('Zeinab', timezone.now())
    registered('Hashim', yesterday)

    listed = rows(authenticated_admin_client.get(PATIENTS, {'visited_on': 'today'}))

    assert [p['id'] for p in listed] == [new.id]


@pytest.mark.django_db
def test_patients_from_before_registration_dates_are_not_taken_for_today(authenticated_admin_client):
    registered('Sahan', None)

    assert rows(authenticated_admin_client.get(PATIENTS, {'visited_on': 'today'})) == []


@pytest.mark.django_db
def test_every_patient_without_it(authenticated_admin_client, patient, admin_user, yesterday):
    returning = registered('Peter', None)
    visit(returning, admin_user, yesterday)

    listed = rows(authenticated_admin_client.get(PATIENTS))

    assert {p['id'] for p in listed} == {patient.id, returning.id}
