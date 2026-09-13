"""
What a line costs, who owes which part of it, and when that stops changing.

Three things used to write the money fields on an invoice line, using two
conventions, and the one that won subtracted the patient's co-pay from the
insurer's own price -- so every insured line went out short by exactly what the
patient had already paid. These tests pin the arithmetic down.
"""

from decimal import Decimal

import pytest

from django.core.exceptions import ValidationError as DjangoValidationError

from billing.models import Invoice, InvoiceItem, PaymentMode
from inventory.models import Department, InsuranceItemSalePrice, Item
from inventory.services import stock as stock_service


@pytest.fixture
def cash_mode(db):
    return PaymentMode.objects.create(
        payment_mode='Cash', payment_category='cash', is_default=True)


@pytest.fixture
def insurance_mode(db, insurance_company):
    return PaymentMode.objects.create(
        payment_mode='AAR', payment_category='insurance', insurance=insurance_company)


@pytest.fixture
def pharmacy(db):
    return Department.objects.create(name='Pharmacy')


@pytest.fixture
def drug(db, pharmacy):
    """
    On the shelf, because a billed line is dispensed: the till refuses a drug
    the pharmacy does not have, which is not what these tests are about.
    """
    item = Item.objects.create(
        name='Paracetamol 500mg', desc='Painkiller', category='Drug',
        units_of_measure='tablets', item_code='DRG-PCM-500')
    stock_service.set_sale_price(item, Decimal('100.00'))
    stock_service.receive(
        item=item, department=pharmacy, quantity=500, unit_cost=40, lot_number='PCM-1')
    return item


@pytest.fixture
def invoice(db, patient):
    return Invoice.objects.create(patient=patient)


# ---------------------------------------------------------------------------
# Cash
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_a_cash_line_is_all_the_patients(cash_mode, drug, invoice):
    line = InvoiceItem.objects.create(invoice=invoice, item=drug, quantity=3)

    assert line.unit_price == Decimal('100.00')
    assert line.item_amount == Decimal('300.00')
    assert line.patient_amount == Decimal('300.00')
    assert line.actual_total == Decimal('300.00')
    assert line.insurer_amount == Decimal('0.00')


# ---------------------------------------------------------------------------
# Insurance
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_an_insurance_price_is_a_split_not_a_discount(
        insurance_mode, insurance_company, drug, invoice):
    """
    The insurer's `sale_price` and the patient's `co_pay` are two halves of one
    charge. The line is worth both together, and each party owes their half.
    """
    InsuranceItemSalePrice.objects.create(
        item=drug, insurance_company=insurance_company,
        sale_price=Decimal('80.00'), co_pay=Decimal('20.00'))

    line = InvoiceItem.objects.create(
        invoice=invoice, item=drug, quantity=2, payment_mode=insurance_mode)

    assert line.unit_price == Decimal('100.00')
    assert line.item_amount == Decimal('200.00')
    assert line.patient_amount == Decimal('40.00')
    assert line.actual_total == Decimal('160.00')
    assert line.patient_amount + line.insurer_amount == line.item_amount


@pytest.mark.django_db
def test_the_insurer_is_not_billed_short_by_the_co_pay(
        insurance_mode, insurance_company, drug, invoice):
    """
    The bug this whole change exists for: a pre_save recomputed actual_total as
    item_amount - co_pay, against an item_amount that already held only the
    insurer's portion. An 80/20 split billed the insurer 60.
    """
    InsuranceItemSalePrice.objects.create(
        item=drug, insurance_company=insurance_company,
        sale_price=Decimal('80.00'), co_pay=Decimal('20.00'))

    line = InvoiceItem.objects.create(
        invoice=invoice, item=drug, quantity=1, payment_mode=insurance_mode)

    assert line.actual_total == Decimal('80.00')


@pytest.mark.django_db
def test_insurance_with_no_configured_price_falls_back_to_the_patient(
        insurance_mode, drug, invoice):
    """
    Nothing was agreed with the insurer for this item, so nothing is claimed
    from them -- rather than quietly sending a number out of the cash list.
    """
    line = InvoiceItem.objects.create(
        invoice=invoice, item=drug, quantity=1, payment_mode=insurance_mode)

    assert line.price_source == 'cash_fallback'
    assert line.patient_amount == Decimal('100.00')
    assert line.actual_total == Decimal('100.00')
    assert line.insurer_amount == Decimal('0.00')


# ---------------------------------------------------------------------------
# Freezing the price
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_a_billed_line_keeps_the_price_it_was_sold_at(cash_mode, drug, invoice):
    """
    The effective-dated price list exists so history is never rewritten. It was
    defeated by a save() that re-read today's price every time anything touched
    the row -- a status change, a signal, a stock posting.
    """
    line = InvoiceItem.objects.create(
        invoice=invoice, item=drug, quantity=1, status='billed')
    assert line.item_amount == Decimal('100.00')

    stock_service.set_sale_price(drug, Decimal('250.00'))
    line.save()
    line.refresh_from_db()

    assert line.unit_price == Decimal('100.00')
    assert line.item_amount == Decimal('100.00')


@pytest.mark.django_db
def test_a_pending_line_still_follows_the_price_list(cash_mode, drug, invoice):
    """Until it is billed, nothing has been agreed, so it re-prices."""
    line = InvoiceItem.objects.create(invoice=invoice, item=drug, quantity=1)

    stock_service.set_sale_price(drug, Decimal('250.00'))
    line.save()
    line.refresh_from_db()

    assert line.item_amount == Decimal('250.00')


@pytest.mark.django_db
def test_sale_price_quotes_the_frozen_price(cash_mode, drug, invoice):
    line = InvoiceItem.objects.create(
        invoice=invoice, item=drug, quantity=1, status='billed')

    stock_service.set_sale_price(drug, Decimal('250.00'))

    assert line.sale_price == Decimal('100.00')


# ---------------------------------------------------------------------------
# Rolling up
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_invoice_totals_separate_the_two_payers(
        cash_mode, insurance_mode, insurance_company, drug, invoice):
    InsuranceItemSalePrice.objects.create(
        item=drug, insurance_company=insurance_company,
        sale_price=Decimal('80.00'), co_pay=Decimal('20.00'))
    consult = Item.objects.create(
        name='Consultation', desc='General', category='General Appointment',
        units_of_measure='visit', item_code='APP-GEN')
    stock_service.set_sale_price(consult, Decimal('500.00'))

    InvoiceItem.objects.create(
        invoice=invoice, item=drug, quantity=1, payment_mode=insurance_mode)
    InvoiceItem.objects.create(
        invoice=invoice, item=consult, quantity=1, payment_mode=cash_mode)

    invoice.refresh_from_db()

    # Receivable from whoever each line is billed to: 80 from the insurer, 500
    # from the patient for the consultation.
    assert invoice.invoice_amount == Decimal('580.00')
    # The patient also owes the 20 co-pay, which is what patient_due is for.
    assert invoice.patient_due == Decimal('520.00')
    assert invoice.gross_total == Decimal('600.00')
    assert invoice.total_cash == Decimal('500.00')


@pytest.mark.django_db
def test_a_line_is_priced_when_it_is_billed_not_when_it_is_raised(
        cash_mode, drug, invoice):
    """
    The doctor raises the line; the till bills it, possibly days later. The
    price charged is the one in force at the till, so the line keeps following
    the list right up to and including the save that sells it.
    """
    line = InvoiceItem.objects.create(invoice=invoice, item=drug, quantity=1)
    assert line.item_amount == Decimal('100.00')

    stock_service.set_sale_price(drug, Decimal('130.00'))
    line.status = 'billed'
    line.save()
    line.refresh_from_db()

    assert line.unit_price == Decimal('130.00')


@pytest.mark.django_db
def test_the_quantity_on_a_sold_line_cannot_be_edited(cash_mode, drug, invoice):
    """
    Its price is frozen, so a quantity change would leave the totals describing
    a different sale from the one the ledger posted.
    """
    line = InvoiceItem.objects.create(
        invoice=invoice, item=drug, quantity=2, status='billed')

    line.quantity = 5
    with pytest.raises(DjangoValidationError):
        line.save()

    line.refresh_from_db()
    assert line.quantity == 2
    assert line.item_amount == Decimal('200.00')


@pytest.mark.django_db
def test_a_sold_line_can_still_be_re_saved_untouched(cash_mode, drug, invoice):
    """Signals re-save billed lines constantly; that must stay free."""
    line = InvoiceItem.objects.create(
        invoice=invoice, item=drug, quantity=2, status='billed')

    line.save()
    line.refresh_from_db()

    assert line.item_amount == Decimal('200.00')

