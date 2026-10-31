"""
SMS through Africa's Talking and WhatsApp through the Meta Cloud API. Each
is off until its settings are filled in.

WhatsApp only delivers free text inside a 24-hour window the customer opened;
outside it Meta requires an approved template. Until one is registered, this
sends text, which reaches only customers who messaged the facility recently.
"""
from django.conf import settings

from .http import IntegrationError, request_json
from .mpesa import normalize_phone

WHATSAPP_API = "https://graph.facebook.com/v19.0"


def sms_configured():
    return bool(settings.SMS_ENABLED and settings.AFRICASTALKING_USERNAME
                and settings.AFRICASTALKING_API_KEY)


def whatsapp_configured():
    return bool(settings.WHATSAPP_ENABLED and settings.WHATSAPP_TOKEN
                and settings.WHATSAPP_PHONE_NUMBER_ID)


def send_sms(phone, text):
    """Returns Africa's Talking's message id; raises IntegrationError."""
    number = normalize_phone(phone)
    if number is None:
        raise IntegrationError(f"{phone} is not a Kenyan mobile number.")
    sandbox = settings.AFRICASTALKING_USERNAME == 'sandbox'
    host = 'api.sandbox.africastalking.com' if sandbox else 'api.africastalking.com'
    form = {'username': settings.AFRICASTALKING_USERNAME, 'to': f"+{number}", 'message': text}
    if settings.AFRICASTALKING_SENDER_ID:
        form['from'] = settings.AFRICASTALKING_SENDER_ID
    reply = request_json('POST', f"https://{host}/version1/messaging", form=form,
                         headers={'apiKey': settings.AFRICASTALKING_API_KEY})
    recipients = reply.get('SMSMessageData', {}).get('Recipients', [])
    if not recipients or recipients[0].get('status') != 'Success':
        detail = recipients[0].get('status') if recipients else reply.get('SMSMessageData', {}).get('Message')
        raise IntegrationError(f"Africa's Talking didn't send it: {detail}", body=reply)
    return recipients[0].get('messageId', '')


def send_whatsapp(phone, text):
    """Returns Meta's message id; raises IntegrationError."""
    number = normalize_phone(phone)
    if number is None:
        raise IntegrationError(f"{phone} is not a Kenyan mobile number.")
    reply = request_json(
        'POST', f"{WHATSAPP_API}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages",
        headers={'Authorization': f"Bearer {settings.WHATSAPP_TOKEN}"},
        payload={'messaging_product': 'whatsapp', 'to': number, 'type': 'text',
                 'text': {'body': text}})
    messages = reply.get('messages') or []
    return messages[0].get('id', '') if messages else ''
