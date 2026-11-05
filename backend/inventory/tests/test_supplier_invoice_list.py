"""
The Accounts Payable invoices screen: finding invoices, seeing what is still
owed, and paying one so that the money really leaves an account.
"""
from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from billing.models import MainAccount, SubAccount
from inventory.models import IncomingItem, Supplier, SupplierInvoice

URL = '/inventory/supplier-invoice/'


@pytest.fixture
def api(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def new_invoice(supplier, purchase_order):
    def build(number, amount='1000.00', status='pending', on_supplier=None):
        return SupplierInvoice.objects.create(
            invoice_no=number, amount=Decimal(amount), status=status,
            supplier=on_supplier or supplier, purchase_order=purchase_order)
    return build


@pytest.fixture
def bank(db):
    main = MainAccount.objects.create(name='Bank Accounts')
    return SubAccount.objects.create(main_account=main, name='Equity', opening_bal=Decimal('5000.00'))


def numbers(response):
    assert response.status_code == 200, response.content
    return {row['invoice_no'] for row in response.data}


def pay(api, invoice, sub_account, amount, reference='TRX-1'):
    return api.post('/inventory/allocate-supplier-payment/', {
        'supplier_id': invoice.supplier_id,
        'invoice_ids': [invoice.id],
        'sub_account': sub_account.id,
        'amount': amount,
        'reference_number': reference,
        'payment_date': timezone.localdate().isoformat(),
    }, format='json')


def test_pending_includes_part_paid_invoices(api, new_invoice):
    new_invoice('PENDING')
    new_invoice('PARTIAL', status='partial')
    new_invoice('PAID', status='paid')

    assert numbers(api.get(URL, {'status': 'pending'})) == {'PENDING', 'PARTIAL'}
    assert numbers(api.get(URL, {'status': 'paid'})) == {'PAID'}
    assert numbers(api.get(URL)) == {'PENDING', 'PARTIAL', 'PAID'}


def test_filters_by_date_range(api, new_invoice):
    today = timezone.now()
    old = new_invoice('OLD')
    SupplierInvoice.objects.filter(pk=old.pk).update(date_created=today - timedelta(days=10))
    new_invoice('NEW')

    cutoff = (timezone.localdate() - timedelta(days=5)).isoformat()

    assert numbers(api.get(URL, {'date_from': cutoff})) == {'NEW'}
    assert numbers(api.get(URL, {'date_to': cutoff})) == {'OLD'}


def test_filters_by_supplier(api, new_invoice):
    other = Supplier.objects.create(official_name='Other Supplies Ltd', common_name='Other')
    new_invoice('MINE')
    new_invoice('THEIRS', on_supplier=other)

    assert numbers(api.get(URL, {'supplier': other.id})) == {'THEIRS'}


def test_searches_by_invoice_number_and_supplier_name(api, new_invoice):
    other = Supplier.objects.create(official_name='Other Supplies Ltd', common_name='Other')
    new_invoice('INV-ABC')
    new_invoice('INV-XYZ', on_supplier=other)

    assert numbers(api.get(URL, {'search': 'ABC'})) == {'INV-ABC'}
    assert numbers(api.get(URL, {'search': 'Other Supplies'})) == {'INV-XYZ'}


def test_an_unpaid_invoice_reports_what_is_owed_and_its_age(api, new_invoice):
    invoice = new_invoice('AGED')
    SupplierInvoice.objects.filter(pk=invoice.pk).update(
        date_created=timezone.now() - timedelta(days=40))

    row = api.get(f'{URL}{invoice.id}/').data

    assert Decimal(row['outstanding_amount']) == Decimal('1000.00')
    assert row['age_days'] == 40


def test_a_paid_invoice_owes_nothing_and_stops_ageing(api, new_invoice):
    row = api.get(f"{URL}{new_invoice('DONE', status='paid').id}/").data

    assert Decimal(row['outstanding_amount']) == 0
    assert row['age_days'] is None


def test_a_part_payment_leaves_the_rest_owing(api, new_invoice, bank):
    invoice = new_invoice('PART')

    assert pay(api, invoice, bank, '400.00').status_code == 201

    row = api.get(f'{URL}{invoice.id}/').data
    assert row['status'] == 'partial'
    assert row['paid_amount'] == 400
    assert Decimal(row['outstanding_amount']) == Decimal('600.00')
    assert bank.balance == Decimal('4600.00')


def test_paying_in_full_closes_the_invoice_and_takes_it_from_the_account(api, new_invoice, bank):
    invoice = new_invoice('FULL')

    assert pay(api, invoice, bank, '1000.00').status_code == 201

    invoice.refresh_from_db()
    assert invoice.status == 'paid'
    assert bank.balance == Decimal('4000.00')


def test_details_show_the_lines_and_the_payment_references(
    api, new_invoice, bank, item, supplier, purchase_order, department
):
    invoice = new_invoice('DETAIL')
    IncomingItem.objects.create(
        item=item, supplier=supplier, purchase_order=purchase_order, supplier_invoice=invoice,
        department=department, purchase_price=Decimal('100.00'), quantity=10)
    pay(api, invoice, bank, '250.00', reference='MPESA-77')

    data = api.get(f'{URL}{invoice.id}/details/').data

    assert [line['item_name'] for line in data['lines']] == [item.name]
    assert len(data['payments']) == 1
    assert data['payments'][0]['reference_number'] == 'MPESA-77'
    assert data['payments'][0]['sub_account_name'] == 'Equity'
    assert data['payments'][0]['amount_applied'] == Decimal('250.00')


def test_the_report_is_a_pdf_of_the_filtered_invoices(api, new_invoice):
    new_invoice('REPORTED')

    response = api.get(f'{URL}report/', {'status': 'pending'})

    assert response.status_code == 200
    assert response['Content-Type'] == 'application/pdf'
    assert response.content.startswith(b'%PDF')


def test_a_bad_date_is_refused(api):
    assert api.get(URL, {'date_from': 'yesterday'}).status_code == 400
