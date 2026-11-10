"""
The Test Panels list, fetched in bulk.

Serialising a panel used to look up its price, walk its profile's parents and
count each reagent's stock (twice) one panel at a time. A lab with a few
hundred panels waited seconds for the page. The list now fetches all of that
once (LabTestPanelSerializer.bulk_context). These tests hold it to giving the
same answers as the one-at-a-time path, at a cost that does not grow with
the number of panels.
"""

from decimal import Decimal

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from inventory.models import Department, Item
from inventory.services import stock as stock_service
from laboratory.models import (
    LabTestPanel,
    LabTestProfile,
    Specimen,
    SpecimenConsumable,
    TestPanelReagent,
)
from laboratory.serializers import LabTestPanelSerializer


@pytest.fixture
def lab(db):
    return Department.objects.create(name="Lab")


@pytest.fixture
def nested_profile(db):
    """Three deep, so the full name needs the parent walk."""
    outer = LabTestProfile.objects.create(name="Chemistry")
    middle = LabTestProfile.objects.create(name="Renal", parent=outer)
    return LabTestProfile.objects.create(name="Electrolytes", parent=middle)


@pytest.fixture
def blood(lab):
    specimen = Specimen.objects.create(name="Blood")
    syringe = Item.objects.create(
        name="Syringe", desc="5ml", category="LabConsumable",
        category_one="Internal", units_of_measure="pieces", item_code="SYR")
    stock_service.receive(item=syringe, department=lab, quantity=7,
                          unit_cost=Decimal('10'), lot_number='S1')
    SpecimenConsumable.objects.create(
        specimen=specimen, item=syringe, quantity_per_collection=1)
    return specimen


def make_panels(count, lab, profile, specimen, start=0):
    for n in range(start, start + count):
        item = Item.objects.create(
            name=f"Test {n}", desc="", category="Lab Test",
            units_of_measure="test", item_code=f"T-{n}")
        stock_service.set_sale_price(item, Decimal(100 + n))
        reagent = Item.objects.create(
            name=f"Reagent {n}", desc="", category="LabReagent",
            units_of_measure="tests", item_code=f"R-{n}")
        stock_service.receive(item=reagent, department=lab, quantity=10 + n,
                              unit_cost=Decimal('5'), lot_number=f"L{n}")
        panel = LabTestPanel.objects.create(
            name=f"Test {n}", specimen=specimen, test_profile=profile, item=item)
        TestPanelReagent.objects.create(
            test_panel=panel, reagent_item=reagent, units_consumed_per_run=3)
    # One unpriced, top-level, with no specimen or reagents, for the empty paths.
    if start == 0:
        LabTestPanel.objects.create(
            name="Bare", test_profile=LabTestProfile.objects.create(name="Loose"),
            item=Item.objects.create(name="Bare", desc="", category="Lab Test",
                                     units_of_measure="test", item_code="T-BARE"))


def panel_queryset():
    return LabTestPanel.objects.select_related(
        'item', 'specimen', 'test_profile', 'units').prefetch_related(
        'reagent_links__reagent_item', 'specimen__consumables__item',
        'reference_values').order_by('id')


def serialise_in_bulk():
    panels = list(panel_queryset())
    context = LabTestPanelSerializer.bulk_context(panels)
    return LabTestPanelSerializer(panels, many=True, context=context).data


def test_bulk_gives_the_same_answers_as_one_at_a_time(lab, nested_profile, blood):
    make_panels(3, lab, nested_profile, blood)

    one_at_a_time = LabTestPanelSerializer(panel_queryset(), many=True).data

    assert serialise_in_bulk() == one_at_a_time


def test_bulk_reads_what_it_should(lab, nested_profile, blood):
    make_panels(1, lab, nested_profile, blood)

    first, bare = serialise_in_bulk()

    assert first['test_profile_full_name'] == "Chemistry > Renal > Electrolytes"
    assert Decimal(first['sale_price']) == Decimal('100')
    assert first['reagents'][0]['available_quantity'] == 10
    assert first['available_runs'] == 3  # 10 on the shelf, 3 a run
    assert first['collection_consumables'][0]['available_quantity'] == 7
    assert bare['test_profile_full_name'] == "Loose"
    assert Decimal(bare['sale_price']) == 0
    assert bare['available_runs'] == 0
    assert bare['collection_consumables'] == []


def test_query_count_does_not_grow_with_the_panels(lab, nested_profile, blood):
    make_panels(3, lab, nested_profile, blood)
    with CaptureQueriesContext(connection) as few:
        serialise_in_bulk()

    make_panels(10, lab, nested_profile, blood, start=3)
    with CaptureQueriesContext(connection) as many:
        serialise_in_bulk()

    few_sql = {query['sql'] for query in few.captured_queries}
    repeated = [query['sql'] for query in many.captured_queries if query['sql'] not in few_sql]
    assert len(many) == len(few), "Queries run per panel:\n" + "\n".join(repeated[:5])
