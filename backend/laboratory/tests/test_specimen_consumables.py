"""
What a lab test costs, and when each half of it leaves stock.

The rule the whole arrangement exists for is the middle group: a syringe
belongs to the draw, not to the test, so three panels off one sample spend one
syringe and a re-test off an archived sample spends none.
"""

from decimal import Decimal

import pytest
from rest_framework.exceptions import ValidationError

from inventory.models import Department, Item, ItemConsumable
from inventory.serializers import ItemSerializer
from inventory.services import consumables as consumables_service
from inventory.services import stock as stock_service
from laboratory.models import (
    LabTestPanel,
    LabTestRequestPanel,
    PatientSample,
    PatientSampleConsumable,
    SpecimenConsumable,
)
from laboratory.serializers import LabTestPanelSerializer, SpecimenSerializer


@pytest.fixture
def lab_department(db):
    """`laboratory.utils.lab_department` looks this up by name."""
    return Department.objects.create(name="Lab")


@pytest.fixture
def syringe(lab_department):
    item = Item.objects.create(
        name="Syringe 5ml", desc="Disposable syringe", category="LabConsumable",
        category_one="Internal", units_of_measure="pieces", item_code="LAB-SYR")
    stock_service.receive(
        item=item, department=lab_department, quantity=10, unit_cost=5,
        lot_number='SYR-1')
    return item


@pytest.fixture
def tube(lab_department):
    item = Item.objects.create(
        name="EDTA Tube", desc="Blood collection tube", category="LabConsumable",
        category_one="Internal", units_of_measure="pieces", item_code="LAB-TUBE")
    stock_service.receive(
        item=item, department=lab_department, quantity=10, unit_cost=8,
        lot_number='TUBE-1')
    return item


@pytest.fixture
def blood(specimen, syringe, tube):
    """A specimen that costs one syringe and one tube to collect."""
    SpecimenConsumable.objects.create(
        specimen=specimen, item=syringe, quantity_per_collection=1)
    SpecimenConsumable.objects.create(
        specimen=specimen, item=tube, quantity_per_collection=1)
    return specimen


@pytest.fixture
def panel_item(db):
    return Item.objects.create(
        name="Urea", desc="Urea test", category="Lab Test",
        units_of_measure="test", item_code="LAB-UREA")


@pytest.fixture
def urea(blood, lab_test_profile, panel_item):
    return LabTestPanel.objects.create(
        name="Urea", specimen=blood, test_profile=lab_test_profile, item=panel_item)


def collect(lab_test_request, process_test_request, specimen):
    """A sample, drawn. Creating it collected is what fires the deduction."""
    return PatientSample.objects.create(
        lab_test_request=lab_test_request,
        process=process_test_request,
        specimen=specimen,
        is_sample_collected=True,
    )


# ---------------------------------------------------------------------------
# The draw
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_collecting_a_sample_spends_the_specimens_items(
        blood, syringe, tube, lab_department, lab_test_request, process_test_request):
    sample = collect(lab_test_request, process_test_request, blood)

    assert stock_service.available_quantity(syringe, lab_department) == 9
    assert stock_service.available_quantity(tube, lab_department) == 9
    assert sample.consumables_used.count() == 2


@pytest.mark.django_db
def test_an_uncollected_sample_spends_nothing(
        blood, syringe, lab_department, lab_test_request, process_test_request):
    """Ordering the test is not drawing the blood."""
    PatientSample.objects.create(
        lab_test_request=lab_test_request,
        process=process_test_request,
        specimen=blood,
        is_sample_collected=False,
    )

    assert stock_service.available_quantity(syringe, lab_department) == 10


@pytest.mark.django_db
def test_re_saving_a_collected_sample_spends_nothing_more(
        blood, syringe, lab_department, lab_test_request, process_test_request):
    """
    The post_save fires on every touch of a collected sample. Without the
    per-(sample, item) guard, each one would take another syringe.
    """
    sample = collect(lab_test_request, process_test_request, blood)
    sample.save()
    sample.save()

    assert stock_service.available_quantity(syringe, lab_department) == 9
    assert sample.consumables_used.count() == 2


@pytest.mark.django_db
def test_short_stock_is_recorded_rather_than_refused(
        specimen, lab_department, lab_test_request, process_test_request):
    """
    By the time this runs the tube is already full. Refusing to record a sample
    that physically exists would help nobody, so the shortfall is written down.
    """
    swab = Item.objects.create(
        name="Alcohol Swab", desc="Skin prep", category="LabConsumable",
        category_one="Internal", units_of_measure="pieces", item_code="LAB-SWB")
    stock_service.receive(
        item=swab, department=lab_department, quantity=1, unit_cost=2, lot_number='SWB-1')
    SpecimenConsumable.objects.create(
        specimen=specimen, item=swab, quantity_per_collection=3)

    sample = collect(lab_test_request, process_test_request, specimen)

    row = sample.consumables_used.get(item=swab)
    assert row.quantity == 1
    assert row.quantity_required == 3
    assert row.is_short


# ---------------------------------------------------------------------------
# Several tests off one draw, and the re-test
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_several_panels_off_one_draw_spend_one_syringe(
        urea, blood, syringe, lab_department, lab_test_request, lab_test_profile):
    """
    Two tests, one arm, one syringe. This is the whole reason the link hangs
    off the specimen rather than off the test.
    """
    second_item = Item.objects.create(
        name="Creatinine", desc="Creatinine test", category="Lab Test",
        units_of_measure="test", item_code="LAB-CREA")
    creatinine = LabTestPanel.objects.create(
        name="Creatinine", specimen=blood, test_profile=lab_test_profile,
        item=second_item)

    for panel in (urea, creatinine):
        LabTestRequestPanel.objects.create(
            test_panel=panel, lab_test_request=lab_test_request)

    sample = PatientSample.objects.get(specimen=blood)
    sample.is_sample_collected = True
    sample.save()

    assert stock_service.available_quantity(syringe, lab_department) == 9
    assert sample.consumables_used.get(item=syringe).quantity == 1


@pytest.mark.django_db
def test_a_retest_spends_no_collection_items(
        urea, blood, syringe, lab_department, lab_test_request, lab_test_profile):
    """
    A re-test comes out of the archive. Nobody draws anything, so nothing that
    belongs to the draw is charged again -- only the reagents the new run burns.
    """
    LabTestRequestPanel.objects.create(
        test_panel=urea, lab_test_request=lab_test_request)
    sample = PatientSample.objects.get(specimen=blood)
    sample.is_sample_collected = True
    sample.save()

    before = stock_service.available_quantity(syringe, lab_department)

    # The retest attaches a new panel to the same process and specimen, which
    # is what lands it on the sample that was already drawn.
    retest_item = Item.objects.create(
        name="Urea Repeat", desc="Repeat urea", category="Lab Test",
        units_of_measure="test", item_code="LAB-UREA-R")
    repeat = LabTestPanel.objects.create(
        name="Urea Repeat", specimen=blood, test_profile=lab_test_profile,
        item=retest_item)
    retest_panel = LabTestRequestPanel.objects.create(
        test_panel=repeat, lab_test_request=lab_test_request)

    assert retest_panel.patient_sample_id == sample.id
    assert stock_service.available_quantity(syringe, lab_department) == before
    assert PatientSampleConsumable.objects.filter(patient_sample=sample).count() == 2


# ---------------------------------------------------------------------------
# Pricing the panel
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_panel_price_lands_on_its_billing_item(urea, panel_item):
    serializer = LabTestPanelSerializer(urea, partial=True, data={'sale_price': '200.00'})
    serializer.is_valid(raise_exception=True)
    serializer.save()

    panel_item.refresh_from_db()
    assert panel_item.current_sale_price == Decimal('200.00')
    assert urea.sale_price == Decimal('200.00')


@pytest.mark.django_db
def test_a_new_panel_makes_its_own_billing_item(blood, lab_test_profile, lab_department):
    """
    The panel is the product, so nothing has to exist in inventory before it
    can be sold. Reagents used to spawn billing items for this; they no
    longer do, so the panel has to.
    """
    serializer = LabTestPanelSerializer(data={
        'name': 'Creatinine', 'specimen': blood.id,
        'test_profile': lab_test_profile.id, 'sale_price': '350.00',
    })
    serializer.is_valid(raise_exception=True)
    panel = serializer.save()

    assert panel.item.name == 'Creatinine'
    assert panel.item.category == 'Lab Test'
    assert panel.item.departments.filter(pk=lab_department.pk).exists()
    assert panel.sale_price == Decimal('350.00')


@pytest.mark.django_db
def test_a_panel_cannot_take_over_another_panels_billing_item(urea, blood, lab_test_profile):
    """Two panels on one item would share a price and bill the patient twice."""
    serializer = LabTestPanelSerializer(data={
        'name': 'Urea', 'specimen': blood.id, 'test_profile': lab_test_profile.id,
    })
    serializer.is_valid(raise_exception=True)

    with pytest.raises(ValidationError):
        serializer.save()


@pytest.mark.django_db
def test_a_reagent_cannot_be_priced(db):
    """The lab sells the panel, not the reagent it is made of."""
    reagent = Item.objects.create(
        name="ALT Reagent", desc="ALT/AST", category="LabReagent",
        units_of_measure="tests", item_code="LAB-ALT")

    serializer = ItemSerializer(reagent, partial=True, data={'sale_price': '900.00'})

    assert not serializer.is_valid()
    assert 'sale_price' in serializer.errors


@pytest.mark.django_db
def test_an_internal_consumable_cannot_be_priced(syringe):
    serializer = ItemSerializer(syringe, partial=True, data={'sale_price': '20.00'})

    assert not serializer.is_valid()
    assert 'sale_price' in serializer.errors


@pytest.mark.django_db
def test_a_drug_can_still_be_priced(db):
    """Pharmacy sells what is on its shelf; nothing here changes that."""
    drug = Item.objects.create(
        name="Panadol 500mg", desc="Paracetamol", category="Drug",
        units_of_measure="tablets", item_code="DRG-PCM")

    serializer = ItemSerializer(drug, partial=True, data={'sale_price': '15.00'})
    serializer.is_valid(raise_exception=True)
    serializer.save()

    drug.refresh_from_db()
    assert drug.current_sale_price == Decimal('15.00')


# ---------------------------------------------------------------------------
# Keeping the two sides apart
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_a_lab_item_cannot_carry_accompaniments(panel_item, syringe):
    """
    Its syringe is on the specimen and its reagents are on the panel. A third
    declaration here would take the same syringe twice.
    """
    serializer = ItemSerializer(panel_item, partial=True, data={'consumable_items': [
        {'consumable': syringe.id, 'quantity_per_use': 1},
    ]})

    assert not serializer.is_valid()
    assert 'consumable_items' in serializer.errors


@pytest.mark.django_db
def test_a_stale_lab_accompaniment_is_inert(panel_item, syringe):
    """
    Rows predating the split are ignored rather than double-deducting, so an
    unmigrated database cannot quietly charge twice.
    """
    ItemConsumable.objects.create(item=panel_item, consumable=syringe, quantity_per_use=1)

    assert consumables_service.requirements(panel_item) == []


@pytest.mark.django_db
def test_a_drug_keeps_its_accompaniments(syringe):
    """The pharmacy case the item-level link was always right for."""
    injection = Item.objects.create(
        name="Paracetamol 1g Injection", desc="IV paracetamol", category="Drug",
        units_of_measure="vials", item_code="DRG-PCM-INJ")
    ItemConsumable.objects.create(item=injection, consumable=syringe, quantity_per_use=2)

    rows = consumables_service.requirements(injection, quantity=3)

    assert len(rows) == 1
    assert rows[0]['required_quantity'] == 6


@pytest.mark.django_db
def test_a_panel_takes_reagents_only(urea, syringe):
    serializer = LabTestPanelSerializer(urea, partial=True, data={'reagent_items': [
        {'reagent_item': syringe.id, 'units_consumed_per_run': 1},
    ]})

    assert not serializer.is_valid()
    assert 'reagent_items' in serializer.errors


@pytest.mark.django_db
def test_a_specimen_takes_internal_consumables_only(specimen, panel_item):
    serializer = SpecimenSerializer(specimen, partial=True, data={'consumable_items': [
        {'item': panel_item.id, 'quantity_per_collection': 1},
    ]})

    assert not serializer.is_valid()
    assert 'consumable_items' in serializer.errors


@pytest.mark.django_db
def test_posting_collection_items_replaces_the_whole_set(blood, syringe, tube):
    """An edit that drops the tube has to actually drop it."""
    serializer = SpecimenSerializer(blood, partial=True, data={'consumable_items': [
        {'item': syringe.id, 'quantity_per_collection': 2},
    ]})
    serializer.is_valid(raise_exception=True)
    serializer.save()

    links = list(blood.consumables.all())
    assert [link.item_id for link in links] == [syringe.id]
    assert links[0].quantity_per_collection == 2
