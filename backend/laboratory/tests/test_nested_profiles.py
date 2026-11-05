"""
A main profile with sub profiles: requested as one thing, charged once, and
printed in sections in the order the lab sets.
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.test import RequestFactory
from rest_framework.test import APIClient

from billing.models import InvoiceItem, PaymentMode
from inventory.models import Department, Item
from inventory.services import stock as stock_service
from laboratory import views as lab_views
from laboratory.models import (
    LabTestInterpretation, LabTestPanel, LabTestProfile, LabTestRequest, LabTestRequestPanel, ReferenceValue, Specimen,
)
from patient.models import AttendanceProcess

User = get_user_model()


@pytest.fixture
def api(db):
    user = User.objects.create_user(
        email='tech@x.test', password='x', first_name='A', last_name='B', role='sysadmin',
        is_staff=True, is_superuser=True)
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture(autouse=True)
def stock_location(db):
    return Department.objects.get_or_create(name='Main', defaults={'is_stock_location': True})[0]


@pytest.fixture
def cash_mode(db):
    return PaymentMode.objects.create(payment_mode='Cash', payment_category='cash', is_default=True)


@pytest.fixture
def urine(db):
    return Specimen.objects.create(name='Urine')


def add_panel(name, profile, specimen, order=0, qualitative=False):
    item = Item.objects.create(
        name=name, desc=name, category='Lab Test', units_of_measure='test', item_code=f'P-{name}')
    return LabTestPanel.objects.create(
        name=name, test_profile=profile, specimen=specimen, item=item, sort_order=order,
        is_qualitative=qualitative, is_quantitative=not qualitative)


@pytest.fixture
def urinalysis(api, urine):
    """Priced through the API, as the settings screen does it."""
    response = api.post('/lab/lab-test-profile/', {'name': 'URINALYSIS REPORT', 'sale_price': '600.00'}, format='json')
    assert response.status_code == 201, response.data
    main = LabTestProfile.objects.get(pk=response.data['id'])
    # Created out of order on purpose: sort_order is what decides.
    biochem = LabTestProfile.objects.create(name='Biochemistry', parent=main, sort_order=3)
    macro = LabTestProfile.objects.create(name='Macroscopy', parent=main, sort_order=1)
    add_panel('SG', biochem, urine, order=2)
    add_panel('PH', biochem, urine, order=1)
    add_panel('Consistency', macro, urine, order=2, qualitative=True)
    add_panel('Colour', macro, urine, order=1, qualitative=True)
    return main


def test_a_profile_cannot_sit_under_itself(api, urinalysis):
    child = urinalysis.sub_profiles.first()

    assert api.patch(f'/lab/lab-test-profile/{urinalysis.id}/', {'parent': urinalysis.id},
                     format='json').status_code == 400
    assert api.patch(f'/lab/lab-test-profile/{urinalysis.id}/', {'parent': child.id},
                     format='json').status_code == 400


def test_profiles_list_in_tree_order_with_full_names(api, urinalysis):
    rows = api.get('/lab/lab-test-profile/').data

    names = [row['full_name'] for row in rows]
    assert names == [
        'URINALYSIS REPORT',
        'URINALYSIS REPORT > Macroscopy',
        'URINALYSIS REPORT > Biochemistry',
    ]
    assert rows[0]['sale_price'] == Decimal('600.00')


def test_requesting_a_main_profile_lists_every_panel_in_report_order(api, urinalysis):
    rows = api.get(f'/lab/lab-test-panel/labtestpanels-byprofile-id/{urinalysis.id}/').data

    assert [row['name'] for row in rows] == ['Colour', 'Consistency', 'PH', 'SG']


def walk_in(api, profile, patient):
    panels = profile.panels_in_report_order()
    response = api.post('/lab/walk-in-requests/', {
        'patient': patient.id, 'profiles': [profile.id], 'panels': [panel.id for panel in panels],
    }, format='json')
    assert response.status_code == 201, response.data
    return AttendanceProcess.objects.get(pk=response.data['id'])


def test_a_main_profile_is_one_request_charged_once_with_zero_panels(
        api, cash_mode, urinalysis, patient):
    visit = walk_in(api, urinalysis, patient)

    requests = LabTestRequest.objects.filter(process=visit.process_test_req)
    assert [request.test_profile_id for request in requests] == [urinalysis.id]

    lines = InvoiceItem.objects.filter(invoice=visit.invoice)
    assert lines.count() == 5
    charge = lines.get(item=urinalysis.item)
    assert charge.item_amount == Decimal('600.00')
    assert all(line.item_amount == 0 for line in lines.exclude(pk=charge.pk))
    visit.invoice.refresh_from_db()
    assert visit.invoice.invoice_amount == Decimal('600.00')


def test_billing_a_zero_panel_releases_it_to_the_lab(api, cash_mode, urinalysis, patient):
    visit = walk_in(api, urinalysis, patient)
    panel = LabTestPanel.objects.get(name='PH')
    line = InvoiceItem.objects.get(invoice=visit.invoice, item=panel.item)

    response = api.patch(f'/billing/invoice-items/{line.id}/', {'status': 'billed'}, format='json')

    assert response.status_code == 200, response.data
    run = LabTestRequestPanel.objects.get(test_panel=panel, lab_test_request__process=visit.process_test_req)
    assert run.is_billed is True


def test_the_doctors_route_charges_a_priced_profile_too(api, cash_mode, urinalysis, patient):
    """That screen posts the request itself, one record at a time."""
    visit = AttendanceProcess.objects.create(
        patient=patient, reason='Consult', created_by=User.objects.filter(is_staff=True).first())

    response = api.post('/lab/lab-test-requests/', {
        'test_profile': urinalysis.id, 'process': visit.process_test_req_id,
    }, format='json')

    assert response.status_code == 201, response.data
    assert InvoiceItem.objects.get(invoice=visit.invoice).item_id == urinalysis.item_id


def test_an_unpriced_profile_adds_no_line(api, cash_mode, urine, patient):
    plain = LabTestProfile.objects.create(name='Plain')
    panel = add_panel('Thing', plain, urine)
    stock_service.set_sale_price(panel.item, Decimal('100.00'))

    visit = walk_in(api, plain, patient)

    assert InvoiceItem.objects.get(invoice=visit.invoice).item_id == panel.item_id


def test_the_report_prints_sections_in_the_set_order(api, cash_mode, urinalysis, patient, company, monkeypatch):
    visit = walk_in(api, urinalysis, patient)
    for run in LabTestRequestPanel.objects.filter(lab_test_request__process=visit.process_test_req):
        run.result = '1.0'
        run.save()

    rendered = {}

    class FakeHTML:
        def __init__(self, string):
            rendered['html'] = string

        def write_pdf(self):
            return b'%PDF'

    monkeypatch.setattr(lab_views, 'HTML', FakeHTML)
    lab_views.render_labtestresult_pdf(RequestFactory().get('/'), visit.process_test_req_id)

    html = rendered['html']
    positions = [html.index(text) for text in (
        'URINALYSIS REPORT', 'Macroscopy', 'Colour', 'Consistency', 'Biochemistry', '>PH<', '>SG<')]
    assert positions == sorted(positions)


def report_html(api, profile, patient, monkeypatch, result):
    visit = walk_in(api, profile, patient)
    for run in LabTestRequestPanel.objects.filter(lab_test_request__process=visit.process_test_req):
        run.result = result
        run.save()

    rendered = {}

    class FakeHTML:
        def __init__(self, string):
            rendered['html'] = string

        def write_pdf(self):
            return b'%PDF'

    monkeypatch.setattr(lab_views, 'HTML', FakeHTML)
    lab_views.render_labtestresult_pdf(RequestFactory().get('/'), visit.process_test_req_id)
    return rendered['html']


def add_sg_range(patient):
    """Ages left blank, so it covers every age."""
    ReferenceValue.objects.create(
        lab_test_panel=LabTestPanel.objects.get(name='SG'), sex=patient.gender,
        ref_value_low=Decimal('0.50'), ref_value_high=Decimal('2.00'))


def test_a_result_in_range_prints_the_range_and_no_flag(api, cash_mode, urinalysis, patient, company, monkeypatch):
    add_sg_range(patient)

    html = report_html(api, urinalysis, patient, monkeypatch, '1.0')

    assert '0.50 - 2.00' in html
    assert '<td class="abnormal">L</td>' not in html
    assert '<td class="abnormal">H</td>' not in html


@pytest.mark.parametrize('result, flag', [('3.0', 'H'), ('0.1', 'L')])
def test_a_result_out_of_range_is_flagged_and_bold(api, cash_mode, urinalysis, patient, company, monkeypatch, result, flag):
    add_sg_range(patient)

    html = report_html(api, urinalysis, patient, monkeypatch, result)

    assert f'<td class="abnormal">{flag}</td>' in html
    assert f'<td class="abnormal">{result}</td>' in html


def test_a_main_profiles_interpretation_prints_once_under_its_name(
        api, cash_mode, urinalysis, patient, company, monkeypatch):
    LabTestInterpretation.objects.create(test_profile=urinalysis, interpretation='Review with the clinical picture')

    html = report_html(api, urinalysis, patient, monkeypatch, '1.0')

    assert html.count('Review with the clinical picture') == 1


def test_a_panel_with_no_range_prints_blank_not_na(api, cash_mode, urinalysis, patient, company, monkeypatch):
    html = report_html(api, urinalysis, patient, monkeypatch, '1.0')

    assert 'N/A' not in html


def test_the_report_itself_renders_to_pdf(api, cash_mode, urinalysis, patient, company):
    visit = walk_in(api, urinalysis, patient)
    for run in LabTestRequestPanel.objects.filter(lab_test_request__process=visit.process_test_req):
        run.result = '1.0'
        run.save()

    pdf = lab_views.render_labtestresult_pdf(RequestFactory().get('/'), visit.process_test_req_id)

    assert pdf.startswith(b'%PDF')
