"""
The Cash & Cash Equivalents summary for a range of days: each account opens
with what it held before the first day, and closes with what it held at the
end of the last -- not today's balance whatever the dates say. And a payment
is dated by the server, the day it is recorded.
"""
from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from billing.models import (
    Invoice, InvoiceItem, MainAccount, PaymentMode, PaymentReceipt, SubAccount,
)
from billing.transfers import make_transfer
from inventory.models import Department, Item
from inventory.services import stock as stock_service


@pytest.fixture
def api(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def equity(db):
    bank = MainAccount.objects.create(name='Bank Accounts')
    return SubAccount.objects.create(main_account=bank, name='Equity', opening_bal=Decimal('20000.00'))


@pytest.fixture
def cash(db):
    mode = PaymentMode.objects.create(payment_mode='Cash', payment_category='cash', is_default=True)
    main = MainAccount.objects.create(name='Cash')
    return SubAccount.objects.create(main_account=main, payment_mode=mode, name='Till', opening_bal=Decimal('0'))


def positions(api, **dates):
    response = api.get('/billing/accounting-summary/', {k: v.isoformat() for k, v in dates.items()})
    assert response.status_code == 200, response.content
    return {row['sub_account']: row for row in response.data['account_positions']}


def test_without_dates_the_summary_is_the_whole_history(api, equity, cash):
    make_transfer(from_account=equity, to_account=cash, amount=Decimal('3000.00'))

    rows = positions(api)

    assert rows['Equity']['opening_balance'] == Decimal('20000.00')
    assert rows['Equity']['total_credit'] == Decimal('3000.00')
    assert rows['Equity']['balance'] == equity.balance == Decimal('17000.00')
    assert rows['Till']['balance'] == cash.balance == Decimal('3000.00')


def test_the_range_opens_with_what_came_before_it(api, equity, cash):
    today = timezone.localdate()
    make_transfer(from_account=equity, to_account=cash, amount=Decimal('3000.00'),
                  transfer_date=today - timedelta(days=5))
    make_transfer(from_account=equity, to_account=cash, amount=Decimal('1000.00'))

    rows = positions(api, start_date=today, end_date=today)

    assert rows['Equity']['opening_balance'] == Decimal('17000.00')
    assert rows['Equity']['total_credit'] == Decimal('1000.00')
    assert rows['Equity']['balance'] == Decimal('16000.00')
    assert rows['Till']['opening_balance'] == Decimal('3000.00')
    assert rows['Till']['total_debit'] == Decimal('1000.00')
    assert rows['Till']['balance'] == Decimal('4000.00')


def test_the_range_closes_at_its_last_day_not_today(api, equity, cash):
    today = timezone.localdate()
    make_transfer(from_account=equity, to_account=cash, amount=Decimal('3000.00'),
                  transfer_date=today - timedelta(days=5))
    make_transfer(from_account=equity, to_account=cash, amount=Decimal('1000.00'))

    rows = positions(api, end_date=today - timedelta(days=1))

    assert rows['Equity']['balance'] == Decimal('17000.00')
    assert rows['Till']['balance'] == Decimal('3000.00')


def test_a_receipt_counts_on_its_payment_date(api, cash):
    today = timezone.localdate()
    PaymentReceipt.objects.create(sub_account=cash, total_amount=Decimal('500.00'),
                                  reference_number='OLD', payment_date=today - timedelta(days=3))
    PaymentReceipt.objects.create(sub_account=cash, total_amount=Decimal('200.00'),
                                  reference_number='NEW', payment_date=today)

    rows = positions(api, start_date=today, end_date=today)

    assert rows['Till']['opening_balance'] == Decimal('500.00')
    assert rows['Till']['total_debit'] == Decimal('200.00')
    assert rows['Till']['balance'] == Decimal('700.00')


def test_an_account_with_no_movement_still_shows(api, equity):
    today = timezone.localdate()

    rows = positions(api, start_date=today, end_date=today)

    assert rows['Equity']['opening_balance'] == Decimal('20000.00')
    assert rows['Equity']['balance'] == Decimal('20000.00')


def test_a_patient_payment_is_dated_the_day_it_is_recorded(api, patient, cash):
    """The cashier can't backdate a payment into a day that has already been reconciled."""
    pharmacy = Department.objects.create(name='Pharmacy')
    drug = Item.objects.create(
        name='Paracetamol 500mg', desc='Painkiller', category='Drug',
        units_of_measure='tablets', item_code='DRG-PCM-500')
    stock_service.set_sale_price(drug, Decimal('100.00'))
    stock_service.receive(item=drug, department=pharmacy, quantity=50, unit_cost=40, lot_number='L1')
    invoice = Invoice.objects.create(patient=patient, invoice_number='INV-1')
    InvoiceItem.objects.create(invoice=invoice, item=drug, quantity=2, status='billed')

    response = api.post('/billing/allocate-payment/', {
        'patient_id': patient.id,
        'invoice_ids': [invoice.id],
        'sub_account': cash.id,
        'amount': '200.00',
        'reference_number': 'CASH-OLD',
        'payment_date': (timezone.localdate() - timedelta(days=30)).isoformat(),
    }, format='json')

    assert response.status_code == 201, response.content
    assert PaymentReceipt.objects.get().payment_date == timezone.localdate()
