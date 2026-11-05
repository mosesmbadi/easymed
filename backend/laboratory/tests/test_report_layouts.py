"""The commands that put a lab's existing panels under the report's headings."""
from io import StringIO

import pytest
from django.core.management import CommandError, call_command

from inventory.models import Item
from laboratory.models import LabTestPanel, LabTestProfile, Specimen

pytestmark = pytest.mark.django_db


def add_panels(profile, *names):
    specimen = Specimen.objects.get_or_create(name='Sample')[0]
    panels = []
    for name in names:
        item = Item.objects.create(
            name=name, desc=name, category='Lab Test', units_of_measure='test', item_code=f'P-{name}')
        panels.append(LabTestPanel.objects.create(
            name=name, test_profile=profile, specimen=specimen, item=item, report_group=4))
    return panels


def run(command, *args):
    out = StringIO()
    call_command(command, *args, stdout=out)
    return out.getvalue()


def report_order(profile):
    return [(panel.test_profile.name, panel.name) for panel in profile.panels_in_report_order()]


def test_the_cbc_groups_under_rbc_wbc_and_platelets_in_that_order():
    main = LabTestProfile.objects.create(name='Complete Blood Count (CBC)')
    add_panels(main, 'PLT', 'WBC', 'LYM%', 'HCT', 'HGB', 'RBC')

    run('arrange_cbc_report')

    assert report_order(main) == [
        ('RBC', 'RBC'), ('RBC', 'HGB'), ('RBC', 'HCT'),
        ('WBC', 'WBC'), ('WBC', 'LYM%'),
        ('Platelets', 'PLT'),
    ]


def test_urinalysis_runs_macroscopy_then_the_strip_in_order_then_microscopy():
    main = LabTestProfile.objects.create(name='Urinalysis')
    add_panels(main, 'Pus Cells', 'GLU', 'BIL', 'KET', 'SG', 'BLD', 'pH', 'PRO', 'URO', 'NIT', 'LEU', 'Colour')

    run('arrange_urinalysis_report')

    assert report_order(main) == [
        ('Macroscopy', 'Colour'),
        ('Biochemistry', 'LEU'), ('Biochemistry', 'NIT'), ('Biochemistry', 'URO'), ('Biochemistry', 'PRO'),
        ('Biochemistry', 'pH'), ('Biochemistry', 'BLD'), ('Biochemistry', 'SG'), ('Biochemistry', 'KET'),
        ('Biochemistry', 'BIL'), ('Biochemistry', 'GLU'),
        ('Microscopy', 'Pus Cells'),
    ]


def test_a_panel_is_found_under_the_labs_own_name_and_keeps_it():
    main = LabTestProfile.objects.create(name='URINALYSIS REPORT')
    add_panels(main, 'protein', 'Leukocytes')

    run('arrange_urinalysis_report')

    assert report_order(main) == [('Biochemistry', 'Leukocytes'), ('Biochemistry', 'protein')]


def test_moving_a_panel_leaves_its_billing_item_alone():
    main = LabTestProfile.objects.create(name='CBC')
    panel = add_panels(main, 'RBC')[0]
    item_id = panel.item_id

    run('arrange_cbc_report')

    panel.refresh_from_db()
    assert panel.item_id == item_id
    assert panel.test_profile.parent == main
    assert panel.report_group == 0


def test_running_it_again_changes_nothing():
    main = LabTestProfile.objects.create(name='CBC')
    add_panels(main, 'RBC', 'WBC')

    run('arrange_cbc_report')
    before = report_order(main)
    run('arrange_cbc_report')

    assert report_order(main) == before
    assert LabTestProfile.objects.filter(parent=main).count() == 2


def test_an_existing_heading_is_reused_and_renamed_and_empty_ones_are_not_made():
    main = LabTestProfile.objects.create(name='CBC')
    existing = LabTestProfile.objects.create(name='Rbc', parent=main)
    add_panels(existing, 'HGB')

    run('arrange_cbc_report')

    existing.refresh_from_db()
    assert existing.name == 'RBC'
    assert list(LabTestProfile.objects.filter(parent=main)) == [existing]


def test_it_reports_what_it_could_not_place_and_leaves_it_where_it_was():
    main = LabTestProfile.objects.create(name='CBC')
    add_panels(main, 'RBC', 'ESR')

    output = run('arrange_cbc_report')

    assert 'left where they were: ESR' in output
    assert 'No panel for: HGB' in output
    assert LabTestPanel.objects.get(name='ESR').test_profile == main


def test_two_matching_main_profiles_must_be_told_apart():
    LabTestProfile.objects.create(name='Urinalysis')
    report = LabTestProfile.objects.create(name='URINALYSIS REPORT')
    add_panels(report, 'SG')

    with pytest.raises(CommandError, match='--profile'):
        run('arrange_urinalysis_report')

    run('arrange_urinalysis_report', '--profile', 'URINALYSIS REPORT')
    assert report_order(report) == [('Biochemistry', 'SG')]


def test_no_matching_main_profile_is_an_error():
    with pytest.raises(CommandError, match='--profile'):
        run('arrange_cbc_report')
