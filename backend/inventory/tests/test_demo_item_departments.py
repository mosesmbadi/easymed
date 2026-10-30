"""
The demo data generator tags every item to the departments that use it.
"""

import pytest

from customuser.management.utils.data_generators import (
    CATEGORY_DEPARTMENTS,
    SHARED_DEPARTMENT_NAME,
    create_dummy_departments,
    create_item_department_links,
    departments_for_category,
    tag_item_departments,
)
from inventory.models import Department, Item, ItemDepartment
from inventory.services import stock as stock_service


@pytest.fixture
def departments(db):
    return create_dummy_departments()


def _item(name, category, code):
    return Item.objects.create(
        name=name, desc=name, category=category,
        units_of_measure='unit', item_code=code)


@pytest.mark.django_db
def test_generator_creates_the_canonical_lab_department(departments):
    """
    laboratory.utils.lab_department() looks for 'Lab', so the demo data must
    create that name and not 'Laboratory'.
    """
    names = set(Department.objects.values_list('name', flat=True))
    assert 'Lab' in names
    assert 'Laboratory' not in names
    assert {'General', 'Main', 'Pharmacy'} <= names


@pytest.mark.django_db
def test_tag_item_departments_marks_the_first_as_primary(departments):
    item = _item('Nitrile Gloves', 'general', 'GEN-90001')

    tag_item_departments(item, ['Pharmacy', 'Lab'])

    assert item.department_links.get(department__name='Pharmacy').is_primary
    assert not item.department_links.get(department__name='Lab').is_primary


@pytest.mark.django_db
def test_tag_item_departments_is_idempotent(departments):
    item = _item('Syringe 5ml', 'general', 'GEN-90002')

    tag_item_departments(item, ['Pharmacy'])
    tag_item_departments(item, ['Pharmacy'])

    assert item.department_links.count() == 1


@pytest.mark.django_db
def test_categories_map_to_their_owning_department():
    assert departments_for_category('Drug') == ['Pharmacy']
    assert departments_for_category('LabReagent') == ['Lab']
    assert departments_for_category('LabConsumable') == ['Lab']
    # Anything unmapped falls back to shared.
    assert departments_for_category('something-new') == [SHARED_DEPARTMENT_NAME]


@pytest.mark.django_db
def test_sweeper_tags_every_untagged_item(departments):
    drug = _item('Amoxicillin 500mg', 'Drug', 'DRG-90001')
    reagent = _item('CBC Reagent Kit', 'LabReagent', 'LAB-90001')
    consumable = _item('EDTA Tube', 'LabConsumable', 'LAB-90002')
    furniture = _item('Waiting Bench', 'Furniture', 'FUR-90001')

    stats = create_item_department_links()

    assert stats['tagged'] >= 4
    assert list(drug.departments.values_list('name', flat=True)) == ['Pharmacy']
    assert list(reagent.departments.values_list('name', flat=True)) == ['Lab']
    assert list(consumable.departments.values_list('name', flat=True)) == ['Lab']
    assert list(furniture.departments.values_list('name', flat=True)) == [SHARED_DEPARTMENT_NAME]


@pytest.mark.django_db
def test_sweeper_leaves_existing_tags_alone(departments):
    item = _item('Amoxicillin 500mg', 'Drug', 'DRG-90002')
    lab = Department.objects.get(name='Lab')
    tag_item_departments(item, ['Lab'])

    stats = create_item_department_links()

    assert stats['already_tagged'] >= 1
    assert list(item.departments.values_list('name', flat=True)) == ['Lab']
    assert item.department_links.get(department=lab).is_primary


@pytest.mark.django_db
def test_sweeper_follows_where_stock_actually_sits(departments):
    """
    A location holding stock beats the category's guess, and becomes primary.
    """
    item = _item('Surgical Blade', 'SurgicalEquipment', 'SUR-90001')
    theatre = Department.objects.get(name='Surgery')
    stock_service.receive(item=item, department=theatre, quantity=10, unit_cost=5)

    create_item_department_links()

    assert item.department_links.get(department=theatre).is_primary


@pytest.mark.django_db
def test_sweeper_is_rerunnable(departments):
    _item('Paracetamol 500mg', 'Drug', 'DRG-90003')

    first = create_item_department_links()
    second = create_item_department_links()

    assert second['tagged'] == 0
    assert second['links'] == first['links']
    assert ItemDepartment.objects.count() == first['links']


@pytest.mark.django_db
def test_every_category_choice_has_a_department(departments):
    """No item category should end up untagged."""
    for category, _label in Item.CATEGORY_CHOICES:
        names = departments_for_category(category)
        assert names, f"{category} maps to no department"
        assert Department.objects.filter(name__in=names).count() == len(names), (
            f"{category} maps to {names}, which the generator does not create"
        )


@pytest.mark.django_db
def test_category_map_only_names_real_departments(departments):
    for category, names in CATEGORY_DEPARTMENTS.items():
        for name in names:
            assert Department.objects.filter(name=name).exists(), (
                f"{category} maps to '{name}', which is not in DEPARTMENTS"
            )
