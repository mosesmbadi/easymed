"""
Selling a test you can run, running it, and knowing what it made.

Three questions the lab could not previously answer:
  can we sell this        -- nothing checked the reagent, only the syringe
  when is it consumed     -- at billing, which could precede the draw
  what did it earn        -- the ledger knew the cost; nothing ever asked
"""

from decimal import Decimal

import pytest

from billing.models import Invoice, InvoiceItem, PaymentMode
from billing.services import check_stock_available
from inventory.models import Department, Item, StockMovement
from inventory.services import stock as stock_service
from laboratory.models import (
    LabTestPanel,
    LabTestRequestPanel,
    PatientSample,
    SpecimenConsumable,
    TestPanelReagent,
)
from reports.margins import margin_by_item, margin_totals


@pytest.fixture
def cash_mode(db):
    return PaymentMode.objects.create(
        payment_mode='Cash', payment_category='cash', is_default=True)


@pytest.fixture
def lab_department(db):
    return Department.objects.create(name="Lab")


@pytest.fixture
def reagent(lab_department):
    item = Item.objects.create(
        name="Urea Reagent", desc="Urea kit", category="LabReagent",
        units_of_measure="tests", item_code="LAB-UREA-R")
    stock_service.receive(
        item=item, department=lab_department, quantity=10, unit_cost=Decimal('30'),
        lot_number='UR-1')
    return item


@pytest.fixture
def syringe(lab_department):
    item = Item.objects.create(
        name="Syringe 5ml", desc="Disposable", category="LabConsumable",
        category_one="Internal", units_of_measure="pieces", item_code="LAB-SYR")
    stock_service.receive(
        item=item, department=lab_department, quantity=10, unit_cost=Decimal('12'),
        lot_number='SYR-1')
    return item


@pytest.fixture
def blood(specimen, syringe):
    SpecimenConsumable.objects.create(
        specimen=specimen, item=syringe, quantity_per_collection=1)
    return specimen


@pytest.fixture
def panel_item(db):
    item = Item.objects.create(
        name="Urea", desc="Urea test", category="Lab Test",
        units_of_measure="test", item_code="LAB-UREA")
    stock_service.set_sale_price(item, Decimal('200.00'))
    return item


@pytest.fixture
def urea(blood, lab_test_profile, panel_item, reagent):
    panel = LabTestPanel.objects.create(
        name="Urea", specimen=blood, test_profile=lab_test_profile, item=panel_item)
    TestPanelReagent.objects.create(
        test_panel=panel, reagent_item=reagent, units_consumed_per_run=1)
    return panel


def billed_line(invoice, item, quantity=1):
    line = InvoiceItem.objects.create(invoice=invoice, item=item, quantity=quantity)
    line.status = 'billed'
    line.save()
    return line


# ---------------------------------------------------------------------------
# Selling a test the bench can actually run
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_a_test_with_reagent_on_the_shelf_is_billable(
        cash_mode, urea, panel_item, patient, lab_department):
    invoice = Invoice.objects.create(patient=patient)
    line = InvoiceItem.objects.create(invoice=invoice, item=panel_item, quantity=1)

    ok, message = check_stock_available(line)

    assert ok, message


@pytest.mark.django_db
def test_a_test_whose_reagent_is_out_is_not_billable(
        cash_mode, urea, panel_item, reagent, patient, lab_department):
    """
    A lab test holds no stock of its own, so every stock check used to wave it
    through -- and the till would sell a Urea the bench had no reagent to run.
    """
    stock_service.issue(
        item=reagent, department=lab_department, quantity=10,
        movement_type=StockMovement.Type.WASTAGE, reason='spoiled')

    invoice = Invoice.objects.create(patient=patient)
    line = InvoiceItem.objects.create(invoice=invoice, item=panel_item, quantity=1)

    ok, message = check_stock_available(line)

    assert not ok
    assert 'Urea Reagent' in message


@pytest.mark.django_db
def test_the_check_scales_with_quantity(
        cash_mode, urea, panel_item, reagent, patient, lab_department):
    stock_service.issue(
        item=reagent, department=lab_department, quantity=8,
        movement_type=StockMovement.Type.WASTAGE, reason='spoiled')

    invoice = Invoice.objects.create(patient=patient)
    line = InvoiceItem.objects.create(invoice=invoice, item=panel_item, quantity=3)

    ok, _ = check_stock_available(line)

    assert not ok


@pytest.mark.django_db
def test_a_panel_with_no_reagents_is_always_runnable(blood, lab_test_profile):
    """
    Plenty of tests are read off a slide and consume nothing trackable. An
    empty reagent list is an answer, not an unfinished setup.
    """
    item = Item.objects.create(
        name="Blood Film", desc="Microscopy", category="Lab Test",
        units_of_measure="test", item_code="LAB-FILM")
    panel = LabTestPanel.objects.create(
        name="Blood Film", specimen=blood, test_profile=lab_test_profile, item=item)

    ok, _ = panel.can_run()

    assert ok


# ---------------------------------------------------------------------------
# When the reagent actually leaves
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_billing_alone_does_not_consume_the_reagent(
        cash_mode, urea, panel_item, reagent, lab_department, lab_test_request, patient):
    """
    Paying for a test is not running it. Billing used to trigger the deduction,
    which put it before the sample had even been drawn -- so a patient who paid
    and went home took a test worth of reagent with them, on paper.
    """
    LabTestRequestPanel.objects.create(
        test_panel=urea, lab_test_request=lab_test_request)
    invoice = Invoice.objects.create(patient=patient)
    line = billed_line(invoice, panel_item)

    assert line.status == 'billed'
    assert stock_service.available_quantity(reagent, lab_department) == 10


@pytest.mark.django_db
def test_recording_a_result_consumes_the_reagent(
        urea, reagent, lab_department, lab_test_request):
    panel_run = LabTestRequestPanel.objects.create(
        test_panel=urea, lab_test_request=lab_test_request)

    panel_run.result = '5.2'
    panel_run.save()

    assert stock_service.available_quantity(reagent, lab_department) == 9


@pytest.mark.django_db
def test_re_saving_a_result_does_not_consume_it_twice(
        urea, reagent, lab_department, lab_test_request):
    panel_run = LabTestRequestPanel.objects.create(
        test_panel=urea, lab_test_request=lab_test_request)
    panel_run.result = '5.2'
    panel_run.save()
    panel_run.result_approved = True
    panel_run.save()

    assert stock_service.available_quantity(reagent, lab_department) == 9


# ---------------------------------------------------------------------------
# What it earned
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_margin_pairs_revenue_with_what_was_consumed(
        cash_mode, urea, panel_item, reagent, syringe, blood, lab_department,
        lab_test_request, process_test_request, patient):
    """
    One Urea: 200 charged, 30 of reagent burned and 12 of syringe drawn with.
    Both halves of the cost come off the ledger at the unit cost they left at.
    """
    from django.utils import timezone

    panel_run = LabTestRequestPanel.objects.create(
        test_panel=urea, lab_test_request=lab_test_request)

    sample = PatientSample.objects.get(specimen=blood)
    sample.is_sample_collected = True
    sample.save()

    panel_run.result = '5.2'
    panel_run.save()

    invoice = Invoice.objects.create(patient=patient)
    billed_line(invoice, panel_item)

    today = timezone.localdate()
    rows = margin_by_item(today, today)
    row = next(r for r in rows if r['item_id'] == panel_item.id)

    assert row['revenue'] == Decimal('200.00')
    assert row['reagent_cost'] == Decimal('30')
    assert row['collection_cost'] == Decimal('12')
    assert row['cost'] == Decimal('42')
    assert row['margin'] == Decimal('158.00')
    assert row['cost_known']


@pytest.mark.django_db
def test_collection_cost_is_split_across_the_tests_drawn_for(
        cash_mode, urea, panel_item, syringe, blood, reagent, lab_department,
        lab_test_request, lab_test_profile, patient):
    """
    One syringe, two tests. Neither carries the whole 12 -- the draw was shared,
    and so is its cost.
    """
    from django.utils import timezone

    second_item = Item.objects.create(
        name="Creatinine", desc="Creatinine test", category="Lab Test",
        units_of_measure="test", item_code="LAB-CREA")
    stock_service.set_sale_price(second_item, Decimal('150.00'))
    creatinine = LabTestPanel.objects.create(
        name="Creatinine", specimen=blood, test_profile=lab_test_profile,
        item=second_item)
    TestPanelReagent.objects.create(
        test_panel=creatinine, reagent_item=reagent, units_consumed_per_run=1)

    runs = [
        LabTestRequestPanel.objects.create(test_panel=panel, lab_test_request=lab_test_request)
        for panel in (urea, creatinine)
    ]

    sample = PatientSample.objects.get(specimen=blood)
    sample.is_sample_collected = True
    sample.save()

    for run in runs:
        run.result = '1.0'
        run.save()

    invoice = Invoice.objects.create(patient=patient)
    billed_line(invoice, panel_item)
    billed_line(invoice, second_item)

    today = timezone.localdate()
    rows = {r['item_id']: r for r in margin_by_item(today, today)}

    assert rows[panel_item.id]['collection_cost'] == Decimal('6')
    assert rows[second_item.id]['collection_cost'] == Decimal('6')


@pytest.mark.django_db
def test_an_item_billed_with_no_recorded_cost_is_flagged(
        cash_mode, blood, lab_test_profile, patient):
    """
    A full margin usually means nothing was linked, not that the test is free.
    The totals say so rather than letting the number stand unqualified.
    """
    from django.utils import timezone

    item = Item.objects.create(
        name="Blood Film", desc="Microscopy", category="Lab Test",
        units_of_measure="test", item_code="LAB-FILM")
    stock_service.set_sale_price(item, Decimal('300.00'))
    LabTestPanel.objects.create(
        name="Blood Film", specimen=blood, test_profile=lab_test_profile, item=item)

    invoice = Invoice.objects.create(patient=patient)
    billed_line(invoice, item)

    today = timezone.localdate()
    totals = margin_totals(margin_by_item(today, today))

    assert totals['items_without_cost'] == 1
    assert totals['revenue_without_cost'] == Decimal('300.00')
