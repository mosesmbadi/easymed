"""
Zero-value lines, discounts and credit notes: the customer's total comes down,
and everything that reads a line agrees on the new figure.
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient

from billing.adjustments import AdjustmentError, apply_invoice_discount, issue_credit_note
from billing.models import Invoice, InvoiceItem, PaymentAllocation, PaymentMode, PaymentReceipt
from company.models import InsuranceCompany
from inventory.models import Department, InsuranceItemSalePrice, Item, StockBalance
from inventory.services import stock as stock_service

User = get_user_model()


@pytest.fixture(autouse=True)
def stock_location(db):
    """Billing resolves a dispensing location even for a line that holds no stock."""
    return Department.objects.get_or_create(name='Main', defaults={'is_stock_location': True})[0]


@pytest.fixture
def cash_mode(db):
    return PaymentMode.objects.create(payment_mode='Cash', payment_category='cash', is_default=True)


@pytest.fixture
def insurer(db):
    return InsuranceCompany.objects.create(name='AAR')


@pytest.fixture
def insurance_mode(insurer):
    return PaymentMode.objects.create(
        payment_mode='AAR', payment_category='insurance', insurance=insurer)


@pytest.fixture
def pharmacy(db):
    return Department.objects.create(name='Pharmacy')


@pytest.fixture
def drug(pharmacy):
    item = Item.objects.create(
        name='Paracetamol', desc='Painkiller', category='Drug',
        units_of_measure='tablets', item_code='DRG-1')
    stock_service.set_sale_price(item, Decimal('100.00'))
    stock_service.receive(item=item, department=pharmacy, quantity=50, unit_cost=40, lot_number='L1')
    return item


@pytest.fixture
def service(db):
    item = Item.objects.create(
        name='Dressing', desc='Dressing', category='General Appointment',
        units_of_measure='unit', item_code='SRV-1')
    stock_service.set_sale_price(item, Decimal('300.00'))
    return item


@pytest.fixture
def free_item(db):
    return Item.objects.create(
        name='Urine pH', desc='pH', category='Lab Test', units_of_measure='test', item_code='LAB-PH')


@pytest.fixture
def invoice(patient):
    return Invoice.objects.create(patient=patient)


def bill(invoice, item, mode=None, **fields):
    line = InvoiceItem.objects.create(invoice=invoice, item=item, payment_mode=mode, **fields)
    line.status = 'billed'
    line.save()
    return line


def pay(line, amount, insurer=None):
    receipt = PaymentReceipt.objects.create(
        patient=None if insurer else line.invoice.patient, insurance=insurer,
        total_amount=amount, reference_number='R1')
    return PaymentAllocation.objects.create(receipt=receipt, invoice_item=line, amount_applied=amount)


def staff(role, email, **extra):
    user = User.objects.create_user(
        email=email, password='x', first_name='A', last_name='B', role=role, is_staff=True, **extra)
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def admin_api(db):
    return staff('sysadmin', 'admin@x.test')


@pytest.fixture
def cashier_api(db):
    return staff('receptionist', 'cashier@x.test')


# Zero-value billing

def test_an_item_with_no_price_bills_at_zero(cash_mode, invoice, free_item):
    line = bill(invoice, free_item)

    line.refresh_from_db()
    assert line.status == 'billed'
    assert (line.item_amount, line.patient_amount, line.actual_total) == (0, 0, 0)


def test_an_invoice_of_only_zero_lines_closes_itself(cash_mode, invoice, free_item):
    """No payment will ever arrive, so nothing else could take it off the unpaid list."""
    bill(invoice, free_item)

    invoice.refresh_from_db()
    assert invoice.status == 'paid'


def test_a_zero_line_leaves_money_still_owed_open(cash_mode, invoice, free_item, service):
    bill(invoice, service)
    bill(invoice, free_item)

    invoice.refresh_from_db()
    assert invoice.status == 'pending'


def test_a_new_line_reopens_a_closed_invoice(cash_mode, invoice, free_item, service):
    bill(invoice, free_item)

    InvoiceItem.objects.create(invoice=invoice, item=service)

    invoice.refresh_from_db()
    assert invoice.status == 'pending'


# Line discounts

def test_a_line_discount_reduces_what_the_patient_owes(cash_mode, invoice, service):
    line = bill(invoice, service, discount=Decimal('50.00'))

    assert line.item_amount == Decimal('300.00')
    assert line.patient_amount == Decimal('250.00')
    assert line.actual_total == Decimal('250.00')
    invoice.refresh_from_db()
    assert invoice.invoice_amount == Decimal('250.00')
    assert invoice.total_cash == Decimal('250.00')


def test_a_discount_cannot_exceed_the_patients_share(cash_mode, invoice, service):
    with pytest.raises(ValidationError):
        bill(invoice, service, discount=Decimal('301.00'))


def test_a_discount_never_touches_an_insurers_agreed_share(
        insurance_mode, insurer, invoice, service):
    InsuranceItemSalePrice.objects.create(
        item=service, insurance_company=insurer, sale_price=Decimal('240.00'), co_pay=Decimal('60.00'))

    line = bill(invoice, service, insurance_mode, discount=Decimal('60.00'))

    assert line.patient_amount == 0
    assert line.actual_total == Decimal('240.00')
    assert line.insurer_amount == Decimal('240.00')
    with pytest.raises(ValidationError):
        bill(invoice, service, insurance_mode, discount=Decimal('61.00'))


def test_a_discount_after_billing_moves_the_balance_by_the_difference(cash_mode, invoice, service):
    line = bill(invoice, service, discount=Decimal('50.00'))

    line.discount = Decimal('20.00')
    line.save()

    assert line.patient_amount == Decimal('280.00')
    assert line.actual_total == Decimal('280.00')


def test_a_discount_cannot_go_below_what_was_paid(cash_mode, invoice, service):
    line = bill(invoice, service)
    pay(line, Decimal('280.00'))

    line.discount = Decimal('50.00')
    with pytest.raises(ValidationError):
        line.save()


def test_only_an_admin_can_give_a_line_discount(cash_mode, invoice, service, admin_api, cashier_api):
    line = InvoiceItem.objects.create(invoice=invoice, item=service)
    url = f'/billing/invoice-items/{line.id}/'

    refused = cashier_api.patch(url, {'status': 'billed', 'discount': '10.00'}, format='json')
    assert refused.status_code == 422
    line.refresh_from_db()
    assert line.status == 'pending'

    allowed = admin_api.patch(url, {'status': 'billed', 'discount': '10.00'}, format='json')
    assert allowed.status_code == 200, allowed.data
    assert Decimal(allowed.data['patient_amount']) == Decimal('290.00')
    assert Decimal(allowed.data['net_amount']) == Decimal('290.00')


def test_a_cashier_can_still_bill_without_a_discount(cash_mode, invoice, service, cashier_api):
    line = InvoiceItem.objects.create(invoice=invoice, item=service)

    response = cashier_api.patch(
        f'/billing/invoice-items/{line.id}/', {'status': 'billed', 'discount': '0.00'}, format='json')

    assert response.status_code == 200, response.data


# Invoice discount

def test_the_total_discount_is_spread_and_adds_up_exactly(cash_mode, invoice, service, drug):
    first = bill(invoice, service)
    second = bill(invoice, drug)

    apply_invoice_discount(invoice, Decimal('100.00'))

    first.refresh_from_db()
    second.refresh_from_db()
    assert first.invoice_discount + second.invoice_discount == Decimal('100.00')
    assert first.patient_amount + second.patient_amount == Decimal('300.00')
    invoice.refresh_from_db()
    assert invoice.total_cash == Decimal('300.00')


def test_a_new_total_discount_replaces_the_old_one(cash_mode, invoice, service):
    line = bill(invoice, service)

    apply_invoice_discount(invoice, Decimal('100.00'))
    apply_invoice_discount(invoice, Decimal('30.00'))

    line.refresh_from_db()
    assert line.invoice_discount == Decimal('30.00')
    assert line.patient_amount == Decimal('270.00')

    apply_invoice_discount(invoice, Decimal('0'))
    line.refresh_from_db()
    assert line.patient_amount == Decimal('300.00')


def test_the_total_discount_applies_to_cash_and_not_credit(
        cash_mode, insurance_mode, insurer, invoice, service, drug):
    InsuranceItemSalePrice.objects.create(
        item=service, insurance_company=insurer, sale_price=Decimal('300.00'), co_pay=0)
    credit_line = bill(invoice, service, insurance_mode)
    cash_line = bill(invoice, drug)

    with pytest.raises(AdjustmentError):
        apply_invoice_discount(invoice, Decimal('101.00'))

    apply_invoice_discount(invoice, Decimal('100.00'))

    credit_line.refresh_from_db()
    cash_line.refresh_from_db()
    assert credit_line.actual_total == Decimal('300.00')
    assert credit_line.invoice_discount == 0
    assert cash_line.patient_amount == 0


def test_a_discount_covering_everything_closes_the_invoice(cash_mode, invoice, service):
    bill(invoice, service)

    apply_invoice_discount(invoice, Decimal('300.00'))

    invoice.refresh_from_db()
    assert invoice.status == 'paid'


def test_only_an_admin_can_discount_the_total(cash_mode, invoice, service, admin_api, cashier_api):
    bill(invoice, service)
    url = f'/billing/invoices/{invoice.id}/discount/'

    assert cashier_api.post(url, {'amount': '50.00'}, format='json').status_code == 403

    response = admin_api.post(url, {'amount': '50.00'}, format='json')
    assert response.status_code == 200, response.data
    assert Decimal(str(response.data['invoice_discount'])) == Decimal('50.00')


# Credit notes

def test_a_whole_invoice_can_be_credited(cash_mode, invoice, service, drug):
    bill(invoice, service)
    bill(invoice, drug)

    note = issue_credit_note(invoice=invoice, reason='Billed to the wrong patient')

    assert note.total_amount == Decimal('400.00')
    assert note.credit_note_number.startswith('DDLC00001-')
    invoice.refresh_from_db()
    assert invoice.invoice_amount == 0
    assert invoice.status == 'paid'


def test_part_of_a_line_can_be_credited(cash_mode, invoice, service):
    line = bill(invoice, service)

    note = issue_credit_note(
        invoice=invoice, reason='Overcharged',
        lines=[{'invoice_item': line.pk, 'amount': Decimal('100.00')}])

    line.refresh_from_db()
    assert note.total_amount == Decimal('100.00')
    assert line.patient_amount == Decimal('200.00')
    assert line.actual_total == Decimal('200.00')
    assert line.net_amount == Decimal('200.00')
    invoice.refresh_from_db()
    assert invoice.status == 'pending'


def test_one_line_of_several_can_be_credited(cash_mode, invoice, service, drug):
    line = bill(invoice, service)
    other = bill(invoice, drug)

    issue_credit_note(invoice=invoice, reason='Not done', lines=[{'invoice_item': line.pk}])

    line.refresh_from_db()
    other.refresh_from_db()
    assert line.net_amount == 0
    assert other.net_amount == Decimal('100.00')
    invoice.refresh_from_db()
    assert invoice.invoice_amount == Decimal('100.00')


def test_a_line_cannot_be_credited_for_more_than_is_left(cash_mode, invoice, service):
    line = bill(invoice, service, discount=Decimal('50.00'))

    with pytest.raises(AdjustmentError):
        issue_credit_note(
            invoice=invoice, reason='x', lines=[{'invoice_item': line.pk, 'amount': Decimal('251.00')}])

    issue_credit_note(invoice=invoice, reason='x', lines=[{'invoice_item': line.pk}])
    with pytest.raises(AdjustmentError):
        issue_credit_note(invoice=invoice, reason='x', lines=[{'invoice_item': line.pk}])


def test_an_unbilled_line_cannot_be_credited(cash_mode, invoice, service):
    line = InvoiceItem.objects.create(invoice=invoice, item=service)

    with pytest.raises(AdjustmentError):
        issue_credit_note(invoice=invoice, reason='x', lines=[{'invoice_item': line.pk}])


def test_a_line_from_another_invoice_cannot_be_credited(cash_mode, invoice, patient, service):
    other = bill(Invoice.objects.create(patient=patient), service)

    with pytest.raises(AdjustmentError):
        issue_credit_note(invoice=invoice, reason='x', lines=[{'invoice_item': other.pk}])


def test_crediting_an_insured_line_reduces_both_parties(
        insurance_mode, insurer, invoice, service):
    InsuranceItemSalePrice.objects.create(
        item=service, insurance_company=insurer, sale_price=Decimal('240.00'), co_pay=Decimal('60.00'))
    line = bill(invoice, service, insurance_mode)

    note = issue_credit_note(
        invoice=invoice, reason='Half', lines=[{'invoice_item': line.pk, 'amount': Decimal('150.00')}])

    line.refresh_from_db()
    credited = note.lines.get()
    assert credited.patient_amount == Decimal('30.00')
    assert credited.payer_amount == Decimal('120.00')
    assert line.patient_amount == Decimal('30.00')
    assert line.actual_total == Decimal('120.00')
    assert line.insurer_amount == Decimal('120.00')


def test_money_already_paid_is_recorded_as_refundable(cash_mode, invoice, service):
    line = bill(invoice, service)
    pay(line, Decimal('300.00'))

    note = issue_credit_note(
        invoice=invoice, reason='x', lines=[{'invoice_item': line.pk, 'amount': Decimal('100.00')}])

    assert note.refund_due == Decimal('100.00')


def test_a_fully_credited_drug_goes_back_on_the_shelf(cash_mode, invoice, drug, pharmacy):
    def on_hand():
        return StockBalance.objects.get(item=drug, department=pharmacy).quantity

    line = bill(invoice, drug)
    assert on_hand() == 49

    note = issue_credit_note(invoice=invoice, reason='Returned', lines=[{'invoice_item': line.pk}])

    assert on_hand() == 50
    assert note.lines.get().restocked is True


def test_a_partial_credit_leaves_the_stock_alone(cash_mode, invoice, drug, pharmacy):
    line = bill(invoice, drug)

    issue_credit_note(
        invoice=invoice, reason='Goodwill', lines=[{'invoice_item': line.pk, 'amount': Decimal('10.00')}])

    assert StockBalance.objects.get(item=drug, department=pharmacy).quantity == 49


def test_credit_notes_are_admin_only_to_issue_and_cannot_be_edited(
        cash_mode, invoice, service, admin_api, cashier_api):
    bill(invoice, service)
    payload = {'invoice': invoice.id, 'reason': 'Wrong patient'}

    assert cashier_api.post('/billing/credit-notes/', payload, format='json').status_code == 403

    created = admin_api.post('/billing/credit-notes/', payload, format='json')
    assert created.status_code == 201, created.data
    assert Decimal(created.data['total_amount']) == Decimal('300.00')

    url = f"/billing/credit-notes/{created.data['id']}/"
    assert cashier_api.get(url).status_code == 200
    assert admin_api.patch(url, {'reason': 'x'}, format='json').status_code == 405
    assert admin_api.delete(url).status_code == 405


def test_credit_note_and_invoice_pdfs_render(client, cash_mode, invoice, service, company):
    line = bill(invoice, service, discount=Decimal('10.00'))
    note = issue_credit_note(
        invoice=invoice, reason='x', lines=[{'invoice_item': line.pk, 'amount': Decimal('5.00')}])

    assert client.get(f'/billing/download_credit_note_pdf/{note.id}/').status_code == 200
    assert client.get(f'/billing/download_invoice_pdf/{invoice.id}/').status_code == 200
