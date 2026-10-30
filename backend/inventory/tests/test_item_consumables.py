"""
Accompaniments: what an item drags along, and what happens when it is missing.

The rule the whole feature exists for is the last one: an injection whose
syringes are not on the shelf must not be billable, and a tablet must be
unaffected by that.
"""

import pytest

from billing.models import Invoice, InvoiceItem, PaymentMode
from billing.services import check_stock_available
from inventory.models import Item, ItemConsumable, StockMovement
from inventory.serializers import ItemSerializer
from inventory.services import consumables as consumables_service
from inventory.services import stock as stock_service


@pytest.fixture
def syringe(db, department):
    item = Item.objects.create(
        name="Syringe 5ml", desc="Disposable syringe", category="LabConsumable",
        category_one="Internal", units_of_measure="pieces", item_code="CONS-SYR")
    stock_service.receive(
        item=item, department=department, quantity=50, unit_cost=5,
        lot_number='SYR-1')
    return item


@pytest.fixture
def swab(db, department):
    item = Item.objects.create(
        name="Alcohol Swab", desc="Skin prep swab", category="LabConsumable",
        category_one="Internal", units_of_measure="pieces", item_code="CONS-SWB")
    stock_service.receive(
        item=item, department=department, quantity=50, unit_cost=2,
        lot_number='SWB-1')
    return item


@pytest.fixture
def injection(db, department):
    item = Item.objects.create(
        name="Paracetamol 1g Injection", desc="IV paracetamol", category="Drug",
        units_of_measure="vials", item_code="DRG-PCM-INJ")
    stock_service.receive(
        item=item, department=department, quantity=20, unit_cost=180,
        lot_number='INJ-1')
    return item


# ---------------------------------------------------------------------------
# Declaring them
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_an_item_with_no_links_needs_nothing(item):
    """Tablets are the common case and must stay free of ceremony."""
    assert consumables_service.requirements(item) == []


@pytest.mark.django_db
def test_requirements_scale_with_quantity(injection, syringe):
    ItemConsumable.objects.create(item=injection, consumable=syringe, quantity_per_use=2)

    rows = consumables_service.requirements(injection, quantity=3)

    assert len(rows) == 1
    assert rows[0]['required_quantity'] == 6


@pytest.mark.django_db
def test_posting_consumables_replaces_the_whole_set(injection, syringe, swab):
    """An edit that drops the swab has to actually drop it."""
    serializer = ItemSerializer(injection, partial=True, data={'consumable_items': [
        {'consumable': syringe.id, 'quantity_per_use': 1},
        {'consumable': swab.id, 'quantity_per_use': 1},
    ]})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    assert injection.consumable_links.count() == 2

    serializer = ItemSerializer(injection, partial=True, data={'consumable_items': [
        {'consumable': syringe.id, 'quantity_per_use': 4},
    ]})
    serializer.is_valid(raise_exception=True)
    serializer.save()

    links = list(injection.consumable_links.all())
    assert len(links) == 1
    assert links[0].consumable_id == syringe.id
    assert links[0].quantity_per_use == 4


@pytest.mark.django_db
def test_an_item_cannot_accompany_itself(injection):
    serializer = ItemSerializer(injection, partial=True, data={
        'consumable_items': [{'consumable': injection.id}]})

    assert not serializer.is_valid()
    assert 'consumable_items' in serializer.errors


@pytest.mark.django_db
def test_a_service_cannot_be_an_accompaniment(injection):
    """A lab test holds no stock, so nothing can be deducted for it."""
    service = Item.objects.create(
        name="Consultation", desc="Appointment", category="General Appointment",
        units_of_measure="visits", item_code="SVC-1")

    serializer = ItemSerializer(injection, partial=True, data={
        'consumable_items': [{'consumable': service.id}]})

    assert not serializer.is_valid()


# ---------------------------------------------------------------------------
# Billing on them
# ---------------------------------------------------------------------------

def _line(patient, item, department, quantity=1):
    invoice = Invoice.objects.create(patient=patient)
    return InvoiceItem(
        invoice=invoice, item=item, quantity=quantity,
        payment_mode=PaymentMode.get_default(), source_tag=department)


@pytest.mark.django_db
def test_billing_allowed_when_consumables_are_in_stock(
    patient, injection, syringe, department
):
    ItemConsumable.objects.create(item=injection, consumable=syringe, quantity_per_use=1)

    ok, message = check_stock_available(_line(patient, injection, department))

    assert ok, message


@pytest.mark.django_db
def test_billing_blocked_when_a_required_consumable_is_out_of_stock(
    patient, injection, syringe, department
):
    """The rule the feature exists for: no syringe, no injection."""
    ItemConsumable.objects.create(item=injection, consumable=syringe, quantity_per_use=1)
    stock_service.issue(
        item=syringe, department=department,
        quantity=stock_service.on_hand_quantity(syringe, department),
        movement_type=StockMovement.Type.CONSUMPTION, reason='emptied')

    ok, message = check_stock_available(_line(patient, injection, department))

    assert not ok
    assert 'Syringe 5ml' in message
    assert 'Receive them into inventory first' in message


@pytest.mark.django_db
def test_an_optional_consumable_does_not_block(patient, injection, syringe, department):
    ItemConsumable.objects.create(
        item=injection, consumable=syringe, quantity_per_use=1, is_required=False)
    stock_service.issue(
        item=syringe, department=department,
        quantity=stock_service.on_hand_quantity(syringe, department),
        movement_type=StockMovement.Type.CONSUMPTION, reason='emptied')

    ok, _ = check_stock_available(_line(patient, injection, department))

    assert ok


@pytest.mark.django_db
def test_a_tablet_is_unaffected_by_an_empty_syringe_shelf(
    patient, item, syringe, department, opening_stock
):
    stock_service.issue(
        item=syringe, department=department,
        quantity=stock_service.on_hand_quantity(syringe, department),
        movement_type=StockMovement.Type.CONSUMPTION, reason='emptied')

    ok, _ = check_stock_available(_line(patient, item, department))

    assert ok


@pytest.mark.django_db
def test_a_partial_shortfall_still_blocks(patient, injection, syringe, department):
    """Two injections need two syringes; one on the shelf is not enough."""
    ItemConsumable.objects.create(item=injection, consumable=syringe, quantity_per_use=1)
    stock_service.issue(
        item=syringe, department=department,
        quantity=stock_service.on_hand_quantity(syringe, department) - 1,
        movement_type=StockMovement.Type.CONSUMPTION, reason='nearly emptied')

    ok, message = check_stock_available(_line(patient, injection, department, quantity=2))

    assert not ok
    assert 'need 2' in message


# ---------------------------------------------------------------------------
# Consuming them
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_billing_deducts_the_accompaniments(patient, injection, syringe, swab, department):
    from billing.services import post_stock_for_invoice_item

    ItemConsumable.objects.create(item=injection, consumable=syringe, quantity_per_use=2)
    ItemConsumable.objects.create(item=injection, consumable=swab, quantity_per_use=1)
    line = _line(patient, injection, department, quantity=3)
    line.save()

    post_stock_for_invoice_item(line)

    assert stock_service.on_hand_quantity(syringe, department) == 50 - 6
    assert stock_service.on_hand_quantity(swab, department) == 50 - 3


@pytest.mark.django_db
def test_consuming_twice_takes_stock_once(patient, injection, syringe, department):
    """A re-saved invoice line must not take a second syringe."""
    from billing.services import post_stock_for_invoice_item

    ItemConsumable.objects.create(item=injection, consumable=syringe, quantity_per_use=1)
    line = _line(patient, injection, department)
    line.save()

    post_stock_for_invoice_item(line)
    post_stock_for_invoice_item(line)

    assert stock_service.on_hand_quantity(syringe, department) == 49
