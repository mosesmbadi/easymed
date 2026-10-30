"""
Items are tagged to the departments that use them, with 'General' meaning
"shared with everyone".
"""

import pytest

from inventory.models import Department, Item, ItemDepartment
from inventory.serializers import ItemSerializer


@pytest.fixture
def pharmacy(db):
    return Department.objects.create(name='Pharmacy')


@pytest.fixture
def lab(db):
    return Department.objects.create(name='Lab')


@pytest.fixture
def general(db):
    return Department.objects.create(name='General')


@pytest.fixture
def drug(db):
    return Item.objects.create(
        name='Amoxicillin 500mg', desc='Antibiotic', category='Drug',
        units_of_measure='capsules', item_code='DRG-00100')


@pytest.mark.django_db
def test_item_can_be_tagged_to_several_departments(drug, pharmacy, lab):
    ItemDepartment.objects.create(item=drug, department=pharmacy, is_primary=True)
    ItemDepartment.objects.create(item=drug, department=lab)

    assert set(drug.departments.values_list('name', flat=True)) == {'Pharmacy', 'Lab'}
    assert drug.is_available_to(pharmacy)
    assert drug.is_available_to(lab)


@pytest.mark.django_db
def test_an_item_cannot_be_tagged_to_the_same_department_twice(drug, pharmacy):
    from django.db.utils import IntegrityError

    ItemDepartment.objects.create(item=drug, department=pharmacy)
    with pytest.raises(IntegrityError):
        ItemDepartment.objects.create(item=drug, department=pharmacy)


@pytest.mark.django_db
def test_general_makes_an_item_shared_with_every_department(drug, general, lab, pharmacy):
    ItemDepartment.objects.create(item=drug, department=general)

    assert general.is_shared
    assert drug.is_available_to(lab)
    assert drug.is_available_to(pharmacy)


@pytest.mark.django_db
def test_tagging_one_department_hides_the_item_from_others(drug, pharmacy, lab):
    ItemDepartment.objects.create(item=drug, department=pharmacy)

    assert drug.is_available_to(pharmacy)
    assert not drug.is_available_to(lab)


@pytest.mark.django_db
def test_untagged_items_stay_available_everywhere(drug, lab):
    """Introducing tagging must not make existing stock vanish."""
    assert not drug.department_links.exists()
    assert drug.is_available_to(lab)


@pytest.mark.django_db
def test_serializer_writes_department_tags(pharmacy, lab):
    serializer = ItemSerializer(data={
        'name': 'Nitrile Gloves',
        'desc': 'Medium',
        'category': 'general',
        'units_of_measure': 'pairs',
        'departments': [pharmacy.id, lab.id],
    })
    assert serializer.is_valid(), serializer.errors
    item = serializer.save()

    assert set(item.departments.values_list('id', flat=True)) == {pharmacy.id, lab.id}
    # The first department listed owns the item.
    assert item.department_links.get(department=pharmacy).is_primary
    assert not item.department_links.get(department=lab).is_primary


@pytest.mark.django_db
def test_serializer_replaces_tags_on_update(drug, pharmacy, lab, general):
    ItemDepartment.objects.create(item=drug, department=pharmacy)

    serializer = ItemSerializer(drug, data={'departments': [general.id]}, partial=True)
    assert serializer.is_valid(), serializer.errors
    item = serializer.save()

    assert list(item.departments.values_list('name', flat=True)) == ['General']


@pytest.mark.django_db
def test_items_endpoint_filters_by_department(authenticated_client, drug, pharmacy, lab, general):
    ItemDepartment.objects.create(item=drug, department=pharmacy)

    shared = Item.objects.create(
        name='Syringe 5ml', desc='Disposable', category='general',
        units_of_measure='pieces', item_code='GEN-00100')
    ItemDepartment.objects.create(item=shared, department=general)

    response = authenticated_client.get('/inventory/items/', {'department': lab.id})
    assert response.status_code == 200

    rows = response.json()
    rows = rows['results'] if isinstance(rows, dict) else rows
    names = {row['name'] for row in rows}

    # The pharmacy-only drug is hidden; the General item is shared with the lab.
    assert 'Syringe 5ml' in names
    assert 'Amoxicillin 500mg' not in names


@pytest.mark.django_db
def test_lab_reagents_and_consumables_are_separate_categories():
    """
    Reagents are consumed running a test; consumables are consumed collecting
    a sample. They are tracked as distinct categories.
    """
    reagent = Item.objects.create(
        name='CBC Reagent Kit', desc='Hematology', category='LabReagent',
        units_of_measure='tests', item_code='LAB-00100')
    consumable = Item.objects.create(
        name='EDTA Tube', desc='Purple top', category='LabConsumable',
        units_of_measure='pieces', item_code='LAB-00101')

    assert reagent.is_stock_tracked
    assert consumable.is_stock_tracked
    assert reagent.category != consumable.category
    # Neither is something to sell. The panel a reagent feeds is the product
    # and carries its own billing item; a reagent spawning one as well left a
    # billable test at the till with no panel behind it.
    assert not Item.objects.filter(category='Lab Test').exists()
