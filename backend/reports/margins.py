"""
What we charged, what it cost us, and the difference.

Every outflow in the stock ledger carries the `unit_cost` it left at, so the
cost side of a sale has always been recoverable -- nothing had ever gone and
recovered it. This module does, by walking back from each movement to the thing
that caused it:

    a dispensed drug        StockMovement(source=INVOICE_ITEM) -> the invoice line
    a reagent burned        StockMovement(source=LAB_TEST)     -> LabTestRequestPanel
    a syringe spent         StockMovement(source=SAMPLE_COLLECTION) -> PatientSample

Revenue comes from billed invoice lines, at the price frozen on the line, so a
report run next year still shows what was actually charged.

One convention worth stating plainly, because it is a choice and not a fact:
**a sample's collection cost is split evenly across the panels ordered off it.**
Three tests off one tube of blood each carry a third of the syringe. There is no
true answer here -- the syringe was not divisible -- and an even split is the
convention most labs use. Everything else in this module is measured, not
apportioned, and the two are kept separate in the output so nobody has to guess
which is which.
"""

from collections import defaultdict
from decimal import Decimal

from django.db.models import Sum

from billing.models import InvoiceItem
from inventory.models import StockMovement


ZERO = Decimal('0')

# Services that genuinely consume nothing. A consultation at zero cost is the
# right answer, not a missing link, so it is never counted against the report's
# "billed with no recorded cost" warning -- or the warning would fire on every
# visit and stop meaning anything.
NO_STOCK_EXPECTED = frozenset({'General Appointment', 'Specialized Appointment'})


def _movement_cost(queryset):
    """
    What a set of outflows cost, positive.

    Ledger quantities are signed -- stock leaving is negative -- so the value of
    an issue is negative too. Reports want a cost, so flip it here once rather
    than in every caller.
    """
    rows = queryset.values_list('quantity', 'unit_cost')
    return sum((Decimal(-q) * (c or ZERO) for q, c in rows), ZERO)


def direct_costs_by_invoice_item(start, end):
    """
    Cost of the goods each invoice line actually took off the shelf.

    Covers everything dispensed against the line: the drug itself and the
    accompaniments it dragged along, both posted against the same source.
    """
    movements = StockMovement.objects.filter(
        source_type=StockMovement.Source.INVOICE_ITEM,
        source_id__isnull=False,
        occurred_at__date__gte=start,
        occurred_at__date__lte=end,
    ).exclude(movement_type=StockMovement.Type.REVERSAL)

    costs = defaultdict(lambda: ZERO)
    for source_id, quantity, unit_cost in movements.values_list(
            'source_id', 'quantity', 'unit_cost'):
        costs[source_id] += Decimal(-quantity) * (unit_cost or ZERO)
    return costs


def reagent_costs_by_panel_run(start, end):
    """Reagent cost per LabTestRequestPanel -- one run of one test."""
    movements = StockMovement.objects.filter(
        source_type=StockMovement.Source.LAB_TEST,
        source_id__isnull=False,
        occurred_at__date__gte=start,
        occurred_at__date__lte=end,
    ).exclude(movement_type=StockMovement.Type.REVERSAL)

    costs = defaultdict(lambda: ZERO)
    for source_id, quantity, unit_cost in movements.values_list(
            'source_id', 'quantity', 'unit_cost'):
        costs[source_id] += Decimal(-quantity) * (unit_cost or ZERO)
    return costs


def collection_costs_by_sample(start, end):
    """Cost of drawing each sample: the syringe, the tube, the gloves."""
    movements = StockMovement.objects.filter(
        source_type=StockMovement.Source.SAMPLE_COLLECTION,
        source_id__isnull=False,
        occurred_at__date__gte=start,
        occurred_at__date__lte=end,
    ).exclude(movement_type=StockMovement.Type.REVERSAL)

    costs = defaultdict(lambda: ZERO)
    for source_id, quantity, unit_cost in movements.values_list(
            'source_id', 'quantity', 'unit_cost'):
        costs[source_id] += Decimal(-quantity) * (unit_cost or ZERO)
    return costs


def lab_costs_by_item(start, end):
    """
    Lab cost in the period, gathered per billing item so it can sit beside the
    revenue for the same item.

    Returns {item_id: {'reagent': Decimal, 'collection': Decimal, 'runs': int}}.
    """
    from django.db.models import Q

    from laboratory.models import LabTestRequestPanel

    reagent_costs = reagent_costs_by_panel_run(start, end)
    collection_costs = collection_costs_by_sample(start, end)
    if not reagent_costs and not collection_costs:
        return {}

    # Only the runs something was actually spent on, rather than every panel
    # ever recorded. A window of one day should not walk the whole table.
    runs = list(
        LabTestRequestPanel.objects.filter(
            Q(id__in=list(reagent_costs)) | Q(patient_sample_id__in=list(collection_costs))
        ).values('id', 'patient_sample_id', 'test_panel__item_id')
    )

    # How many panels share each draw, which is the divisor for the split. This
    # counts every panel on the sample, not just the ones inside the window --
    # the syringe was shared with all of them regardless of when they ran.
    panels_per_sample = defaultdict(int)
    if collection_costs:
        for sample_id in LabTestRequestPanel.objects.filter(
                patient_sample_id__in=list(collection_costs)
        ).values_list('patient_sample_id', flat=True):
            panels_per_sample[sample_id] += 1

    totals = defaultdict(lambda: {'reagent': ZERO, 'collection': ZERO, 'runs': 0})

    for row in runs:
        item_id = row['test_panel__item_id']
        if item_id is None:
            continue

        reagent = reagent_costs.get(row['id'], ZERO)
        sample_id = row['patient_sample_id']
        share = ZERO
        if sample_id and collection_costs.get(sample_id):
            share = collection_costs[sample_id] / (panels_per_sample[sample_id] or 1)

        if not reagent and not share:
            continue

        bucket = totals[item_id]
        bucket['reagent'] += reagent
        bucket['collection'] += share
        bucket['runs'] += 1

    return totals


def margin_by_item(start, end):
    """
    One row per item sold in the window: revenue, cost, margin.

    Revenue is what was billed; cost is what the ledger says left the shelf to
    honour it. An item that was billed but consumed nothing -- a consultation, a
    test whose reagents are not configured -- shows a cost of zero, which is a
    statement about the setup rather than about the profitability, so `runs` and
    `cost_known` are carried alongside to say so.
    """
    lines = InvoiceItem.objects.filter(
        status='billed',
        item_created_at__date__gte=start,
        item_created_at__date__lte=end,
    ).select_related('item')

    direct = direct_costs_by_invoice_item(start, end)
    lab = lab_costs_by_item(start, end)

    rows = {}
    for line in lines:
        row = rows.setdefault(line.item_id, {
            'item_id': line.item_id,
            'item_name': line.item.name,
            'item_code': line.item.item_code,
            'category': line.item.category,
            'cost_expected': line.item.category not in NO_STOCK_EXPECTED,
            'quantity': 0,
            'revenue': ZERO,
            'patient_revenue': ZERO,
            'insurer_revenue': ZERO,
            'direct_cost': ZERO,
            'reagent_cost': ZERO,
            'collection_cost': ZERO,
        })
        row['quantity'] += line.quantity or 1
        row['revenue'] += line.item_amount or ZERO
        row['patient_revenue'] += line.patient_amount or ZERO
        row['insurer_revenue'] += (line.item_amount or ZERO) - (line.patient_amount or ZERO)
        row['direct_cost'] += direct.get(line.id, ZERO)

    for item_id, costs in lab.items():
        if item_id not in rows:
            # Run in the window but billed outside it (or not billed at all).
            # There is no revenue to set it against, so it gets no row here;
            # stock_consumption_summary still counts it under its source.
            continue
        rows[item_id]['reagent_cost'] += costs['reagent']
        rows[item_id]['collection_cost'] += costs['collection']

    output = []
    for row in rows.values():
        cost = row['direct_cost'] + row['reagent_cost'] + row['collection_cost']
        revenue = row['revenue']
        row['cost'] = cost
        row['margin'] = revenue - cost
        row['margin_percent'] = (
            float(row['margin'] / revenue * 100) if revenue else None)
        row['cost_known'] = cost > ZERO
        output.append(row)

    return sorted(output, key=lambda r: r['margin'], reverse=True)


def margin_totals(rows):
    """The bottom line, plus how much of it we can actually vouch for."""
    revenue = sum((r['revenue'] for r in rows), ZERO)
    cost = sum((r['cost'] for r in rows), ZERO)
    unknown = [r for r in rows if r['cost_expected'] and not r['cost_known']]
    return {
        'revenue': revenue,
        'patient_revenue': sum((r['patient_revenue'] for r in rows), ZERO),
        'insurer_revenue': sum((r['insurer_revenue'] for r in rows), ZERO),
        'cost': cost,
        'margin': revenue - cost,
        'margin_percent': float((revenue - cost) / revenue * 100) if revenue else None,
        'items': len(rows),
        # Said out loud rather than buried: a line with no recorded cost makes
        # the margin above look better than it is.
        'items_without_cost': len(unknown),
        'revenue_without_cost': sum((r['revenue'] for r in unknown), ZERO),
    }


def stock_consumption_summary(start, end):
    """
    Where stock went in the window, by reason. The counterpart to the margin
    table: it accounts for every outflow, including the ones no invoice pays
    for -- wastage, expiry, a draw for a test that was never billed.
    """
    movements = StockMovement.objects.filter(
        occurred_at__date__gte=start,
        occurred_at__date__lte=end,
        movement_type__in=list(StockMovement.OUTFLOW_TYPES),
    ).exclude(movement_type=StockMovement.Type.REVERSAL)

    rows = movements.values('source_type', 'movement_type').annotate(
        quantity=Sum('quantity')).order_by('source_type')

    out = []
    for row in rows:
        cost = _movement_cost(movements.filter(
            source_type=row['source_type'], movement_type=row['movement_type']))
        out.append({
            'source_type': row['source_type'],
            'movement_type': row['movement_type'],
            'quantity': -(row['quantity'] or 0),
            'cost': cost,
        })
    return out


__all__ = [
    'collection_costs_by_sample',
    'direct_costs_by_invoice_item',
    'lab_costs_by_item',
    'margin_by_item',
    'margin_totals',
    'reagent_costs_by_panel_run',
    'stock_consumption_summary',
]
