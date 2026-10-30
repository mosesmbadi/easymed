"""
Cash is the default payment mode, and the item's sale price (captured when the
goods were received) is the cash price.
"""

from decimal import Decimal

import pytest

from billing.models import Invoice, InvoiceItem, PaymentMode
from inventory.models import Item
from inventory.services import stock as stock_service


@pytest.fixture
def cash_mode(db):
    return PaymentMode.objects.create(
        payment_mode='Cash', payment_category='cash', is_default=True)


@pytest.fixture
def drug(db):
    return Item.objects.create(
        name='Paracetamol 500mg', desc='Painkiller', category='Drug',
        units_of_measure='tablets', item_code='DRG-00200')


@pytest.mark.django_db
def test_only_one_payment_mode_can_be_default(cash_mode):
    other = PaymentMode.objects.create(
        payment_mode='Mobile Money', payment_category='mobile_money', is_default=True)

    cash_mode.refresh_from_db()
    assert other.is_default
    assert not cash_mode.is_default
    assert PaymentMode.objects.filter(is_default=True).count() == 1


@pytest.mark.django_db
def test_get_default_prefers_the_flagged_mode(cash_mode):
    assert PaymentMode.get_default() == cash_mode


@pytest.mark.django_db
def test_get_default_falls_back_to_any_cash_mode(db):
    fallback = PaymentMode.objects.create(payment_mode='Cash', payment_category='cash')
    assert PaymentMode.get_default() == fallback


@pytest.mark.django_db
def test_invoice_item_defaults_to_cash_when_no_insurance(cash_mode, drug, patient):
    stock_service.set_sale_price(drug, Decimal('80.00'))
    invoice = Invoice.objects.create(patient=patient)

    line = InvoiceItem.objects.create(invoice=invoice, item=drug, quantity=2)

    assert line.payment_mode == cash_mode
    assert line.price_source == 'cash'


@pytest.mark.django_db
def test_cash_price_comes_from_the_sale_price_entered_on_receipt(cash_mode, drug, patient):
    """
    Sale price is captured when goods are received; that is the cash price the
    patient is billed.
    """
    stock_service.set_sale_price(drug, Decimal('80.00'))
    invoice = Invoice.objects.create(patient=patient)

    line = InvoiceItem.objects.create(invoice=invoice, item=drug, quantity=3)

    assert drug.current_sale_price == Decimal('80.00')
    assert line.sale_price == Decimal('80.00')
    assert line.item_amount == Decimal('240.00')  # 80 x 3


@pytest.mark.django_db
def test_a_new_receipt_price_only_affects_later_invoices(cash_mode, drug, patient):
    stock_service.set_sale_price(drug, Decimal('80.00'))
    invoice = Invoice.objects.create(patient=patient)
    first = InvoiceItem.objects.create(invoice=invoice, item=drug, quantity=1)

    stock_service.set_sale_price(drug, Decimal('95.00'))
    second = InvoiceItem.objects.create(invoice=invoice, item=drug, quantity=1)

    # The already-billed line keeps the amount it was raised at.
    first.refresh_from_db()
    assert first.item_amount == Decimal('80.00')
    assert second.item_amount == Decimal('95.00')
