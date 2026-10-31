"""
KRA eTIMS through an Online Sales Control Unit (OSCU): each settled invoice is
sent as a sale and comes back signed, with the receipt number and the
signature the printed invoice must carry.

A placeholder until the facility is onboarded with KRA: the payload follows
the OSCU `trnsSales/saveSales` shape, but the item classification and
packaging codes below are KRA's generic ones. Each item needs its own
registered codes before this goes live.
"""
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

from .http import IntegrationError, request_json

# Health services are VAT exempt (tax type A). Medicines vary; a facility
# that sells taxable goods sets the type per item once items carry it.
DEFAULT_TAX_TYPE = 'A'
DEFAULT_ITEM_CLASS = '5059690800'   # KRA's catch-all: "other goods and services"
PAYMENT_TYPE = {'cash': '01', 'insurance': '02', 'mobile_money': '06',
                'bank_transfer': '07', 'direct_to_bank': '07'}
VERIFY_URL = "https://etims.kra.go.ke/common/link/etims/receipt/indexEtimsReceiptData?Data={}"


def kra_pin():
    from company.models import Company

    company = Company.current()
    return settings.ETIMS_PIN or (company.kra_pin if company else '')


def is_configured():
    return bool(settings.ETIMS_ENABLED and settings.ETIMS_BASE_URL
                and settings.ETIMS_CMC_KEY and kra_pin())


def _money(value):
    return float(Decimal(value or 0).quantize(Decimal('0.01')))


def build_sale_payload(invoice):
    """The OSCU sale for one invoice: its billed lines, with the patient as customer."""
    lines = list(invoice.invoice_items.filter(status='billed').select_related('item', 'payment_mode'))
    now = timezone.localtime()
    pin = kra_pin()
    items = []
    for seq, line in enumerate(lines, start=1):
        amount = _money(line.item_amount)
        items.append({
            'itemSeq': seq,
            'itemCd': line.item.item_code or f"ITEM{line.item_id}",
            'itemClsCd': DEFAULT_ITEM_CLASS,
            'itemNm': line.item.name[:200],
            'pkgUnitCd': 'NT',
            'pkg': line.quantity,
            'qtyUnitCd': 'U',
            'qty': line.quantity,
            'prc': _money(line.unit_price),
            'splyAmt': amount,
            'dcRt': 0,
            'dcAmt': 0,
            'taxTyCd': DEFAULT_TAX_TYPE,
            'taxblAmt': amount,
            'taxAmt': 0,
            'totAmt': amount,
        })
    total = sum(item['totAmt'] for item in items)
    category = lines[0].payment_mode.payment_category if lines and lines[0].payment_mode else 'cash'
    patient = invoice.patient
    return {
        'tin': pin,
        'bhfId': settings.ETIMS_BRANCH_ID,
        'invcNo': invoice.id,
        'orgInvcNo': 0,
        'custTin': None,
        'custNm': f"{patient.first_name} {patient.second_name}"[:60] if patient else None,
        'salesTyCd': 'N',
        'rcptTyCd': 'S',
        'pmtTyCd': PAYMENT_TYPE.get(category, '01'),
        'salesSttsCd': '02',
        'cfmDt': now.strftime('%Y%m%d%H%M%S'),
        'salesDt': now.strftime('%Y%m%d'),
        'totItemCnt': len(items),
        'taxblAmtA': total, 'taxblAmtB': 0, 'taxblAmtC': 0, 'taxblAmtD': 0, 'taxblAmtE': 0,
        'taxRtA': 0, 'taxRtB': 16, 'taxRtC': 0, 'taxRtD': 0, 'taxRtE': 8,
        'taxAmtA': 0, 'taxAmtB': 0, 'taxAmtC': 0, 'taxAmtD': 0, 'taxAmtE': 0,
        'totTaxblAmt': total,
        'totTaxAmt': 0,
        'totAmt': total,
        'prchrAcptcYn': 'N',
        'remark': invoice.invoice_number or '',
        'regrId': 'easymed', 'regrNm': 'EaSyMed',
        'modrId': 'easymed', 'modrNm': 'EaSyMed',
        'receipt': {'custTin': None, 'rcptPbctDt': now.strftime('%Y%m%d%H%M%S'),
                    'prchrAcptcYn': 'N'},
        'itemList': items,
    }


def send_sale(payload):
    """Send one sale. Returns KRA's `data` block; raises IntegrationError if refused."""
    reply = request_json(
        'POST', f"{settings.ETIMS_BASE_URL.rstrip('/')}/trnsSales/saveSales",
        payload=payload,
        headers={'tin': payload['tin'], 'bhfId': payload['bhfId'],
                 'cmcKey': settings.ETIMS_CMC_KEY},
    )
    if reply.get('resultCd') != '000':
        raise IntegrationError(
            f"eTIMS refused the sale: {reply.get('resultCd')} {reply.get('resultMsg')}", body=reply)
    return reply.get('data') or {}


def verification_url(receipt_signature):
    return VERIFY_URL.format(f"{kra_pin()}{settings.ETIMS_BRANCH_ID}{receipt_signature}")
