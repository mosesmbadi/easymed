"""
Whole reports, every printed row in order, set up the way the lab's own tests are.

The other report tests check one thing each, which lets a wrong row order through.
These fail on any change to what prints or where. When one fails, compare it with
what the lab asked for: only change the expected rows if the change was intended.
"""
from decimal import Decimal

import html5lib
import pytest
from django.contrib.auth import get_user_model
from django.test import RequestFactory
from rest_framework.test import APIClient

from billing.models import PaymentMode
from inventory.models import Department, Item, Unit
from laboratory import views as lab_views
from laboratory.models import (
    LabTestPanel, LabTestProfile, LabTestRequest, LabTestRequestPanel, PatientSample, ReferenceValue, Specimen,
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
def lab_setup(db, company):
    Department.objects.get_or_create(name='Main', defaults={'is_stock_location': True})
    PaymentMode.objects.create(payment_mode='Cash', payment_category='cash', is_default=True)


def main_profile(api, name, sort_order=0):
    """Priced through the API, as the settings screen does it."""
    response = api.post(
        '/lab/lab-test-profile/', {'name': name, 'sale_price': '600.00', 'sort_order': sort_order}, format='json')
    assert response.status_code == 201, response.data
    return LabTestProfile.objects.get(pk=response.data['id'])


def sub_profile(main, name, sort_order):
    return LabTestProfile.objects.create(name=name, parent=main, sort_order=sort_order)


def add_panel(profile, name, order=0, unit=None, report_group=0, qualitative=False):
    specimen = Specimen.objects.get_or_create(name='Sample')[0]
    item = Item.objects.create(
        name=name, desc=name, category='Lab Test', units_of_measure='test', item_code=f'P-{name}')
    units = None
    if unit:
        units = Unit.objects.get_or_create(symbol=unit, defaults={'name': unit, 'category': 'concentration'})[0]
    return LabTestPanel.objects.create(
        name=name, test_profile=profile, specimen=specimen, item=item, units=units, sort_order=order,
        report_group=report_group, is_qualitative=qualitative, is_quantitative=not qualitative)


def add_range(panel, patient, low, high):
    """Ages left blank, so it covers every age."""
    ReferenceValue.objects.create(
        lab_test_panel=panel, sex=patient.gender, ref_value_low=Decimal(low), ref_value_high=Decimal(high))


def request_tests(api, patient, profiles, results):
    panels = [panel for profile in profiles for panel in profile.panels_in_report_order()]
    response = api.post('/lab/walk-in-requests/', {
        'patient': patient.id, 'profiles': [profile.id for profile in profiles],
        'panels': [panel.id for panel in panels],
    }, format='json')
    assert response.status_code == 201, response.data
    visit = AttendanceProcess.objects.get(pk=response.data['id'])
    for run in LabTestRequestPanel.objects.filter(lab_test_request__process=visit.process_test_req):
        run.result = results[run.test_panel.name]
        run.save()
    return visit


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


def cells(row):
    values = [' '.join(' '.join(cell.itertext()).split()) for cell in row.findall('td')]
    while values and not values[-1]:
        values.pop()
    return values


def report_rows(html):
    """What the results part of the report prints, top to bottom."""
    body = html5lib.parse(html, treebuilder='etree', namespaceHTMLElements=False).find('body')
    rows = []
    for element in body:
        classes = (element.get('class') or '').split()
        if 'results' in classes:
            # The profile's name heads its table, so it repeats on each page.
            title = element.find("thead/tr/th[@class='section-title']")
            rows.append(('section', title.text.strip()))
            for row in element.find('tbody').findall('tr'):
                kind = {'group-row': 'heading', 'block-gap': 'gap'}.get(row.get('class'), 'row')
                rows.append((kind, *cells(row)))
    return rows


def printed_rows(visit, monkeypatch):
    return report_rows(report_html(visit, monkeypatch))


CBC_RESULTS = {
    'RBC': '4.44', 'HGB': '12.4', 'HCT': '36.97', 'MCV': '83.4', 'MCH': '27.9', 'MCHC': '33.5', 'RDW': '36.9',
    'RDWc': '14.3', 'GRAN %': '41.0', 'LYMP %': '46.0', 'MID %': '13.0', 'WBC': '5.20', 'GRA': '2.13', 'LYM': '2.39',
    'MID': '0.68', 'PLT': '332', 'MPV': '7.2', 'PCT %': '0.24', 'PDWs': '9.6', 'PDWc': '38.4', 'P-LCC': '81',
    'P-LCR': '24.31',
}


def build_cbc(api):
    """
    As the lab's stands: moved under sub profiles, with the report groups left over
    from when it had none. Those were what printed RDW first despite its order of 7.
    """
    main = main_profile(api, 'Complete Blood Count (CBC)')
    # Created out of order on purpose.
    platelets = sub_profile(main, 'Platelets', 3)
    white = sub_profile(main, 'White Blood Cells', 2)
    red = sub_profile(main, 'Red Blood Cells', 1)

    for name, order, unit, group in [
        ('RDW', 7, 'fL', 1), ('RDWc', 8, '%', 3), ('MCHC', 6, 'g/dL', 2), ('MCH', 5, 'pg', 2), ('MCV', 4, 'fL', 3),
        ('HCT', 3, '%', 3), ('HGB', 2, 'g/dL', 2), ('RBC', 1, '10^12/L', 3),
    ]:
        add_panel(red, name, order, unit, group)
    for name, order, unit, group in [
        ('MID', 7, '10^9/L', 2), ('LYM', 6, '10^9/L', 2), ('GRA', 5, '10^9/L', 1), ('WBC', 4, '10^9/L', 2),
        ('MID %', 3, '%', 1), ('LYMP %', 2, '%', 1), ('GRAN %', 1, '%', 1),
    ]:
        add_panel(white, name, order, unit, group)
    for name, order, unit, group in [
        ('P-LCR', 7, None, 4), ('P-LCC', 6, None, 4), ('PDWc', 5, '%', 4), ('PDWs', 4, None, 4),
        ('PCT %', 3, '%', 1), ('MPV', 2, 'fL', 4), ('PLT', 1, '10^9/L', 4),
    ]:
        add_panel(platelets, name, order, unit, group)
    return main


def test_a_full_cbc(api, patient, monkeypatch):
    visit = request_tests(api, patient, [build_cbc(api)], CBC_RESULTS)

    assert printed_rows(visit, monkeypatch) == [
        ('section', 'Complete Blood Count (CBC)'),
        ('heading', 'Red Blood Cells'),
        ('row', 'RBC', '4.44', '10^12/L'),
        ('row', 'HGB', '12.4', 'g/dL'),
        ('row', 'HCT', '36.97', '%'),
        ('row', 'MCV', '83.4', 'fL'),
        ('row', 'MCH', '27.9', 'pg'),
        ('row', 'MCHC', '33.5', 'g/dL'),
        ('row', 'RDW', '36.9', 'fL'),
        ('row', 'RDWc', '14.3', '%'),
        ('heading', 'White Blood Cells'),
        ('row', 'GRAN %', '41.0', '%'),
        ('row', 'LYMP %', '46.0', '%'),
        ('row', 'MID %', '13.0', '%'),
        ('row', 'WBC', '5.20', '10^9/L'),
        ('row', 'GRA', '2.13', '10^9/L'),
        ('row', 'LYM', '2.39', '10^9/L'),
        ('row', 'MID', '0.68', '10^9/L'),
        ('heading', 'Platelets'),
        ('row', 'PLT', '332', '10^9/L'),
        ('row', 'MPV', '7.2', 'fL'),
        ('row', 'PCT %', '0.24', '%'),
        ('row', 'PDWs', '9.6'),
        ('row', 'PDWc', '38.4', '%'),
        ('row', 'P-LCC', '81'),
        ('row', 'P-LCR', '24.31'),
    ]


def test_a_urinalysis_runs_macroscopy_biochemistry_microscopy(api, patient, monkeypatch):
    main = main_profile(api, 'Urinalysis')
    micro = sub_profile(main, 'Urine Microscopy', 3)
    biochem = sub_profile(main, 'Urine Biochemistry', 2)
    macro = sub_profile(main, 'Urine Macroscopy', 1)
    add_panel(micro, 'Urine Microscopy')
    add_panel(biochem, 'Leuk', unit='pieces')
    add_panel(macro, 'Urine Macroscopy')

    visit = request_tests(api, patient, [main], {'Urine Microscopy': '3', 'Leuk': '3', 'Urine Macroscopy': '3'})

    assert printed_rows(visit, monkeypatch) == [
        ('section', 'Urinalysis'),
        ('heading', 'Urine Macroscopy', '3'),
        ('heading', 'Urine Biochemistry'),
        ('row', 'Leuk', '3', 'pieces'),
        ('heading', 'Urine Microscopy', '3'),
    ]


def test_a_uec_prints_its_ranges_and_flags(api, patient, monkeypatch):
    main = main_profile(api, 'UEC')
    for name, order, unit, low, high in [
        ('S-Sodium', 1, 'mmol/L', '135', '145'), ('S-Potassium', 2, 'mmol/L', '3.5', '5.5'),
        ('Urea', 3, 'mmol/L', '1.7', '8.3'), ('Creatinine', 4, 'µmol/L', '53', '97'),
    ]:
        add_range(add_panel(main, name, order, unit), patient, low, high)
    add_panel(main, 'eGFR', 5)

    visit = request_tests(api, patient, [main], {
        'S-Sodium': '137', 'S-Potassium': '3.2', 'Urea': '4.8', 'Creatinine': '120', 'eGFR': '99'})

    assert printed_rows(visit, monkeypatch) == [
        ('section', 'UEC'),
        ('row', 'S-Sodium', '137', 'mmol/L', '', '135.00 - 145.00'),
        ('row', 'S-Potassium', '3.2', 'mmol/L', 'L', '3.50 - 5.50'),
        ('row', 'Urea', '4.8', 'mmol/L', '', '1.70 - 8.30'),
        ('row', 'Creatinine', '120', 'µmol/L', 'H', '53.00 - 97.00'),
        ('row', 'eGFR', '99'),
    ]


def test_a_qualitative_test_prints_only_its_typed_result(api, patient, monkeypatch):
    main = main_profile(api, 'Stool Analysis')
    add_panel(main, 'Stool Macroscopy', qualitative=True)

    visit = request_tests(api, patient, [main], {'Stool Macroscopy': 'Brown, formed'})

    assert printed_rows(visit, monkeypatch) == [
        ('section', 'Stool Analysis'),
        ('row', 'Stool Macroscopy', 'Brown, formed'),
    ]


def test_two_tests_on_one_request_follow_their_report_order_not_the_order_requested(api, patient, monkeypatch):
    uec = main_profile(api, 'UEC', sort_order=2)
    add_panel(uec, 'Urea', unit='mmol/L')
    cbc = main_profile(api, 'CBC', sort_order=1)
    add_panel(sub_profile(cbc, 'Red Blood Cells', 1), 'RBC', unit='10^12/L')

    visit = request_tests(api, patient, [uec, cbc], {'Urea': '4.8', 'RBC': '4.44'})

    assert printed_rows(visit, monkeypatch) == [
        ('section', 'CBC'),
        ('heading', 'Red Blood Cells'),
        ('row', 'RBC', '4.44', '10^12/L'),
        ('section', 'UEC'),
        ('row', 'Urea', '4.8', 'mmol/L'),
    ]


def test_results_come_up_for_entry_in_the_order_the_report_prints(api, patient, monkeypatch):
    """Including a main profile numbered above its sub profiles, which the two used to disagree on."""
    main = main_profile(api, 'Panel', sort_order=5)
    add_panel(sub_profile(main, 'Second', 2), 'Delta')
    add_panel(sub_profile(main, 'First', 1), 'Gamma', order=2, report_group=9)
    add_panel(main, 'Beta', order=2)
    add_panel(main, 'Alpha', order=1, report_group=3)
    names = {'Alpha': '1', 'Beta': '1', 'Gamma': '1', 'Delta': '1'}

    visit = request_tests(api, patient, [main], names)
    printed = [row[1] for row in printed_rows(visit, monkeypatch) if row[0] == 'row']
    assert printed == ['Beta', 'Alpha', 'Gamma', 'Delta']

    request = LabTestRequest.objects.get(process=visit.process_test_req)
    by_request = api.get(f'/lab/lab-test-request-panels-by-lab-test-request-id/{request.id}/').data
    assert [row['test_panel_name'] for row in by_request] == printed

    sample = PatientSample.objects.get(process=visit.process_test_req)
    by_sample = api.get(f'/lab/labtestrequestpanels/sample/{sample.patient_sample_code}/').data
    assert [row['test_panel_name'] for row in by_sample] == printed
