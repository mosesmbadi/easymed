"""
Accompaniments -- the consumables an item drags along with it.

An injectable drug is not dispensable on its own: it needs a syringe and a
swab, and those come out of stock whether the injection happens in the ward or
at the patient's home. A box of Panadol tablets needs nothing.

The lab is not served from here. A test's syringe is declared on the specimen
it is drawn into (`laboratory.SpecimenConsumable`, deducted at collection) and
its reagents on the panel that runs it (`laboratory.TestPanelReagent`, deducted
when the panel is billed), because a retest reuses the sample it already has
and must not pay for a second draw. `Item.supports_accompaniments` is what
keeps the two apart.

This module answers three questions and nothing else:
  what does this item need   -> requirements()
  can we cover it right now  -> availability() / check_available()
  take it out of stock       -> consume()

Quantities are in base units throughout, which is also the unit invoice lines
are counted in.
"""

import logging

from django.db import transaction

from inventory.models import StockMovement
from inventory.services import stock as stock_service
from inventory.services.stock import StockError

logger = logging.getLogger(__name__)


def requirements(item, quantity=1):
    """
    The accompaniments `quantity` base units of `item` will use up.

    Returns a list of dicts. An item with no accompaniments returns [], which
    is the common case and must stay cheap.
    """
    if item is None or not item.supports_accompaniments:
        return []
    return [
        {
            'consumable': link.consumable,
            'quantity_per_use': link.quantity_per_use,
            'required_quantity': link.quantity_per_use * max(quantity or 1, 1),
            'is_required': link.is_required,
        }
        for link in item.consumable_links.select_related('consumable')
    ]


def availability(item, quantity=1, department=None):
    """
    What each accompaniment needs versus what the department can actually
    promise. `shortfall` is 0 when the line is coverable.
    """
    rows = []
    for row in requirements(item, quantity):
        consumable = row['consumable']
        available = stock_service.available_quantity(consumable, department)
        rows.append({
            **row,
            'department': department,
            'available_quantity': available,
            'shortfall': max(row['required_quantity'] - available, 0),
        })
    return rows


def shortfalls(item, quantity=1, department=None, required_only=True):
    """Just the accompaniments that cannot be covered."""
    return [
        row for row in availability(item, quantity, department)
        if row['shortfall'] > 0 and (row['is_required'] or not required_only)
    ]


def check_available(item, quantity=1, department=None):
    """
    Pure check, no side effects. Returns (ok, message).

    Only accompaniments marked required can block; an optional one that runs
    out is the caller's problem to surface, not to refuse on.
    """
    missing = shortfalls(item, quantity, department)
    if not missing:
        return True, ''

    where = getattr(department, 'name', None) or 'any department'
    detail = '; '.join(
        f"{row['consumable'].name} (need {row['required_quantity']}, "
        f"{row['available_quantity']} available)"
        for row in missing
    )
    return False, (
        f"{item.name} cannot be billed: its consumables are not in stock at {where} -- "
        f"{detail}. Receive them into inventory first."
    )


@transaction.atomic
def consume(
    *,
    item,
    quantity=1,
    department=None,
    performed_by=None,
    reason='',
    source_type=StockMovement.Source.INVOICE_ITEM,
    source_id=None,
    idempotency_key_prefix=None,
    allow_partial=True,
):
    """
    Issue the accompaniments an item uses up.

    Idempotent per (source, consumable): the caller's key prefix plus the
    consumable id. `stock_service.issue` recognises a key it has already
    posted and hands back those movements, so a re-saved invoice line cannot
    take a second syringe.

    `allow_partial` defaults to True because the required ones were already
    checked before the parent item was billed -- what is left here is an
    optional accompaniment running thin, which should not fail the sale.
    """
    movements = []
    prefix = idempotency_key_prefix or f"{source_type}:{source_id}"

    for row in requirements(item, quantity):
        consumable = row['consumable']
        key = f"{prefix}:consumable:{consumable.id}"

        try:
            movements.extend(stock_service.issue(
                item=consumable,
                department=department,
                quantity=row['required_quantity'],
                movement_type=StockMovement.Type.CONSUMPTION,
                performed_by=performed_by,
                reason=reason or f"Accompaniment for {item.name}",
                source_type=source_type,
                source_id=source_id,
                allow_partial=allow_partial,
                idempotency_key=key,
            ))
        except StockError as exc:
            # A required accompaniment cannot get here -- check_available runs
            # first -- so this is an optional one, or stock moved underneath us.
            logger.error("Could not consume %s for %s: %s", consumable.name, item.name, exc)

    return movements


__all__ = [
    'availability',
    'check_available',
    'consume',
    'requirements',
    'shortfalls',
]
