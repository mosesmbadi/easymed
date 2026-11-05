"""Which reference range a patient gets, and what a panel still needs set up."""
from decimal import Decimal
from types import SimpleNamespace

import pytest

from inventory.models import Item, Unit
from laboratory.models import LabTestPanel, LabTestProfile, ReferenceValue, Specimen
from laboratory.serializers import LabTestPanelSerializer

pytestmark = pytest.mark.django_db


def person(gender='F', age=30):
    return SimpleNamespace(gender=gender, age=age)


def add_panel(name='WBC', qualitative=False, units=None):
    item = Item.objects.create(
        name=name, desc=name, category='Lab Test', units_of_measure='test', item_code=f'P-{name}')
    return LabTestPanel.objects.create(
        name=name, item=item, units=units,
        test_profile=LabTestProfile.objects.create(name=f'{name} profile'),
        specimen=Specimen.objects.create(name=f'{name} specimen'),
        is_qualitative=qualitative, is_quantitative=not qualitative)


def add_range(panel, sex='F', age_min=None, age_max=None):
    return ReferenceValue.objects.create(
        lab_test_panel=panel, sex=sex, age_min=age_min, age_max=age_max,
        ref_value_low=Decimal('4.00'), ref_value_high=Decimal('11.00'))


def test_blank_ages_cover_every_age():
    panel = add_panel()
    reference = add_range(panel)

    assert panel.reference_range_for(person(age=0)) == reference
    assert panel.reference_range_for(person(age=95)) == reference


@pytest.mark.parametrize('age_min, age_max, age, matches', [
    (18, None, 18, True),
    (18, None, 90, True),
    (18, None, 17, False),
    (None, 12, 12, True),
    (None, 12, 13, False),
    (18, 60, 30, True),
    (18, 60, 61, False),
])
def test_one_blank_age_leaves_only_that_side_open(age_min, age_max, age, matches):
    panel = add_panel()
    reference = add_range(panel, age_min=age_min, age_max=age_max)

    assert panel.reference_range_for(person(age=age)) == (reference if matches else None)


def test_the_most_specific_ages_win():
    panel = add_panel()
    add_range(panel)
    add_range(panel, age_min=18)
    closest = add_range(panel, age_min=18, age_max=60)

    assert panel.reference_range_for(person(age=30)) == closest


def test_a_patient_of_unknown_age_only_matches_a_range_for_every_age():
    panel = add_panel()
    add_range(panel, age_min=18, age_max=60)

    assert panel.reference_range_for(person(age=None)) is None

    every_age = add_range(panel)
    assert panel.reference_range_for(person(age=None)) == every_age


def test_a_range_for_the_other_sex_does_not_apply():
    panel = add_panel()
    add_range(panel, sex='M')

    assert panel.reference_range_for(person(gender='F')) is None


def test_other_uses_its_own_range_before_falling_back_to_male():
    panel = add_panel()
    male = add_range(panel, sex='M')

    assert panel.reference_range_for(person(gender='O')) == male

    other = add_range(panel, sex='O')
    assert panel.reference_range_for(person(gender='O')) == other


def test_the_panel_api_returns_the_patients_range():
    panel = add_panel()
    add_range(panel)

    data = LabTestPanelSerializer(panel, context={'patient': person()}).data

    assert data['reference_values']['low'] == Decimal('4.00')
    assert data['reference_values']['high'] == Decimal('11.00')


def test_a_numeric_panel_reports_what_it_is_missing():
    panel = add_panel()

    assert LabTestPanelSerializer(panel).data['missing_setup'] == ['unit', 'reference range']


def test_a_complete_numeric_panel_is_missing_nothing():
    unit = Unit.objects.create(symbol='%', name='percent', category='hematology')
    panel = add_panel(units=unit)
    add_range(panel)

    data = LabTestPanelSerializer(panel).data

    assert data['missing_setup'] == []
    assert data['unit_symbol'] == '%'


def test_a_qualitative_panel_needs_neither():
    assert add_panel(qualitative=True).missing_setup() == []
