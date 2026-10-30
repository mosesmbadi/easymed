"""
Lab-side helpers over the stock ledger.

The lab used to keep its own reagent counter (`TestKitCounter.available_tests`)
alongside `Inventory.quantity_at_hand`. Two counters for one quantity drift
apart the first time either write path fails. Reagent availability is now
derived from the ledger, here, in one place.
"""

from inventory.models import Department, StockPolicy
from inventory.services import stock as stock_service

DEFAULT_REAGENT_THRESHOLD = 10


def lab_department():
    """The stock location the laboratory issues from."""
    department = Department.objects.filter(name__iexact='Lab', is_stock_location=True).first()
    return department or stock_service.default_department()


def reagent_threshold(item, department=None):
    """
    The level at which a reagent counts as low. Held on StockPolicy, which is
    where every other re-order level in the system lives.
    """
    department = department or lab_department()
    policy = StockPolicy.objects.filter(item=item, department=department, is_active=True).first()
    if policy:
        return policy.re_order_level
    return item.default_re_order_level or DEFAULT_REAGENT_THRESHOLD


def reagent_stock(item, department=None):
    """
    Availability of one reagent, in base units (= tests, for a test kit).

    Returns the shape the old TestKitCounter API exposed, so the dashboard
    keeps working while the number itself now comes from the ledger.
    """
    department = department or lab_department()
    available = stock_service.on_hand_quantity(item, department, include_expired=False)
    threshold = reagent_threshold(item, department)

    is_out = available <= 0
    is_low = available <= threshold

    return {
        'id': item.id,
        'reagent_item': item.id,
        'reagent_name': item.name,
        'reagent_code': item.item_code,
        'available_tests': available,
        'available_stock': available,
        'minimum_threshold': threshold,
        'is_low_stock': is_low,
        'is_out_of_stock': is_out,
        'stock_status': 'out_of_stock' if is_out else ('low_stock' if is_low else 'in_stock'),
        'stock_percentage': (available / threshold * 100) if threshold > 0 else 100,
    }


def reagent_stock_rows(items=None, department=None):
    """Availability for every lab reagent, or for the items given."""
    from inventory.models import Item

    if items is None:
        items = Item.objects.filter(category='LabReagent')
    department = department or lab_department()
    return [reagent_stock(item, department) for item in items]
