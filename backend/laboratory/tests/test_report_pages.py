"""
Profiles requested together print one main profile per page, each page laid
out as though that profile had been requested and billed alone: the letterhead
and patient's details, its results, its comments, notes and interpretations,
End of Report and the sign-off, signed by whoever approved its results.

This was asked for by the lab, so it can bill several profiles on one invoice
and still hand out a page per profile.
"""
import pytest
from django.utils import timezone

from laboratory.models import LabTestInterpretation, LabTestRequest
from laboratory.tests.test_full_reports import add_panel, main_profile, request_tests
from laboratory.tests.test_report_signoff import (
    LONG_REPORT, approve, boxes_with_class, laid_out_pages, printed_text, results, signoff_on, staff,
)


@pytest.fixture
def api(db):
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(staff('admin@x.test', 'Admin', 'User', is_staff=True, is_superuser=True))
    return client


@pytest.fixture(autouse=True)
def lab_setup(db, company):
    from billing.models import PaymentMode
    from inventory.models import Department
    Department.objects.get_or_create(name='Main', defaults={'is_stock_location': True})
    PaymentMode.objects.create(payment_mode='Cash', payment_category='cash', is_default=True)


@pytest.fixture
def two_profiles(api, patient):
    coagulation = main_profile(api, 'Coagulation Profile', sort_order=1)
    for name in ('PT Test', 'APTT Test'):
        add_panel(coagulation, name, unit='sec')
    hepatitis = main_profile(api, 'Hepatitis Profile', sort_order=2)
    add_panel(hepatitis, 'Hepatitis A', qualitative=True)
    visit = request_tests(api, patient, [coagulation, hepatitis],
                          {'PT Test': '12', 'APTT Test': '30', 'Hepatitis A': 'Negative'})
    return visit, coagulation, hepatitis


def profile_results(visit, profile):
    return results(visit).filter(test_panel__test_profile=profile)


def test_each_main_profile_starts_a_page_of_its_own(two_profiles, monkeypatch):
    visit, _, _ = two_profiles

    pages = [printed_text(page) for page in laid_out_pages(visit, monkeypatch)]

    assert len(pages) == 2
    assert 'COAGULATION PROFILE' in pages[0] and 'HEPATITIS' not in pages[0]
    assert 'HEPATITIS PROFILE' in pages[1] and 'COAGULATION' not in pages[1]


def test_every_page_carries_the_header_and_patients_details(two_profiles, patient, monkeypatch):
    visit, _, _ = two_profiles

    for page in laid_out_pages(visit, monkeypatch):
        text = printed_text(page)
        assert 'TEST COMPANY' in text
        assert 'LABORATORY REPORT' in text
        assert patient.display_name.upper() in text
        assert visit.track_number in text


def test_every_profile_ends_with_its_own_end_of_report_and_sign_off(two_profiles, monkeypatch):
    visit, _, _ = two_profiles

    for page in laid_out_pages(visit, monkeypatch):
        assert printed_text(page).count('END OF REPORT') == 1
        assert signoff_on(page) is not None
        assert printed_text(signoff_on(page)).count('APPROVED BY') == 1


def test_each_page_is_signed_by_whoever_approved_its_profile(two_profiles, monkeypatch):
    visit, coagulation, hepatitis = two_profiles
    profile_results(visit, coagulation).update(
        result_approved=True, approved_by=staff('a@x.test', 'Amina', 'Otieno'), approved_on=timezone.now())
    profile_results(visit, hepatitis).update(
        result_approved=True, approved_by=staff('b@x.test', 'Baraka', 'Njoroge'), approved_on=timezone.now())

    first, second = [printed_text(signoff_on(page)) for page in laid_out_pages(visit, monkeypatch)]

    assert 'AMINA OTIENO' in first and 'BARAKA NJOROGE' not in first
    assert 'BARAKA NJOROGE' in second and 'AMINA OTIENO' not in second


def test_interpretations_and_comments_print_on_their_profiles_page(two_profiles, monkeypatch):
    visit, coagulation, hepatitis = two_profiles
    LabTestInterpretation.objects.create(test_profile=hepatitis, interpretation='Hepatitis reading')
    LabTestRequest.objects.filter(process=visit.process_test_req, test_profile=coagulation).update(
        lab_comment='Clotting comment')
    for row in results(visit):
        row.save()

    first, second = [printed_text(page) for page in laid_out_pages(visit, monkeypatch)]

    assert 'CLOTTING COMMENT' in first and 'CLOTTING COMMENT' not in second
    assert 'HEPATITIS READING' in second and 'HEPATITIS READING' not in first


def test_a_profile_that_runs_past_a_page_is_signed_once_at_its_end(api, patient, approver, monkeypatch):
    long_profile = main_profile(api, 'Long Profile', sort_order=1)
    names = [f'Test {number}' for number in range(LONG_REPORT)]
    for name in names:
        add_panel(long_profile, name)
    short_profile = main_profile(api, 'Short Profile', sort_order=2)
    add_panel(short_profile, 'Lone test')
    visit = request_tests(api, patient, [long_profile, short_profile],
                          {**{name: '1' for name in names}, 'Lone test': '1'})
    approve(visit, approver)

    pages = laid_out_pages(visit, monkeypatch)

    assert len(pages) > 2
    signed = [signoff_on(page) is not None for page in pages]
    # The long profile's last page and the short profile's page.
    assert signed == [False] * (len(pages) - 2) + [True, True]
    assert 'SHORT PROFILE' in printed_text(pages[-1])
    assert 'SHORT PROFILE' not in printed_text(pages[-2])
    for page in pages:
        signoff = signoff_on(page)
        for table in boxes_with_class(page, 'results'):
            if signoff:
                assert table.position_y + table.margin_height() <= signoff.position_y + 1


@pytest.fixture
def approver(db):
    return staff('approver@x.test', 'Amina', 'Otieno')
