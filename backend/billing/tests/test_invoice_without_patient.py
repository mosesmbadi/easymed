"""
Invoice.patient is nullable, so an invoice with no patient has to display
without crashing.
"""

from billing.models import Invoice
from billing.serializers import InvoiceSerializer


def test_str_without_patient():
    invoice = Invoice(invoice_number='INV-00001-2026', invoice_amount=100)

    assert str(invoice).endswith('No patient')


def test_serializer_patient_name_without_patient():
    invoice = Invoice(invoice_number='INV-00001-2026', invoice_amount=100)

    assert InvoiceSerializer().get_patient_name(invoice) is None
