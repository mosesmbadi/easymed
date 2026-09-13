"""
The only writer of stock.

Every change to stock is a row appended to `StockMovement`; `StockBalance` is a
derived cache updated in the same transaction, under a row lock, so concurrent
dispensing cannot lose an update. Nothing else in the codebase may write to
StockMovement or StockBalance directly.

Conventions
-----------
* Everything persisted is in BASE units. Callers may hand `issue` an
  `item_unit` to work in packs; it converts before anything is written.
* Movement quantities are signed. Positive = stock arriving, negative = leaving.
* Issues allocate FEFO (first expiry, first out), skipping expired lots unless
  explicitly allowed.
* Costing is weighted average per lot per location. Every movement stores the
  unit cost it applied, so COGS is a sum over the ledger, never a guess.
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import F, Q, Sum
from django.utils import timezone

from ..models import (
    Department,
    Item,
    ItemPrice,
    StockBalance,
    StockLot,
    StockMovement,
    StockPolicy,
    StockReservation,
    StockTake,
)

logger = logging.getLogger(__name__)

ZERO = Decimal('0')


class StockError(Exception):
    """Base class for stock domain errors."""


class InsufficientStock(StockError):
    def __init__(self, item, requested, available, department=None):
        self.item = item
        self.requested = requested
        self.available = available
        self.department = department
        where = f" at {department.name}" if department else ""
        super().__init__(
            f"Insufficient stock for {item.name}{where}: "
            f"requested {requested}, available {available}."
        )


class NotStockTracked(StockError):
    def __init__(self, item):
        self.item = item
        super().__init__(f"{item.name} is a service item and holds no stock.")


@dataclass(frozen=True)
class Allocation:
    """One lot's share of an issue."""
    lot: StockLot
    quantity: int
    unit_cost: Decimal


# ---------------------------------------------------------------------------
# Lots and balances
# ---------------------------------------------------------------------------

def get_or_create_lot(item, lot_number=None, expiry_date=None, supplier=None):
    """
    Resolve the lot identity for an item. `lot_number` is normalised to '' so
    that every un-batched receipt of an item lands on one lot rather than
    creating a new row per delivery.
    """
    lot_number = (lot_number or '').strip()
    try:
        with transaction.atomic():
            lot, _ = StockLot.objects.get_or_create(
                item=item,
                lot_number=lot_number,
                expiry_date=expiry_date,
                defaults={'supplier': supplier},
            )
    except IntegrityError:
        # Another transaction created the same lot between our SELECT and
        # INSERT; the partial unique constraints make that safe to recover.
        lot = StockLot.objects.get(item=item, lot_number=lot_number, expiry_date=expiry_date)
    return lot


def _lock_balance(item, lot, department):
    """
    Fetch the balance row for one item/lot/location with a row lock, creating
    it on first use. The lock is what makes concurrent issues safe.
    """
    try:
        with transaction.atomic():
            balance, _ = StockBalance.objects.get_or_create(
                item=item, lot=lot, department=department,
                defaults={'quantity': 0, 'unit_cost': ZERO},
            )
    except IntegrityError:
        balance = StockBalance.objects.get(item=item, lot=lot, department=department)
    # Re-read under FOR UPDATE so the caller holds the row for the whole txn.
    return StockBalance.objects.select_for_update().get(pk=balance.pk)


def _assert_tracked(item):
    if not item.is_stock_tracked:
        raise NotStockTracked(item)


def _resolve_department(department):
    if department is None:
        raise StockError("A stock location (department) is required.")
    return department


def _direction_ok(movement_type, quantity):
    if movement_type in StockMovement.INFLOW_TYPES:
        return quantity > 0
    if movement_type in StockMovement.OUTFLOW_TYPES:
        return quantity < 0
    return quantity != 0


# ---------------------------------------------------------------------------
# The primitive: post one movement
# ---------------------------------------------------------------------------

@transaction.atomic
def post_movement(
    *,
    item,
    lot,
    department,
    quantity,
    movement_type,
    unit_cost=None,
    performed_by=None,
    reason='',
    occurred_at=None,
    reference=None,
    source_type=StockMovement.Source.MANUAL,
    source_id=None,
    source_reference='',
    goods_receipt_note=None,
    incoming_item=None,
    reverses=None,
    idempotency_key=None,
    allow_negative=False,
):
    """
    Append one movement and roll the derived balance forward.

    Returns the created StockMovement, or the existing one when
    `idempotency_key` has already been posted (so a retried request is a no-op
    rather than a double posting).
    """
    _assert_tracked(item)
    department = _resolve_department(department)

    if quantity == 0:
        raise StockError("A stock movement of zero has no meaning.")

    if not _direction_ok(movement_type, quantity):
        raise StockError(
            f"{movement_type} movements cannot have quantity {quantity:+d}."
        )

    if idempotency_key:
        existing = StockMovement.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            logger.info("Movement %s already posted for key %s", existing.id, idempotency_key)
            return existing

    balance = _lock_balance(item, lot, department)

    if quantity < 0 and not allow_negative and balance.quantity + quantity < 0:
        raise InsufficientStock(item, -quantity, balance.quantity, department)

    now = timezone.now()
    occurred_at = occurred_at or now

    if quantity > 0:
        # Weighted average: incoming units at their own cost blend into the lot.
        incoming_cost = ZERO if unit_cost is None else Decimal(str(unit_cost))
        prior_qty = max(balance.quantity, 0)
        total_qty = prior_qty + quantity
        if total_qty > 0:
            new_cost = (
                (Decimal(prior_qty) * balance.unit_cost) + (Decimal(quantity) * incoming_cost)
            ) / Decimal(total_qty)
        else:
            new_cost = incoming_cost
        applied_cost = incoming_cost
        balance.unit_cost = new_cost.quantize(Decimal('0.0001'))
    else:
        # Issues leave at the lot's current average cost unless overridden.
        applied_cost = balance.unit_cost if unit_cost is None else Decimal(str(unit_cost))

    balance.quantity = balance.quantity + quantity
    balance.last_movement_at = now
    if quantity > 0:
        balance.last_receipt_at = now
    else:
        balance.last_issue_at = now
    balance.save(update_fields=[
        'quantity', 'unit_cost', 'last_movement_at', 'last_receipt_at', 'last_issue_at',
    ])

    movement = StockMovement.objects.create(
        reference=reference or uuid.uuid4(),
        movement_type=movement_type,
        item=item,
        lot=lot,
        department=department,
        quantity=quantity,
        unit_cost=applied_cost,
        balance_after=balance.quantity,
        occurred_at=occurred_at,
        performed_by=performed_by,
        reason=reason or '',
        source_type=source_type,
        source_id=source_id,
        source_reference=source_reference or '',
        goods_receipt_note=goods_receipt_note,
        incoming_item=incoming_item,
        reverses=reverses,
        idempotency_key=idempotency_key,
    )
    return movement


# ---------------------------------------------------------------------------
# Receiving
# ---------------------------------------------------------------------------

@transaction.atomic
def receive(
    *,
    item,
    department,
    quantity,
    unit_cost=None,
    lot_number=None,
    expiry_date=None,
    supplier=None,
    performed_by=None,
    reason='',
    occurred_at=None,
    source_type=StockMovement.Source.GOODS_RECEIPT,
    source_id=None,
    source_reference='',
    goods_receipt_note=None,
    incoming_item=None,
    idempotency_key=None,
    movement_type=StockMovement.Type.RECEIPT,
):
    """Bring `quantity` base units of `item` into `department`."""
    if quantity <= 0:
        raise StockError("Receipt quantity must be positive.")

    lot = get_or_create_lot(item, lot_number, expiry_date, supplier)
    return post_movement(
        item=item,
        lot=lot,
        department=department,
        quantity=quantity,
        movement_type=movement_type,
        unit_cost=unit_cost,
        performed_by=performed_by,
        reason=reason,
        occurred_at=occurred_at,
        source_type=source_type,
        source_id=source_id,
        source_reference=source_reference,
        goods_receipt_note=goods_receipt_note,
        incoming_item=incoming_item,
        idempotency_key=idempotency_key,
    )


@transaction.atomic
def receive_incoming_item(incoming_item, performed_by=None):
    """
    Post a goods-received line to the ledger.

    Idempotent on the line's primary key: re-posting the same line (a retried
    request, a double-clicked button) returns the movement already written
    instead of doubling the stock.
    """
    if incoming_item.is_posted:
        return StockMovement.objects.filter(incoming_item=incoming_item).first()

    item = incoming_item.item
    if not item.is_stock_tracked:
        # Nothing to post, but mark it handled so it is not retried forever.
        incoming_item.posted_at = timezone.now()
        incoming_item.save(update_fields=['posted_at'])
        return None

    department = incoming_item.department
    if department is None:
        po = incoming_item.purchase_order
        requisition = getattr(po, 'requisition', None) if po else None
        department = getattr(requisition, 'department', None) or default_department()
        incoming_item.department = department

    movement = receive(
        item=item,
        department=department,
        quantity=incoming_item.base_units,
        unit_cost=incoming_item.unit_cost,
        lot_number=incoming_item.lot_no,
        expiry_date=incoming_item.expiry_date,
        supplier=incoming_item.supplier,
        performed_by=performed_by or incoming_item.received_by,
        source_type=StockMovement.Source.GOODS_RECEIPT,
        source_id=incoming_item.pk,
        source_reference=(
            incoming_item.goods_receipt_note.grn_number
            if incoming_item.goods_receipt_note else ''
        ),
        goods_receipt_note=incoming_item.goods_receipt_note,
        incoming_item=incoming_item,
        idempotency_key=f"incoming-item:{incoming_item.pk}",
    )

    incoming_item.posted_at = timezone.now()
    incoming_item.save(update_fields=['posted_at', 'department'])

    # A receipt may also open a new cash price -- but only for something the
    # hospital actually sells. Reagents and consumables are raw materials.
    if incoming_item.sale_price is not None and item.is_sellable:
        set_sale_price(item, incoming_item.sale_price, created_by=performed_by)

    if incoming_item.supplier_invoice_id:
        incoming_item.supplier_invoice.recalculate_amount()

    return movement


def set_sale_price(item, sale_price, effective_from=None, created_by=None):
    """
    Open a new cash price, closing the one currently in force. Prices are
    effective-dated, so historic invoices keep the price they were raised at.
    """
    effective_from = effective_from or timezone.localdate()
    current = ItemPrice.current_for(item, on=effective_from)

    if current and current.sale_price == sale_price:
        return current

    if current and current.effective_from < effective_from:
        ItemPrice.objects.filter(pk=current.pk).update(
            effective_to=effective_from - timedelta(days=1)
        )
    elif current:
        # Same-day correction: replace rather than stack two prices on one day.
        ItemPrice.objects.filter(pk=current.pk).delete()

    return ItemPrice.objects.create(
        item=item,
        sale_price=sale_price,
        effective_from=effective_from,
        created_by=created_by,
    )


# ---------------------------------------------------------------------------
# Issuing
# ---------------------------------------------------------------------------

def _issuable_balances(item, department=None, allow_expired=False, lot=None):
    """Balances that can satisfy an issue, in FEFO order."""
    qs = StockBalance.objects.filter(item=item, quantity__gt=0)
    if department is not None:
        qs = qs.filter(department=department)
    if lot is not None:
        qs = qs.filter(lot=lot)
    if not allow_expired:
        qs = qs.exclude(lot__expiry_date__lt=timezone.localdate())
    return qs.select_related('lot', 'department').order_by(
        F('lot__expiry_date').asc(nulls_last=True), 'lot_id', 'id'
    )


def plan_allocation(item, quantity, department=None, allow_expired=False):
    """
    Work out which lots would satisfy `quantity`, FEFO, without writing
    anything. Returns (allocations, shortfall).
    """
    remaining = quantity
    allocations = []
    for balance in _issuable_balances(item, department, allow_expired):
        if remaining <= 0:
            break
        take = min(remaining, balance.quantity)
        allocations.append(Allocation(lot=balance.lot, quantity=take, unit_cost=balance.unit_cost))
        remaining -= take
    return allocations, max(remaining, 0)


@transaction.atomic
def issue(
    *,
    item,
    department,
    quantity,
    item_unit=None,
    movement_type=StockMovement.Type.SALE,
    performed_by=None,
    reason='',
    occurred_at=None,
    source_type=StockMovement.Source.MANUAL,
    source_id=None,
    source_reference='',
    allow_expired=False,
    allow_partial=False,
    idempotency_key=None,
):
    """
    Take `quantity` out of `department`, spreading the issue across lots in
    FEFO order.

    `quantity` is in base units unless `item_unit` names a pack, in which case
    it is that many packs -- issuing 2 boxes of 12 takes 24 base units out.

    Raises InsufficientStock unless `allow_partial` is set, in which case it
    issues what it can and the caller inspects the returned movements.
    """
    _assert_tracked(item)
    department = _resolve_department(department)

    if item_unit is not None:
        if item_unit.item_id != item.id:
            raise StockError(
                f"{item_unit.name} is a pack size for a different item.")
        quantity = item_unit.to_base(quantity)

    if quantity <= 0:
        raise StockError("Issue quantity must be positive.")

    if idempotency_key:
        already = list(StockMovement.objects.filter(
            idempotency_key__startswith=f"{idempotency_key}:"
        ))
        if already:
            logger.info("Issue for key %s already posted (%d movements)", idempotency_key, len(already))
            return already

    # Lock every candidate balance up front, ordered by pk, so two concurrent
    # issues of the same item can never interleave into a lost update or a
    # deadlock.
    candidate_ids = list(
        _issuable_balances(item, department, allow_expired).values_list('pk', flat=True)
    )
    if candidate_ids:
        list(StockBalance.objects.select_for_update().filter(pk__in=candidate_ids).order_by('pk'))

    available = available_quantity(item, department, include_expired=allow_expired)
    if available < quantity and not allow_partial:
        raise InsufficientStock(item, quantity, available, department)

    reference = uuid.uuid4()
    remaining = quantity
    movements = []

    for index, balance in enumerate(_issuable_balances(item, department, allow_expired)):
        if remaining <= 0:
            break
        take = min(remaining, balance.quantity)
        movements.append(post_movement(
            item=item,
            lot=balance.lot,
            department=department,
            quantity=-take,
            movement_type=movement_type,
            performed_by=performed_by,
            reason=reason,
            occurred_at=occurred_at,
            reference=reference,
            source_type=source_type,
            source_id=source_id,
            source_reference=source_reference,
            idempotency_key=f"{idempotency_key}:{index}" if idempotency_key else None,
        ))
        remaining -= take

    if remaining > 0 and not allow_partial:
        # Defensive: the pre-check above should already have caught this.
        raise InsufficientStock(item, quantity, quantity - remaining, department)

    return movements


@transaction.atomic
def transfer(
    *,
    item,
    from_department,
    to_department,
    quantity,
    performed_by=None,
    reason='',
    allow_expired=False,
):
    """
    Move stock between locations as two balanced legs sharing one reference,
    preserving lot identity and cost on the way across.
    """
    if from_department == to_department:
        raise StockError("Cannot transfer stock to the same department.")

    out_movements = issue(
        item=item,
        department=from_department,
        quantity=quantity,
        movement_type=StockMovement.Type.TRANSFER_OUT,
        performed_by=performed_by,
        reason=reason,
        source_type=StockMovement.Source.TRANSFER,
        allow_expired=allow_expired,
    )

    reference = out_movements[0].reference if out_movements else uuid.uuid4()
    in_movements = []
    for out in out_movements:
        in_movements.append(post_movement(
            item=item,
            lot=out.lot,
            department=to_department,
            quantity=-out.quantity,
            movement_type=StockMovement.Type.TRANSFER_IN,
            unit_cost=out.unit_cost,
            performed_by=performed_by,
            reason=reason,
            reference=reference,
            source_type=StockMovement.Source.TRANSFER,
        ))

    return out_movements, in_movements


@transaction.atomic
def adjust(
    *,
    item,
    lot,
    department,
    quantity_delta,
    reason,
    performed_by=None,
    movement_type=StockMovement.Type.ADJUSTMENT,
    source_type=StockMovement.Source.MANUAL,
    source_id=None,
    allow_negative=False,
):
    """Correct a balance with an explicit, reasoned ledger entry."""
    if not reason:
        raise StockError("An adjustment must carry a reason.")
    return post_movement(
        item=item,
        lot=lot,
        department=department,
        quantity=quantity_delta,
        movement_type=movement_type,
        performed_by=performed_by,
        reason=reason,
        source_type=source_type,
        source_id=source_id,
        allow_negative=allow_negative,
    )


@transaction.atomic
def reverse(movement, reason, performed_by=None):
    """
    Undo a movement with a contra entry. The original row is left untouched --
    that is the whole point of an append-only ledger.
    """
    if movement.reversals.exists():
        raise StockError(f"Movement #{movement.pk} has already been reversed.")

    return post_movement(
        item=movement.item,
        lot=movement.lot,
        department=movement.department,
        quantity=-movement.quantity,
        movement_type=StockMovement.Type.REVERSAL,
        unit_cost=movement.unit_cost,
        performed_by=performed_by,
        reason=reason,
        reference=movement.reference,
        source_type=movement.source_type,
        source_id=movement.source_id,
        source_reference=movement.source_reference,
        reverses=movement,
        allow_negative=True,
    )


@transaction.atomic
def write_off_expired(as_of=None, performed_by=None, department=None):
    """Write every expired lot down to zero, one EXPIRY_WRITE_OFF per balance."""
    as_of = as_of or timezone.localdate()
    qs = StockBalance.objects.filter(
        quantity__gt=0, lot__expiry_date__lt=as_of
    ).select_related('item', 'lot', 'department')
    if department is not None:
        qs = qs.filter(department=department)

    movements = []
    for balance in qs:
        movements.append(post_movement(
            item=balance.item,
            lot=balance.lot,
            department=balance.department,
            quantity=-balance.quantity,
            movement_type=StockMovement.Type.EXPIRY_WRITE_OFF,
            performed_by=performed_by,
            reason=f"Expired on {balance.lot.expiry_date}",
            source_type=StockMovement.Source.SYSTEM,
        ))
    return movements


# ---------------------------------------------------------------------------
# Reservations
# ---------------------------------------------------------------------------

def reserved_quantity(item, department=None):
    qs = StockReservation.objects.filter(item=item, status=StockReservation.Status.ACTIVE).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gte=timezone.now())
    )
    if department is not None:
        qs = qs.filter(department=department)
    return qs.aggregate(total=Sum('quantity'))['total'] or 0


def on_hand_quantity(item, department=None, include_expired=True):
    """Physical stock, ignoring reservations."""
    qs = StockBalance.objects.filter(item=item, quantity__gt=0)
    if department is not None:
        qs = qs.filter(department=department)
    if not include_expired:
        qs = qs.exclude(lot__expiry_date__lt=timezone.localdate())
    return qs.aggregate(total=Sum('quantity'))['total'] or 0


def available_quantity(item, department=None, include_expired=False):
    """
    What can actually be promised: unexpired stock on hand minus everything
    already reserved.
    """
    if not item.is_stock_tracked:
        return 0
    on_hand = on_hand_quantity(item, department, include_expired=include_expired)
    return max(on_hand - reserved_quantity(item, department), 0)


@transaction.atomic
def reserve(
    *,
    item,
    department,
    quantity,
    expires_at=None,
    reason='',
    created_by=None,
    source_type=StockMovement.Source.MANUAL,
    source_id=None,
):
    """Hold stock for a promise that has not yet been fulfilled."""
    _assert_tracked(item)
    if quantity <= 0:
        raise StockError("Reservation quantity must be positive.")

    available = available_quantity(item, department)
    if available < quantity:
        raise InsufficientStock(item, quantity, available, department)

    return StockReservation.objects.create(
        item=item,
        department=department,
        quantity=quantity,
        expires_at=expires_at,
        reason=reason,
        created_by=created_by,
        source_type=source_type,
        source_id=source_id,
    )


@transaction.atomic
def release_reservation(reservation, status=StockReservation.Status.RELEASED):
    reservation.status = status
    reservation.resolved_at = timezone.now()
    reservation.save(update_fields=['status', 'resolved_at'])
    return reservation


@transaction.atomic
def consume_reservation(reservation, performed_by=None, movement_type=StockMovement.Type.SALE, reason=''):
    """
    Turn a reservation into a real issue. The reservation is retired first so
    it does not count against the availability check of the issue fulfilling
    it; if the issue fails, the whole transaction rolls back.
    """
    release_reservation(reservation, status=StockReservation.Status.CONSUMED)
    return issue(
        item=reservation.item,
        department=reservation.department,
        quantity=reservation.quantity,
        movement_type=movement_type,
        performed_by=performed_by,
        reason=reason or reservation.reason,
        source_type=reservation.source_type,
        source_id=reservation.source_id,
    )


def expire_stale_reservations(now=None):
    now = now or timezone.now()
    return StockReservation.objects.filter(
        status=StockReservation.Status.ACTIVE,
        expires_at__lt=now,
    ).update(status=StockReservation.Status.EXPIRED, resolved_at=now)


# ---------------------------------------------------------------------------
# Stock takes
# ---------------------------------------------------------------------------

@transaction.atomic
def post_stock_take(stock_take, performed_by=None):
    """
    Turn a completed count into ADJUSTMENT movements for the variance on each
    line. The count never overwrites a balance; it explains the difference.
    """
    if stock_take.status != StockTake.Status.DRAFT:
        raise StockError(f"Stock take {stock_take.reference_number} is {stock_take.status}, not DRAFT.")

    movements = []
    for line in stock_take.lines.select_related('lot', 'lot__item'):
        variance = line.variance
        if variance == 0:
            continue
        movement = post_movement(
            item=line.lot.item,
            lot=line.lot,
            department=stock_take.department,
            quantity=variance,
            movement_type=StockMovement.Type.ADJUSTMENT,
            performed_by=performed_by,
            reason=line.note or f"Stock take {stock_take.reference_number}",
            source_type=StockMovement.Source.STOCK_TAKE,
            source_id=stock_take.pk,
            source_reference=stock_take.reference_number,
            idempotency_key=f"stock-take-line:{line.pk}",
            allow_negative=True,
        )
        line.movement = movement
        line.save(update_fields=['movement'])
        movements.append(movement)

    stock_take.status = StockTake.Status.POSTED
    stock_take.posted_by = performed_by
    stock_take.posted_at = timezone.now()
    stock_take.save(update_fields=['status', 'posted_by', 'posted_at'])
    return movements


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def re_order_level_for(item, department):
    policy = StockPolicy.objects.filter(item=item, department=department, is_active=True).first()
    if policy:
        return policy.re_order_level
    return item.default_re_order_level


def items_below_reorder_level(department=None, category=None):
    """
    Re-order is evaluated per item per location -- never per lot, which is what
    made the old per-lot re_order_level meaningless.
    """
    qs = StockBalance.objects.all()
    if department is not None:
        qs = qs.filter(department=department)
    if category is not None:
        qs = qs.filter(item__category=category)

    rows = qs.values('item', 'department').annotate(quantity=Sum('quantity'))

    item_ids = {row['item'] for row in rows}
    dept_ids = {row['department'] for row in rows}
    items = Item.objects.in_bulk(item_ids)
    departments = Department.objects.in_bulk(dept_ids)

    policies = {
        (p.item_id, p.department_id): p.re_order_level
        for p in StockPolicy.objects.filter(
            item_id__in=item_ids, department_id__in=dept_ids, is_active=True
        )
    }

    results = []
    for row in rows:
        item = items.get(row['item'])
        if item is None or not item.is_stock_tracked:
            continue
        level = policies.get((row['item'], row['department']), item.default_re_order_level)
        quantity = row['quantity'] or 0
        if quantity <= level:
            results.append({
                'item': item,
                'department': departments.get(row['department']),
                'quantity': quantity,
                # Same value under the name the report templates use.
                'quantity_at_hand': quantity,
                're_order_level': level,
            })
    return results


def stock_as_of(item=None, department=None, as_of=None):
    """
    Rebuild a balance from the ledger at any point in time. This is the report
    a mutable quantity column can never produce.
    """
    qs = StockMovement.objects.all()
    if item is not None:
        qs = qs.filter(item=item)
    if department is not None:
        qs = qs.filter(department=department)
    if as_of is not None:
        qs = qs.filter(occurred_at__lte=as_of)
    return qs.aggregate(total=Sum('quantity'))['total'] or 0


def stock_card(item, department=None, lot=None, since=None):
    """The bin card: every movement against an item, oldest first."""
    qs = StockMovement.objects.filter(item=item).select_related('lot', 'department', 'performed_by')
    if department is not None:
        qs = qs.filter(department=department)
    if lot is not None:
        qs = qs.filter(lot=lot)
    if since is not None:
        qs = qs.filter(occurred_at__gte=since)
    return qs.order_by('occurred_at', 'id')


def stock_valuation(department=None, category=None):
    """Closing stock value at weighted-average cost."""
    qs = StockBalance.objects.filter(quantity__gt=0).select_related('item', 'department', 'lot')
    if department is not None:
        qs = qs.filter(department=department)
    if category is not None:
        qs = qs.filter(item__category=category)

    total_value = ZERO
    total_units = 0
    for balance in qs:
        total_value += Decimal(balance.quantity) * balance.unit_cost
        total_units += balance.quantity
    return {'total_value': total_value, 'total_units': total_units, 'lines': qs}


def cost_of_goods_sold(start=None, end=None, department=None, item=None):
    """COGS is a sum over the ledger, not a derived guess."""
    qs = StockMovement.objects.filter(
        movement_type__in=[StockMovement.Type.SALE, StockMovement.Type.CONSUMPTION]
    )
    if start is not None:
        qs = qs.filter(occurred_at__gte=start)
    if end is not None:
        qs = qs.filter(occurred_at__lte=end)
    if department is not None:
        qs = qs.filter(department=department)
    if item is not None:
        qs = qs.filter(item=item)

    total = ZERO
    for quantity, unit_cost in qs.values_list('quantity', 'unit_cost'):
        total += Decimal(-quantity) * unit_cost
    return total


def slow_moving_balances(department=None):
    """
    Items with stock that has not been issued for longer than the item's
    slow_moving_period. Driven by `last_issue_at`, which the ledger keeps
    honest.
    """
    today = timezone.now()
    qs = StockBalance.objects.filter(quantity__gt=0).select_related('item', 'department', 'lot')
    if department is not None:
        qs = qs.filter(department=department)

    results = []
    for balance in qs:
        reference = balance.last_issue_at or balance.last_receipt_at or balance.date_created
        if reference is None:
            continue
        days_idle = (today - reference).days
        if days_idle >= (balance.item.slow_moving_period or 90):
            results.append({'balance': balance, 'days_without_movement': days_idle})
    return results


def default_department():
    """
    The fallback stock location. Prefers a department literally named Main,
    then General, then whatever exists.
    """
    for name in ('Main', 'General'):
        department = Department.objects.filter(name__iexact=name, is_stock_location=True).first()
        if department:
            return department
    department = Department.objects.filter(is_stock_location=True).order_by('id').first()
    if department is None:
        raise StockError("No stock location is configured. Create a Department first.")
    return department


# ---------------------------------------------------------------------------
# Reconciliation
# ---------------------------------------------------------------------------

def rebuild_balances(dry_run=False):
    """
    Recompute every balance from the ledger and report the drift. Because the
    ledger is the source of truth, this is always safe to run.
    """
    ledger = StockMovement.objects.values('item', 'lot', 'department').annotate(quantity=Sum('quantity'))
    ledger_map = {(r['item'], r['lot'], r['department']): r['quantity'] or 0 for r in ledger}

    drift = []
    with transaction.atomic():
        for balance in StockBalance.objects.select_for_update().all():
            key = (balance.item_id, balance.lot_id, balance.department_id)
            expected = ledger_map.pop(key, 0)
            if balance.quantity != expected:
                drift.append({
                    'item_id': balance.item_id,
                    'lot_id': balance.lot_id,
                    'department_id': balance.department_id,
                    'cached': balance.quantity,
                    'ledger': expected,
                })
                if not dry_run:
                    balance.quantity = expected
                    balance.save(update_fields=['quantity'])

        # Ledger rows with no balance row at all.
        for (item_id, lot_id, department_id), quantity in ledger_map.items():
            drift.append({
                'item_id': item_id,
                'lot_id': lot_id,
                'department_id': department_id,
                'cached': None,
                'ledger': quantity,
            })
            if not dry_run:
                StockBalance.objects.update_or_create(
                    item_id=item_id, lot_id=lot_id, department_id=department_id,
                    defaults={'quantity': quantity},
                )

    return drift
