"""
Tests for the stock ledger.

These cover the properties the old mutable-quantity design could not offer:
an audit trail, safe concurrent issues, FEFO with expiry exclusion, reversal
instead of deletion, idempotent posting, and balances that can always be
rebuilt from the ledger.
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone

from inventory.models import (
    Department,
    Item,
    ItemPrice,
    ItemUnit,
    StockBalance,
    StockLot,
    StockMovement,
    StockPolicy,
    StockReservation,
    StockTake,
    StockTakeLine,
)
from inventory.services import stock as stock_service
from inventory.services.stock import InsufficientStock, NotStockTracked, StockError


@pytest.fixture
def pharmacy(db):
    return Department.objects.create(name='Pharmacy')


@pytest.fixture
def lab(db):
    return Department.objects.create(name='Lab')


@pytest.fixture
def drug(db):
    return Item.objects.create(
        name='Paracetamol 500mg',
        desc='Painkiller',
        category='Drug',
        units_of_measure='tablets',
        item_code='DRG-00001',
    )


# ---------------------------------------------------------------------------
# Receiving
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_receipt_creates_movement_and_balance(drug, pharmacy):
    movement = stock_service.receive(
        item=drug, department=pharmacy, quantity=100, unit_cost=Decimal('5.00'),
        lot_number='LOT-A', expiry_date=date.today() + timedelta(days=365),
    )

    assert movement.movement_type == StockMovement.Type.RECEIPT
    assert movement.quantity == 100
    assert movement.balance_after == 100

    balance = StockBalance.objects.get(item=drug, department=pharmacy)
    assert balance.quantity == 100
    assert balance.unit_cost == Decimal('5.0000')


@pytest.mark.django_db
def test_unbatched_receipts_land_on_one_lot(drug, pharmacy):
    stock_service.receive(item=drug, department=pharmacy, quantity=10, unit_cost=1)
    stock_service.receive(item=drug, department=pharmacy, quantity=5, unit_cost=1)

    assert StockLot.objects.filter(item=drug).count() == 1
    assert StockBalance.objects.get(item=drug, department=pharmacy).quantity == 15


@pytest.mark.django_db
def test_receipt_at_a_new_price_does_not_revalue_old_stock_away(drug, pharmacy):
    """
    A second delivery blends into a weighted average instead of overwriting
    the cost of what is already on the shelf.
    """
    stock_service.receive(item=drug, department=pharmacy, quantity=100, unit_cost=Decimal('10'))
    stock_service.receive(item=drug, department=pharmacy, quantity=100, unit_cost=Decimal('20'))

    balance = StockBalance.objects.get(item=drug, department=pharmacy)
    assert balance.quantity == 200
    assert balance.unit_cost == Decimal('15.0000')


@pytest.mark.django_db
def test_receipt_is_idempotent(drug, pharmacy):
    first = stock_service.receive(
        item=drug, department=pharmacy, quantity=50, unit_cost=1, idempotency_key='grn-1')
    second = stock_service.receive(
        item=drug, department=pharmacy, quantity=50, unit_cost=1, idempotency_key='grn-1')

    assert first.pk == second.pk
    assert StockBalance.objects.get(item=drug, department=pharmacy).quantity == 50


@pytest.mark.django_db
def test_service_items_hold_no_stock(pharmacy):
    consultation = Item.objects.create(
        name='General Consultation', desc='Visit', category='General Appointment',
        units_of_measure='session', item_code='SVC-00001')

    assert consultation.is_stock_tracked is False
    with pytest.raises(NotStockTracked):
        stock_service.receive(item=consultation, department=pharmacy, quantity=1)


# ---------------------------------------------------------------------------
# Issuing
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_issue_uses_fefo_across_lots(drug, pharmacy):
    stock_service.receive(
        item=drug, department=pharmacy, quantity=10, unit_cost=1,
        lot_number='LATE', expiry_date=date.today() + timedelta(days=300))
    stock_service.receive(
        item=drug, department=pharmacy, quantity=10, unit_cost=1,
        lot_number='SOON', expiry_date=date.today() + timedelta(days=30))

    movements = stock_service.issue(item=drug, department=pharmacy, quantity=15)

    # The nearest-expiry lot is emptied first.
    assert movements[0].lot.lot_number == 'SOON'
    assert movements[0].quantity == -10
    assert movements[1].lot.lot_number == 'LATE'
    assert movements[1].quantity == -5


@pytest.mark.django_db
def test_issue_in_packs_converts_to_base_units(drug, pharmacy):
    stock_service.receive(item=drug, department=pharmacy, quantity=100, unit_cost=1)
    box = ItemUnit.objects.create(item=drug, name='Box', factor_to_base=20)

    stock_service.issue(item=drug, department=pharmacy, quantity=2, item_unit=box)

    assert stock_service.on_hand_quantity(drug, pharmacy) == 60


@pytest.mark.django_db
def test_requisition_quantities_are_in_the_ordering_unit(drug):
    """Six boxes of twenty is six on the line and 120 in the ledger's terms."""
    from inventory.models import Requisition, RequisitionItem
    from customuser.models import CustomUser

    box = ItemUnit.objects.create(item=drug, name='Box', factor_to_base=20)
    department = Department.objects.create(name='Stores')
    user = CustomUser.objects.create_user(email='req@mail.com', password='x')
    requisition = Requisition.objects.create(department=department, requested_by=user)

    line = RequisitionItem.objects.create(
        requisition=requisition, item=drug, item_unit=box, quantity_requested=6)

    assert line.quantity_requested == 6
    assert line.base_quantity_requested == 120
    assert line.unit_label == 'Box'
    # quantity_approved defaults to what was requested, in the same unit.
    assert line.base_quantity_approved == 120


@pytest.mark.django_db
def test_issue_rejects_a_pack_belonging_to_another_item(drug, pharmacy):
    stock_service.receive(item=drug, department=pharmacy, quantity=100, unit_cost=1)
    other = Item.objects.create(
        name='Amoxicillin', category='Drug', units_of_measure='caps', item_code='DRG-00002')
    foreign_box = ItemUnit.objects.create(item=other, name='Box', factor_to_base=20)

    with pytest.raises(StockError):
        stock_service.issue(item=drug, department=pharmacy, quantity=1, item_unit=foreign_box)


@pytest.mark.django_db
def test_expired_stock_is_not_issued(drug, pharmacy):
    stock_service.receive(
        item=drug, department=pharmacy, quantity=10, unit_cost=1,
        lot_number='OLD', expiry_date=date.today() - timedelta(days=1))

    assert stock_service.available_quantity(drug, pharmacy) == 0
    with pytest.raises(InsufficientStock):
        stock_service.issue(item=drug, department=pharmacy, quantity=1)


@pytest.mark.django_db
def test_issue_cannot_oversell(drug, pharmacy):
    stock_service.receive(item=drug, department=pharmacy, quantity=5, unit_cost=1)

    with pytest.raises(InsufficientStock):
        stock_service.issue(item=drug, department=pharmacy, quantity=6)

    # Nothing was taken on the way to failing.
    assert StockBalance.objects.get(item=drug, department=pharmacy).quantity == 5


@pytest.mark.django_db
def test_one_department_cannot_drain_another(drug, pharmacy, lab):
    stock_service.receive(item=drug, department=lab, quantity=100, unit_cost=1)

    with pytest.raises(InsufficientStock):
        stock_service.issue(item=drug, department=pharmacy, quantity=1)


@pytest.mark.django_db
def test_issue_records_cost_for_cogs(drug, pharmacy):
    stock_service.receive(item=drug, department=pharmacy, quantity=10, unit_cost=Decimal('7.50'))
    stock_service.issue(item=drug, department=pharmacy, quantity=4)

    assert stock_service.cost_of_goods_sold(item=drug) == Decimal('30.0000')


@pytest.mark.django_db
def test_issue_is_idempotent(drug, pharmacy):
    stock_service.receive(item=drug, department=pharmacy, quantity=20, unit_cost=1)

    stock_service.issue(item=drug, department=pharmacy, quantity=5, idempotency_key='inv-1')
    stock_service.issue(item=drug, department=pharmacy, quantity=5, idempotency_key='inv-1')

    assert StockBalance.objects.get(item=drug, department=pharmacy).quantity == 15


# ---------------------------------------------------------------------------
# Append-only guarantees
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_movements_cannot_be_edited_or_deleted(drug, pharmacy):
    movement = stock_service.receive(item=drug, department=pharmacy, quantity=10, unit_cost=1)

    movement.quantity = 999
    with pytest.raises(DjangoValidationError):
        movement.save()

    with pytest.raises(DjangoValidationError):
        movement.delete()


@pytest.mark.django_db
def test_reversal_undoes_a_movement_without_erasing_it(drug, pharmacy):
    receipt = stock_service.receive(item=drug, department=pharmacy, quantity=10, unit_cost=1)

    contra = stock_service.reverse(receipt, reason='Keyed in error')

    assert contra.quantity == -10
    assert contra.reverses_id == receipt.pk
    assert StockBalance.objects.get(item=drug, department=pharmacy).quantity == 0
    # Both sides survive for the audit trail.
    assert StockMovement.objects.filter(item=drug).count() == 2


@pytest.mark.django_db
def test_a_movement_can_only_be_reversed_once(drug, pharmacy):
    receipt = stock_service.receive(item=drug, department=pharmacy, quantity=10, unit_cost=1)
    stock_service.reverse(receipt, reason='Keyed in error')

    with pytest.raises(StockError):
        stock_service.reverse(receipt, reason='Again')


# ---------------------------------------------------------------------------
# Transfers, adjustments, expiry
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_transfer_moves_stock_between_locations(drug, pharmacy, lab):
    stock_service.receive(
        item=drug, department=pharmacy, quantity=30, unit_cost=Decimal('3'), lot_number='L1')

    out_movements, in_movements = stock_service.transfer(
        item=drug, from_department=pharmacy, to_department=lab, quantity=10)

    assert stock_service.on_hand_quantity(drug, pharmacy) == 20
    assert stock_service.on_hand_quantity(drug, lab) == 10
    # Both legs share one reference, and cost travels with the stock.
    assert out_movements[0].reference == in_movements[0].reference
    assert StockBalance.objects.get(item=drug, department=lab).unit_cost == Decimal('3.0000')


@pytest.mark.django_db
def test_adjustment_requires_a_reason(drug, pharmacy):
    lot = stock_service.get_or_create_lot(drug)
    with pytest.raises(StockError):
        stock_service.adjust(
            item=drug, lot=lot, department=pharmacy, quantity_delta=5, reason='')


@pytest.mark.django_db
def test_expired_stock_is_written_off_not_deleted(drug, pharmacy):
    stock_service.receive(
        item=drug, department=pharmacy, quantity=10, unit_cost=Decimal('2'),
        lot_number='OLD', expiry_date=date.today() - timedelta(days=1))

    movements = stock_service.write_off_expired()

    assert len(movements) == 1
    assert movements[0].movement_type == StockMovement.Type.EXPIRY_WRITE_OFF
    assert StockBalance.objects.get(item=drug, department=pharmacy).quantity == 0
    # The lot and its history are still there, unlike the old archive-and-delete.
    assert StockLot.objects.filter(item=drug, lot_number='OLD').exists()


# ---------------------------------------------------------------------------
# Reservations
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_reservation_reduces_availability_but_not_stock(drug, pharmacy):
    stock_service.receive(item=drug, department=pharmacy, quantity=10, unit_cost=1)
    stock_service.reserve(item=drug, department=pharmacy, quantity=4)

    assert stock_service.on_hand_quantity(drug, pharmacy) == 10
    assert stock_service.available_quantity(drug, pharmacy) == 6


@pytest.mark.django_db
def test_cannot_reserve_more_than_is_available(drug, pharmacy):
    stock_service.receive(item=drug, department=pharmacy, quantity=10, unit_cost=1)
    stock_service.reserve(item=drug, department=pharmacy, quantity=8)

    with pytest.raises(InsufficientStock):
        stock_service.reserve(item=drug, department=pharmacy, quantity=5)


@pytest.mark.django_db
def test_consuming_a_reservation_issues_the_stock(drug, pharmacy):
    stock_service.receive(item=drug, department=pharmacy, quantity=10, unit_cost=1)
    reservation = stock_service.reserve(item=drug, department=pharmacy, quantity=4)

    stock_service.consume_reservation(reservation)

    reservation.refresh_from_db()
    assert reservation.status == StockReservation.Status.CONSUMED
    assert stock_service.on_hand_quantity(drug, pharmacy) == 6


@pytest.mark.django_db
def test_stale_reservations_expire(drug, pharmacy):
    stock_service.receive(item=drug, department=pharmacy, quantity=10, unit_cost=1)
    stock_service.reserve(
        item=drug, department=pharmacy, quantity=4,
        expires_at=timezone.now() - timedelta(minutes=1))

    stock_service.expire_stale_reservations()

    assert stock_service.available_quantity(drug, pharmacy) == 10


# ---------------------------------------------------------------------------
# Stock takes, reorder, reporting
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_stock_take_posts_the_variance_as_an_adjustment(drug, pharmacy, django_user_model):
    receipt = stock_service.receive(
        item=drug, department=pharmacy, quantity=10, unit_cost=1, lot_number='L1')

    stock_take = StockTake.objects.create(department=pharmacy)
    StockTakeLine.objects.create(
        stock_take=stock_take, lot=receipt.lot, system_quantity=10, counted_quantity=7,
        note='Three missing')

    movements = stock_service.post_stock_take(stock_take)

    assert len(movements) == 1
    assert movements[0].quantity == -3
    assert movements[0].movement_type == StockMovement.Type.ADJUSTMENT
    stock_take.refresh_from_db()
    assert stock_take.status == StockTake.Status.POSTED
    assert StockBalance.objects.get(item=drug, department=pharmacy).quantity == 7


@pytest.mark.django_db
def test_reorder_level_is_per_item_per_location(drug, pharmacy):
    """
    Two lots each under the level do not each count as a shortage -- the item's
    total at the location is what matters.
    """
    StockPolicy.objects.create(item=drug, department=pharmacy, re_order_level=5)
    stock_service.receive(item=drug, department=pharmacy, quantity=4, unit_cost=1, lot_number='A')
    stock_service.receive(item=drug, department=pharmacy, quantity=4, unit_cost=1, lot_number='B')

    assert stock_service.items_below_reorder_level() == []

    stock_service.issue(item=drug, department=pharmacy, quantity=4)
    rows = stock_service.items_below_reorder_level()
    assert len(rows) == 1
    assert rows[0]['quantity'] == 4
    assert rows[0]['re_order_level'] == 5


@pytest.mark.django_db
def test_stock_as_of_reconstructs_history(drug, pharmacy):
    stock_service.receive(item=drug, department=pharmacy, quantity=10, unit_cost=1)
    checkpoint = timezone.now()
    stock_service.issue(item=drug, department=pharmacy, quantity=6)

    assert stock_service.stock_as_of(item=drug, as_of=checkpoint) == 10
    assert stock_service.stock_as_of(item=drug) == 4


@pytest.mark.django_db
def test_last_issue_at_drives_slow_moving(drug, pharmacy):
    """
    The old implementation compared an instance against itself after saving, so
    last_deducted_at was never set and the slow-moving report was always empty.
    """
    stock_service.receive(item=drug, department=pharmacy, quantity=10, unit_cost=1)
    balance = StockBalance.objects.get(item=drug, department=pharmacy)
    assert balance.last_issue_at is None

    stock_service.issue(item=drug, department=pharmacy, quantity=1)
    balance.refresh_from_db()
    assert balance.last_issue_at is not None


@pytest.mark.django_db
def test_balances_can_be_rebuilt_from_the_ledger(drug, pharmacy):
    stock_service.receive(item=drug, department=pharmacy, quantity=10, unit_cost=1)
    stock_service.issue(item=drug, department=pharmacy, quantity=3)

    # Simulate something writing stock outside the service layer.
    StockBalance.objects.filter(item=drug, department=pharmacy).update(quantity=999)

    drift = stock_service.rebuild_balances()

    assert len(drift) == 1
    assert drift[0]['cached'] == 999
    assert drift[0]['ledger'] == 7
    assert StockBalance.objects.get(item=drug, department=pharmacy).quantity == 7


@pytest.mark.django_db
def test_stock_valuation_uses_weighted_average_cost(drug, pharmacy):
    stock_service.receive(item=drug, department=pharmacy, quantity=10, unit_cost=Decimal('4'))
    result = stock_service.stock_valuation()
    assert result['total_units'] == 10
    assert result['total_value'] == Decimal('40.0000')


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_setting_a_price_closes_the_previous_one(drug):
    yesterday = timezone.localdate() - timedelta(days=1)
    ItemPrice.objects.create(item=drug, sale_price=Decimal('50'), effective_from=yesterday)

    stock_service.set_sale_price(drug, Decimal('60'))

    assert drug.current_sale_price == Decimal('60')
    old = ItemPrice.objects.get(sale_price=Decimal('50'))
    assert old.effective_to == timezone.localdate() - timedelta(days=1)


@pytest.mark.django_db
def test_price_is_deterministic_regardless_of_lots(drug, pharmacy):
    """
    Price used to be read off `active_inventory_items.first()` with no ordering,
    so it varied with whichever lot the database returned first.
    """
    stock_service.set_sale_price(drug, Decimal('25'))
    stock_service.receive(item=drug, department=pharmacy, quantity=5, unit_cost=1, lot_number='A')
    stock_service.receive(item=drug, department=pharmacy, quantity=5, unit_cost=9, lot_number='B')

    assert drug.current_sale_price == Decimal('25')
