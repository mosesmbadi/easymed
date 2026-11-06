"""
The sign-off on the lab report: Requested By, Done By and Approved By, at the foot
of the last page.

These tests are here to stop it being changed by accident, as has happened during
a layout rewrite. If one fails, restore the sign-off. Only change a test when
removing or changing the sign-off has been specifically asked for.

Position is read from WeasyPrint's laid-out pages. `_page_box` is private, so
upgrading WeasyPrint could need a change to the helpers here.
"""
import pytest
from django.contrib.auth import get_user_model
from django.test import RequestFactory
from django.utils import timezone
from rest_framework.test import APIClient
from weasyprint import HTML
from weasyprint.formatting_structure.boxes import TextBox

from inventory.models import Department, Item
from billing.models import PaymentMode
from laboratory import views as lab_views
from laboratory.models import LabTestPanel, LabTestProfile, LabTestRequest, LabTestRequestPanel, Specimen
from patient.models import AttendanceProcess

User = get_user_model()

# Enough rows to run past one page.
LONG_REPORT = 100


def staff(email, first_name, last_name, **fields):
    return User.objects.create_user(
        email=email, password='x', first_name=first_name, last_name=last_name, role='sysadmin', **fields)


@pytest.fixture
def api(db):
    client = APIClient()
    client.force_authenticate(staff('admin@x.test', 'Admin', 'User', is_staff=True, is_superuser=True))
    return client


@pytest.fixture(autouse=True)
def lab_setup(db):
    Department.objects.get_or_create(name='Main', defaults={'is_stock_location': True})
    PaymentMode.objects.create(payment_mode='Cash', payment_category='cash', is_default=True)


@pytest.fixture
def approver(db):
    return staff(
        'approver@x.test', 'Amina', 'Otieno', profession='Pathologist',
        registration_number='REG-778', phone='0700111222')


@pytest.fixture
def make_visit(api, patient, company):
    def make(panel_count):
        response = api.post('/lab/lab-test-profile/', {'name': 'Panel', 'sale_price': '600.00'}, format='json')
        assert response.status_code == 201, response.data
        profile = LabTestProfile.objects.get(pk=response.data['id'])
        specimen = Specimen.objects.create(name='Blood')
        panels = []
        for number in range(panel_count):
            name = f'Test {number}'
            item = Item.objects.create(
                name=name, desc=name, category='Lab Test', units_of_measure='test', item_code=f'P-{number}')
            panels.append(LabTestPanel.objects.create(name=name, test_profile=profile, specimen=specimen, item=item))

        response = api.post('/lab/walk-in-requests/', {
            'patient': patient.id, 'profiles': [profile.id], 'panels': [panel.id for panel in panels],
        }, format='json')
        assert response.status_code == 201, response.data
        visit = AttendanceProcess.objects.get(pk=response.data['id'])
        results(visit).update(result='1.0')
        return visit
    return make


def results(visit):
    return LabTestRequestPanel.objects.filter(lab_test_request__process=visit.process_test_req)


def approve(visit, approver, approved_on=None):
    results(visit).update(
        result_approved=True, approved_by=approver, approved_on=approved_on or timezone.now())


def report_html(visit, monkeypatch):
    rendered = {}

    class CapturingHTML:
        def __init__(self, string):
            rendered['html'] = string

        def write_pdf(self):
            return b'%PDF'

    monkeypatch.setattr(lab_views, 'HTML', CapturingHTML)
    lab_views.render_labtestresult_pdf(RequestFactory().get('/'), visit.process_test_req_id)
    return rendered['html']


def laid_out_pages(visit, monkeypatch):
    return [page._page_box for page in HTML(string=report_html(visit, monkeypatch)).render().pages]


def walk(box):
    yield box
    for child in getattr(box, 'children', ()):
        yield from walk(child)


def boxes_with_class(page, name):
    found = []
    for box in walk(page):
        element = getattr(box, 'element', None)
        if element is not None and name in (element.get('class') or '').split():
            found.append(box)
    return found


def signoff_on(page):
    found = boxes_with_class(page, 'signoff-pinned')
    return found[0] if found else None


def printed_text(box):
    """What can be read on paper, in capitals: some headings are uppercased by CSS."""
    texts = [item.text for item in walk(box)
             if isinstance(item, TextBox) and item.style['visibility'] == 'visible']
    return ' '.join(' '.join(texts).split()).upper()


def printed_signoff(visit, monkeypatch):
    pages = laid_out_pages(visit, monkeypatch)
    signoff = signoff_on(pages[-1])
    assert signoff is not None, 'the sign-off is missing from the last page'
    return printed_text(signoff)


def test_it_has_all_three_parts(make_visit, approver, monkeypatch):
    visit = make_visit(1)
    approve(visit, approver)

    text = printed_signoff(visit, monkeypatch)

    assert 'REQUESTED BY' in text
    assert 'DONE BY' in text
    assert 'APPROVED BY' in text
    assert text.index('REQUESTED BY') < text.index('DONE BY') < text.index('APPROVED BY')


def test_requested_by_names_the_referrer(make_visit, monkeypatch):
    visit = make_visit(1)
    LabTestRequest.objects.filter(process=visit.process_test_req).update(
        referring_doctor='Dr Kamau', referring_facility='Lakeside Clinic', external_reference='EXT9')

    assert 'DR KAMAU, LAKESIDE CLINIC (REF. EXT9)' in printed_signoff(visit, monkeypatch)


def test_requested_by_falls_back_to_the_visits_doctor(make_visit, monkeypatch):
    visit = make_visit(1)
    AttendanceProcess.objects.filter(pk=visit.pk).update(doctor=staff('doc@x.test', 'Wanjiku', 'Mwangi'))

    assert 'WANJIKU MWANGI' in printed_signoff(visit, monkeypatch)


def test_done_by_names_the_lab_tech(make_visit, monkeypatch):
    visit = make_visit(1)
    AttendanceProcess.objects.filter(pk=visit.pk).update(lab_tech=staff('tech@x.test', 'Baraka', 'Njoroge'))

    assert 'BARAKA NJOROGE' in printed_signoff(visit, monkeypatch)


def test_approved_by_carries_the_approvers_details_and_date(make_visit, approver, monkeypatch):
    visit = make_visit(1)
    approved_on = timezone.now()
    approve(visit, approver, approved_on)

    text = printed_signoff(visit, monkeypatch)

    assert 'AMINA OTIENO' in text
    assert 'PATHOLOGIST' in text
    assert 'REG-778' in text
    assert '0700111222' in text
    assert timezone.localtime(approved_on).strftime('%d/%m/%Y %H:%M') in text


def test_approved_by_carries_the_approvers_signature(make_visit, approver, monkeypatch):
    visit = make_visit(1)
    User.objects.filter(pk=approver.pk).update(signature='signatures/amina.png')
    approve(visit, approver)

    assert 'signatures/amina.png' in report_html(visit, monkeypatch)


def test_an_unapproved_report_keeps_the_sign_off_and_says_so(make_visit, monkeypatch):
    text = printed_signoff(make_visit(1), monkeypatch)

    assert 'REQUESTED BY' in text
    assert 'DONE BY' in text
    assert 'APPROVED BY' in text
    assert 'RESULTS NOT YET APPROVED' in text


@pytest.mark.parametrize('panel_count', [1, LONG_REPORT])
def test_it_prints_once_on_the_last_page_only(make_visit, approver, monkeypatch, panel_count):
    visit = make_visit(panel_count)
    approve(visit, approver)

    pages = laid_out_pages(visit, monkeypatch)

    if panel_count == LONG_REPORT:
        assert len(pages) > 1
    assert [signoff_on(page) is not None for page in pages] == [False] * (len(pages) - 1) + [True]
    assert sum(printed_text(page).count('APPROVED BY') for page in pages) == 1


@pytest.mark.parametrize('panel_count', [1, LONG_REPORT])
def test_it_sits_at_the_foot_of_the_page(make_visit, approver, monkeypatch, panel_count):
    visit = make_visit(panel_count)
    approve(visit, approver)

    page = laid_out_pages(visit, monkeypatch)[-1]
    signoff = signoff_on(page)

    foot_of_page = page.content_box_y() + page.height
    assert signoff.position_y + signoff.margin_height() == pytest.approx(foot_of_page, abs=1)


# Counts either side of where the last page runs out of room for the sign-off.
@pytest.mark.parametrize('panel_count', [30, 35, 40, 45, 50, 55])
def test_results_never_run_under_it(make_visit, approver, monkeypatch, panel_count):
    visit = make_visit(panel_count)
    approve(visit, approver)

    page = laid_out_pages(visit, monkeypatch)[-1]
    signoff = signoff_on(page)

    for table in boxes_with_class(page, 'results'):
        assert table.position_y + table.margin_height() <= signoff.position_y + 1
