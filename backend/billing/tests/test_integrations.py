"""
KRA eTIMS and M-Pesa: both off until configured, and neither able to hold up
or undo the payment they follow. Safaricom and KRA are stood in for here; no
test reaches the internet.
"""
from decimal import Decimal

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from billing.models import (
    EtimsSubmission, Invoice, InvoiceItem, MainAccount, MpesaPaymentRequest, PaymentMode,
    PaymentReceipt, SubAccount,
)
from billing.payments import allocate_payment
from company.models import Company
from integrations import mpesa
from inventory.models import Department, Item
from inventory.services import stock as stock_service

ETIMS_ON = dict(ETIMS_ENABLED=True, ETIMS_BASE_URL='https://etims.test/api',
                ETIMS_CMC_KEY='cmc', ETIMS_BRANCH_ID='00', ETIMS_PIN='')
MPESA_ON = dict(MPESA_ENABLED=True, MPESA_ENVIRONMENT='sandbox', MPESA_CONSUMER_KEY='key',
                MPESA_CONSUMER_SECRET='secret', MPESA_SHORTCODE='174379', MPESA_PASSKEY='pass',
                MPESA_CALLBACK_URL='https://easymed.test', MPESA_CALLBACK_TOKEN='s3cret',
                MPESA_SUB_ACCOUNT_ID=None)


@pytest.fixture
def cash_mode(db):
    return PaymentMode.objects.create(payment_mode='Cash', payment_category='cash', is_default=True)


@pytest.fixture
def mpesa_account(db):
    mode = PaymentMode.objects.create(payment_mode='M-Pesa', payment_category='mobile_money')
    main = MainAccount.objects.create(name='Mobile Money')
    return SubAccount.objects.create(main_account=main, payment_mode=mode, name='Paybill 247247')


@pytest.fixture
def invoice(db, patient, cash_mode):
    pharmacy = Department.objects.create(name='Pharmacy')
    drug = Item.objects.create(
        name='Paracetamol 500mg', desc='Painkiller', category='Drug',
        units_of_measure='tablets', item_code='DRG-PCM-500')
    stock_service.set_sale_price(drug, Decimal('100.00'))
    stock_service.receive(item=drug, department=pharmacy, quantity=50, unit_cost=40, lot_number='L1')
    invoice = Invoice.objects.create(patient=patient, invoice_number='INV-1')
    InvoiceItem.objects.create(invoice=invoice, item=drug, quantity=2, status='billed')
    invoice.refresh_from_db()
    return invoice


@pytest.fixture
def cashier(admin_user):
    client = APIClient()
    client.force_authenticate(admin_user)
    return client


def pay_in_full(invoice, account):
    return allocate_payment(
        patient_id=invoice.patient_id, invoice_ids=[invoice.id], sub_account=account.id,
        amount=Decimal('200.00'), reference_number='CASH-1')


# ---------------------------------------------------------------------------
# eTIMS
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_without_etims_a_settled_invoice_is_just_settled(invoice, mpesa_account):
    pay_in_full(invoice, mpesa_account)

    invoice.refresh_from_db()
    assert invoice.status == 'paid'
    assert not EtimsSubmission.objects.exists()


@pytest.mark.django_db
@override_settings(**ETIMS_ON)
def test_a_settled_invoice_goes_to_etims_and_comes_back_signed(
        invoice, mpesa_account, monkeypatch, django_capture_on_commit_callbacks):
    Company.objects.create(name='EaSyMed', kra_pin='P051234567X')
    sent = []

    def kra(method, url, payload=None, headers=None, **kwargs):
        sent.append((url, headers, payload))
        return {'resultCd': '000', 'resultMsg': 'It is succeeded',
                'data': {'rcptNo': 42, 'rcptSign': 'ABCD1234', 'intrlData': 'XYZ'}}

    monkeypatch.setattr('integrations.etims.request_json', kra)

    with django_capture_on_commit_callbacks(execute=True):
        pay_in_full(invoice, mpesa_account)

    submission = EtimsSubmission.objects.get(invoice=invoice)
    assert submission.status == EtimsSubmission.Status.SENT
    assert submission.receipt_number == '42'
    assert 'P051234567X00ABCD1234' in submission.qr_url
    url, headers, payload = sent[0]
    assert url.endswith('/trnsSales/saveSales')
    assert headers['tin'] == 'P051234567X'
    assert payload['totAmt'] == 200.0
    assert payload['itemList'][0]['qty'] == 2


@pytest.mark.django_db
@override_settings(**ETIMS_ON)
def test_kra_refusing_a_sale_leaves_the_payment_standing(
        invoice, mpesa_account, monkeypatch, django_capture_on_commit_callbacks):
    Company.objects.create(name='EaSyMed', kra_pin='P051234567X')
    monkeypatch.setattr('integrations.etims.request_json',
                        lambda *a, **k: {'resultCd': '910', 'resultMsg': 'Request parameter error'})
    monkeypatch.setattr('billing.etims.retry_later', lambda submission: None)

    with django_capture_on_commit_callbacks(execute=True):
        receipt = pay_in_full(invoice, mpesa_account)

    invoice.refresh_from_db()
    assert invoice.status == 'paid'
    assert PaymentReceipt.objects.filter(pk=receipt.pk).exists()
    submission = EtimsSubmission.objects.get(invoice=invoice)
    assert submission.status == EtimsSubmission.Status.FAILED
    assert '910' in submission.error


# ---------------------------------------------------------------------------
# M-Pesa
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('raw, expected', [
    ('0712 345 678', '254712345678'),
    ('+254712345678', '254712345678'),
    ('712345678', '254712345678'),
    ('0110345678', '254110345678'),
    ('12345', None),
])
def test_phone_numbers_are_put_in_safaricom_form(raw, expected):
    assert mpesa.normalize_phone(raw) == expected


@pytest.mark.django_db
def test_without_mpesa_the_till_is_told_to_take_the_code_by_hand(cashier, invoice):
    response = cashier.post('/billing/mpesa/stk-push/', {'invoice_id': invoice.id, 'phone': '0712345678'},
                            format='json')

    assert response.status_code == 503
    assert response.data['configured'] is False
    assert cashier.get('/billing/integrations/').data == {'mpesa': False, 'etims': False}


@pytest.fixture
def safaricom(monkeypatch):
    calls = []

    def daraja(method, url, payload=None, **kwargs):
        calls.append((url, payload))
        if 'oauth' in url:
            return {'access_token': 'tok', 'expires_in': '3599'}
        return {'MerchantRequestID': 'm-1', 'CheckoutRequestID': 'ws_CO_1',
                'ResponseCode': '0', 'ResponseDescription': 'Success'}

    monkeypatch.setattr('integrations.mpesa.request_json', daraja)
    return calls


def callback(result_code=0, amount=200, receipt='SJK1ABC2DE'):
    body = {'Body': {'stkCallback': {
        'MerchantRequestID': 'm-1', 'CheckoutRequestID': 'ws_CO_1',
        'ResultCode': result_code, 'ResultDesc': 'The service request is processed successfully.',
    }}}
    if result_code == 0:
        body['Body']['stkCallback']['CallbackMetadata'] = {'Item': [
            {'Name': 'Amount', 'Value': amount},
            {'Name': 'MpesaReceiptNumber', 'Value': receipt},
            {'Name': 'PhoneNumber', 'Value': 254712345678},
        ]}
    return body


@pytest.mark.django_db
@override_settings(**MPESA_ON)
def test_a_paid_stk_push_settles_the_invoice_once(cashier, invoice, mpesa_account, safaricom):
    pushed = cashier.post('/billing/mpesa/stk-push/', {'invoice_id': invoice.id, 'phone': '0712345678'},
                          format='json')
    assert pushed.status_code == 201
    assert pushed.data['amount'] == '200.00'
    assert safaricom[1][1]['PhoneNumber'] == '254712345678'
    assert safaricom[1][1]['CallBackURL'] == 'https://easymed.test/billing/mpesa/callback/s3cret/'

    anonymous = APIClient()
    assert anonymous.post('/billing/mpesa/callback/wrong/', callback(), format='json').status_code == 403
    for _ in range(2):  # Safaricom may call twice
        assert anonymous.post('/billing/mpesa/callback/s3cret/', callback(), format='json').status_code == 200

    push = MpesaPaymentRequest.objects.get()
    assert push.status == MpesaPaymentRequest.Status.PAID
    assert push.mpesa_receipt_number == 'SJK1ABC2DE'
    assert PaymentReceipt.objects.filter(reference_number='SJK1ABC2DE').count() == 1
    invoice.refresh_from_db()
    assert invoice.status == 'paid'
    assert cashier.get(f'/billing/mpesa/stk-push/{push.id}/').data['status'] == 'paid'


@pytest.mark.django_db
@override_settings(**MPESA_ON)
def test_a_declined_prompt_books_nothing(cashier, invoice, mpesa_account, safaricom):
    cashier.post('/billing/mpesa/stk-push/', {'invoice_id': invoice.id, 'phone': '0712345678'}, format='json')

    APIClient().post('/billing/mpesa/callback/s3cret/', callback(result_code=1032), format='json')

    assert MpesaPaymentRequest.objects.get().status == MpesaPaymentRequest.Status.CANCELLED
    assert not PaymentReceipt.objects.exists()


@pytest.mark.django_db
@override_settings(**MPESA_ON)
def test_a_bad_number_is_refused_before_safaricom_is_asked(cashier, invoice, safaricom):
    response = cashier.post('/billing/mpesa/stk-push/', {'invoice_id': invoice.id, 'phone': '12345'},
                            format='json')

    assert response.status_code == 400
    assert safaricom == []
