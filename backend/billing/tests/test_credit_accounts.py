"""
Credit accounts: an employer paying for its staff, or a facility sending
samples in, billed the way an insurer is -- and the statement they settle by.
"""
import datetime as dt
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from billing.models import Invoice, InvoiceItem, PaymentMode, PaymentReceipt
from billing.statements import account_statement
from company.models import InsuranceCompany
from inventory.models import Department, InsuranceItemSalePrice, Item
from inventory.services import stock as stock_service


@pytest.fixture
def cash_mode(db):
    return PaymentMode.objects.create(
        payment_mode='Cash', payment_category='cash', is_default=True)


@pytest.fixture
def corporate(db):
    return InsuranceCompany.objects.create(
        name='Safaricom PLC', account_type=InsuranceCompany.AccountType.CORPORATE,
        contact_person='HR Benefits', email='benefits@example.com')


@pytest.fixture
def insurer(db):
    return InsuranceCompany.objects.create(name='AAR')


def mode_for(account):
    return PaymentMode.objects.get(insurance=account)


@pytest.fixture
def drug(db):
    pharmacy = Department.objects.create(name='Pharmacy')
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


@pytest.mark.django_db
def test_every_kind_of_account_gets_its_own_payment_mode(corporate, insurer):
    facility = InsuranceCompany.objects.create(
        name='Mama Lucy Clinic', account_type=InsuranceCompany.AccountType.FACILITY)

    for account in (corporate, insurer, facility):
        mode = mode_for(account)
        assert mode.payment_mode == account.name
        assert mode.payment_category == 'insurance'


@pytest.mark.django_db
def test_renaming_an_account_renames_its_payment_mode(corporate):
    corporate.name = 'Safaricom Ltd'
    corporate.save()

    assert mode_for(corporate).payment_mode == 'Safaricom Ltd'


@pytest.mark.django_db
def test_a_corporate_pays_its_agreed_price(cash_mode, corporate, drug, invoice):
    InsuranceItemSalePrice.objects.create(
        item=drug, insurance_company=corporate, sale_price=Decimal('80.00'), co_pay=0)

    line = InvoiceItem.objects.create(
        invoice=invoice, item=drug, quantity=2, payment_mode=mode_for(corporate))

    assert line.price_source == 'insurance'
    assert line.actual_total == Decimal('160.00')
    assert line.patient_amount == Decimal('0.00')


@pytest.mark.django_db
def test_a_corporate_with_no_agreed_price_pays_the_price_list(cash_mode, corporate, drug, invoice):
    """Unlike an insurer, an employer has signed up to the price list."""
    line = InvoiceItem.objects.create(
        invoice=invoice, item=drug, quantity=2, payment_mode=mode_for(corporate))

    assert line.price_source == 'account_list_price'
    assert line.item_amount == Decimal('200.00')
    assert line.actual_total == Decimal('200.00')
    assert line.patient_amount == Decimal('0.00')
    assert line.insurer_amount == Decimal('200.00')


@pytest.mark.django_db
def test_an_insurer_with_no_agreed_price_still_falls_back_to_the_patient(
        cash_mode, insurer, drug, invoice):
    line = InvoiceItem.objects.create(
        invoice=invoice, item=drug, quantity=1, payment_mode=mode_for(insurer))

    assert line.price_source == 'cash_fallback'
    assert line.patient_amount == Decimal('100.00')


@pytest.mark.django_db
def test_the_statement_carries_the_balance_forward(cash_mode, corporate, drug, invoice):
    mode = mode_for(corporate)
    last_month = InvoiceItem.objects.create(
        invoice=invoice, item=drug, quantity=1, payment_mode=mode, status='billed')
    this_month = InvoiceItem.objects.create(
        invoice=invoice, item=drug, quantity=3, payment_mode=mode, status='billed')
    # Ordered but not yet billed: not a charge yet.
    InvoiceItem.objects.create(invoice=invoice, item=drug, quantity=5, payment_mode=mode)
    InvoiceItem.objects.filter(pk=last_month.pk).update(
        item_created_at=dt.datetime(2026, 9, 15, 10, tzinfo=dt.timezone.utc))
    InvoiceItem.objects.filter(pk=this_month.pk).update(
        item_created_at=dt.datetime(2026, 10, 10, 10, tzinfo=dt.timezone.utc))
    PaymentReceipt.objects.create(
        insurance=corporate, total_amount=Decimal('60.00'), reference_number='EFT-1',
        payment_date=dt.date(2026, 9, 30))
    PaymentReceipt.objects.create(
        insurance=corporate, total_amount=Decimal('40.00'), reference_number='EFT-2',
        payment_date=dt.date(2026, 10, 20))

    statement = account_statement(corporate, dt.date(2026, 10, 1), dt.date(2026, 10, 31))

    assert statement['opening_balance'] == Decimal('40.00')
    assert [row['quantity'] for row in statement['charges']] == [3]
    assert statement['total_charged'] == Decimal('300.00')
    assert [row['reference'] for row in statement['payments']] == ['EFT-2']
    assert statement['closing_balance'] == Decimal('300.00')


@pytest.mark.django_db
def test_the_statement_endpoint_answers_json_and_checks_dates(admin_user, corporate):
    client = APIClient()
    client.force_authenticate(admin_user)
    url = f'/billing/accounts/{corporate.id}/statement/'

    response = client.get(url, {'start': '2026-10-01', 'end': '2026-10-31'})
    assert response.status_code == 200
    assert response.data['account']['name'] == 'Safaricom PLC'
    assert response.data['closing_balance'] == Decimal('0')

    assert client.get(url, {'start': '2026-10-01'}).status_code == 400
    assert client.get(url, {'start': 'yesterday', 'end': '2026-10-31'}).status_code == 400


@pytest.mark.django_db
def test_accounts_can_be_listed_by_type(admin_user, corporate, insurer):
    client = APIClient()
    client.force_authenticate(admin_user)

    response = client.get('/company/insurance-companies/', {'account_type': 'corporate'})

    assert response.status_code == 200
    assert [row['name'] for row in response.data] == ['Safaricom PLC']
    assert response.data[0]['account_type_display'] == 'Corporate client'
