"""
M-Pesa through Safaricom Daraja: STK push (Lipa na M-Pesa Online), which
prompts the customer's phone to pay into the facility's paybill or till.

Off until MPESA_* is configured. Without it the cashier takes M-Pesa the way
they always have -- the customer pays, the cashier types the M-Pesa code in.
"""
import base64
import re
from decimal import Decimal, ROUND_CEILING

from django.conf import settings
from django.utils import timezone

from .http import IntegrationError, request_json

BASE_URLS = {
    'sandbox': 'https://sandbox.safaricom.co.ke',
    'production': 'https://api.safaricom.co.ke',
}


class MpesaNotConfigured(Exception):
    pass


def is_configured():
    return bool(settings.MPESA_ENABLED and settings.MPESA_CONSUMER_KEY
                and settings.MPESA_CONSUMER_SECRET and settings.MPESA_SHORTCODE
                and settings.MPESA_PASSKEY and settings.MPESA_CALLBACK_URL
                and settings.MPESA_CALLBACK_TOKEN)


def normalize_phone(phone):
    """'0712 345 678', '+254712345678' or '712345678' -> '254712345678'; None if not a Kenyan mobile."""
    digits = re.sub(r'\D', '', phone or '')
    if digits.startswith('0') and len(digits) == 10:
        digits = '254' + digits[1:]
    elif len(digits) == 9 and digits[0] in '17':
        digits = '254' + digits
    if re.fullmatch(r'254[17]\d{8}', digits):
        return digits
    return None


def callback_url():
    return f"{settings.MPESA_CALLBACK_URL.rstrip('/')}/billing/mpesa/callback/{settings.MPESA_CALLBACK_TOKEN}/"


def _base_url():
    return BASE_URLS.get(settings.MPESA_ENVIRONMENT, BASE_URLS['sandbox'])


def _access_token():
    reply = request_json(
        'GET', f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials",
        basic_auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET))
    token = reply.get('access_token')
    if not token:
        raise IntegrationError("Daraja gave no access token.", body=reply)
    return token


def stk_push(*, phone, amount, account_reference, description):
    """
    Ask Safaricom to prompt `phone` for `amount`. Returns the
    (MerchantRequestID, CheckoutRequestID) Safaricom will call back with.
    """
    if not is_configured():
        raise MpesaNotConfigured("M-Pesa is not configured on this deployment.")
    timestamp = timezone.localtime().strftime('%Y%m%d%H%M%S')
    password = base64.b64encode(
        f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}".encode()).decode()
    # M-Pesa takes whole shillings; round up so the bill is covered.
    whole = int(Decimal(amount).quantize(Decimal('1'), rounding=ROUND_CEILING))
    reply = request_json(
        'POST', f"{_base_url()}/mpesa/stkpush/v1/processrequest",
        headers={'Authorization': f"Bearer {_access_token()}"},
        payload={
            'BusinessShortCode': settings.MPESA_SHORTCODE,
            'Password': password,
            'Timestamp': timestamp,
            'TransactionType': settings.MPESA_TRANSACTION_TYPE,
            'Amount': whole,
            'PartyA': phone,
            'PartyB': settings.MPESA_SHORTCODE,
            'PhoneNumber': phone,
            'CallBackURL': callback_url(),
            'AccountReference': account_reference[:12],
            'TransactionDesc': description[:13],
        })
    if str(reply.get('ResponseCode')) != '0':
        raise IntegrationError(reply.get('errorMessage') or reply.get('ResponseDescription')
                               or "Safaricom refused the request.", body=reply)
    return reply.get('MerchantRequestID', ''), reply.get('CheckoutRequestID', '')


def parse_callback(body):
    """
    Pull what matters out of an STK callback: the checkout id, whether it was
    paid, Safaricom's description, and on success the amount and receipt.
    """
    callback = (body or {}).get('Body', {}).get('stkCallback', {})
    items = {item.get('Name'): item.get('Value')
             for item in callback.get('CallbackMetadata', {}).get('Item', [])}
    return {
        'checkout_request_id': callback.get('CheckoutRequestID', ''),
        'result_code': int(callback.get('ResultCode', -1)),
        'result_description': callback.get('ResultDesc', ''),
        'amount': items.get('Amount'),
        'receipt_number': items.get('MpesaReceiptNumber', ''),
        'phone': str(items.get('PhoneNumber', '')),
    }
