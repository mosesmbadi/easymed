from django.shortcuts import render, Http404
from rest_framework import viewsets, status
from django.template.loader import get_template

from .models import Invoice, InvoiceItem, PaymentMode
from inventory.models import IncomingItem
from rest_framework import generics
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.template.loader import get_template
from django.conf import settings
from weasyprint import HTML
from rest_framework import serializers
from rest_framework.response import Response
from django.db.models import Sum, Q
from django.db import transaction
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from billing.filters import InvoiceFilterSearch, InvoiceFilter
from .models import InvoiceItem, Invoice, InvoicePayment, PaymentReceipt, PaymentAllocation
from company.models import Company
from inventory.models import InsuranceItemSalePrice
from authperms.permissions import (
    IsDoctorUser,
    IsLabTechUser,
    IsNurseUser,
    IsReceptionistUser,
)
from .serializers import (
    InvoiceItemSerializer, InvoiceSerializer,
    PaymentModeSerializer, InvoicePaymentSerializer,
    PaymentReceiptSerializer, AllocatePaymentRequestSerializer
    )


class InvoiceItemsByInsuranceCompany(generics.ListAPIView):
    """
    API View to return all invoice items for a specific insurance company.
    Expected URL format: /billing/invoice-items/insurance-company/?insurance_company_id=5
    """
    serializer_class = InvoiceItemSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser,)

    def get_queryset(self):
        insurance_company_id = self.request.query_params.get('insurance_company_id')
        if not insurance_company_id:
            raise Http404("insurance_company_id parameter is required")
            
        return InvoiceItem.objects.filter(
            payment_mode__insurance_id=insurance_company_id
        ).order_by('-item_created_at')


class InvoiceViewset(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().order_by('-id')
    serializer_class = InvoiceSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser,)
    filter_backends = [InvoiceFilterSearch, DjangoFilterBackend]
    filterset_class = InvoiceFilter
    search_fields = [
        'patient__first_name', 'patient__second_name', 'invoice_number'
    ]


class InvoicesByPatientId(generics.ListAPIView):
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        patient_id = self.kwargs['patient_id']
        return Invoice.objects.filter(patient_id=patient_id).order_by('-invoice_created_at')

class InvoiceItemViewset(viewsets.ModelViewSet):
    queryset = InvoiceItem.objects.all().order_by('-id')
    serializer_class = InvoiceItemSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser,)

    def partial_update(self, request, *args, **kwargs):
        try:
            # Get the specific invoice item instance
            instance = self.get_object()

            # Use the serializer with the `partial=True` flag for partial updates
            serializer = self.get_serializer(instance, data=request.data, partial=True)

            if serializer.is_valid():
                # Save the partial update
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)

            # If the data is invalid, return a 422 error
            return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        except serializers.ValidationError as e:
            error_message = str(e.detail['detail']).strip("[] '\"")
            return Response({'error': error_message}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

class InvoiceItemsByInvoiceId(generics.ListAPIView):
    serializer_class = InvoiceItemSerializer

    def get_queryset(self):
        invoice_id = self.kwargs['invoice_id']
        return InvoiceItem.objects.filter(invoice_id=invoice_id)


class InvoicePaymentViewset(viewsets.ModelViewSet):
    queryset = InvoicePayment.objects.all()
    serializer_class = InvoicePaymentSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        # Update invoice cash_paid and potentially status
        invoice = instance.invoice
        # Cash portion paid increments cash_paid
        invoice.cash_paid = (invoice.cash_paid or 0) + (instance.payment_amount or 0)
        invoice.save(update_fields=['cash_paid', 'invoice_updated_at'])


class PaymentModeViewset(viewsets.ModelViewSet):
        queryset = PaymentMode.objects.all()
        serializer_class = PaymentModeSerializer


class PaymentReceiptViewset(viewsets.ReadOnlyModelViewSet):
    """
    API ViewSet to list and retrieve payment receipts.
    Read-only as receipts should not be edited or deleted.
    """
    queryset = PaymentReceipt.objects.all().select_related(
        'patient', 'insurance', 'payment_mode'
    ).order_by('-created_at')
    serializer_class = PaymentReceiptSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['patient', 'insurance', 'payment_mode', 'payment_date']


class PaymentBreakdownView(APIView):
    """
    API View to return the total payments breakdown per PaymentMode.
    """

    def get(self, request, *args, **kwargs):
        # Aggregate total amounts per payment mode
        payment_modes = PaymentMode.objects.prefetch_related('invoiceitem_set__invoice').all()
        breakdown = []

        for payment_mode in payment_modes:
            # Get all invoice items associated with the current payment mode
            invoice_items = InvoiceItem.objects.filter(payment_mode=payment_mode)

            # Calculate total amounts based on invoice status
            total_paid = invoice_items.filter(invoice__status='paid').aggregate(
                total=Sum('item_amount')
            )['total'] or 0

            total_pending = invoice_items.filter(invoice__status='pending').aggregate(
                total=Sum('item_amount')
            )['total'] or 0

            total_amount = total_paid + total_pending

            # Build response for the current payment mode
            breakdown.append({
                "payment_mode": payment_mode.payment_mode,
                "payment_category": payment_mode.payment_category,
                "total_amount": total_amount,
                "total_paid": total_paid,
                "total_pending": total_pending,
            })

        return Response(breakdown, status=status.HTTP_200_OK)


class AllocatePaymentView(APIView):
    """
    Allocate a single payment amount across the oldest invoice items in the selected invoices.
    Rules:
    - Only applies to the patient's invoices provided.
    - Allocation order: by InvoiceItem.item_created_at ascending.
    - For each InvoiceItem, the outstanding "cash component" is:
      cash item -> actual_total
      insurance item -> (item_amount - actual_total) [co-pay]
      minus any previous allocations to that item.
    - Creates a PaymentReceipt and PaymentAllocation entries.
    - Updates Invoice.cash_paid totals accordingly.
    """

    def post(self, request, *args, **kwargs):
        req_ser = AllocatePaymentRequestSerializer(data=request.data)
        req_ser.is_valid(raise_exception=True)
        data = req_ser.validated_data

        patient_id = data.get('patient_id')
        insurance_id = data.get('insurance_id')
        invoice_ids = data['invoice_ids']
        payment_mode_id = data['payment_mode']
        amount = data['amount']
        reference_number = data['reference_number']
        payment_date = data.get('payment_date')  # Optional field

        # Filter invoices based on whether it's patient or insurance payment
        if patient_id:
            invoices = Invoice.objects.filter(id__in=invoice_ids, patient_id=patient_id)
        elif insurance_id:
            # For insurance payments, we need to filter invoices that have items with this insurance
            # This ensures the invoice belongs to the selected insurance company
            invoices = Invoice.objects.filter(
                id__in=invoice_ids,
                invoice_items__payment_mode__insurance_id=insurance_id
            ).distinct()
        else:
            return Response({"detail": "Either patient_id or insurance_id must be provided."}, status=status.HTTP_400_BAD_REQUEST)

        if not invoices.exists():
            return Response({"detail": "No invoices found for the selected customer/invoice selection."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            paymode = PaymentMode.objects.get(id=payment_mode_id)
        except PaymentMode.DoesNotExist:
            return Response({"detail": "Invalid payment mode."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            receipt = PaymentReceipt.objects.create(
                patient_id=patient_id,
                insurance_id=insurance_id,
                payment_mode=paymode,
                total_amount=amount,
                reference_number=reference_number,
                payment_date=payment_date,
            )

            remaining = float(amount)
            # Fetch all items across invoices, oldest first
            items = InvoiceItem.objects.filter(invoice__in=invoices).select_related('payment_mode', 'invoice', 'item').order_by('item_created_at', 'id')

            per_invoice_applied = {}

            for it in items:
                if remaining <= 0:
                    break

                # Determine cash component for this item
                if it.payment_mode and it.payment_mode.payment_category == 'insurance':
                    # co-pay = item_amount - actual_total
                    cash_component = float((it.item_amount or 0) - (it.actual_total or 0))
                else:
                    cash_component = float(it.actual_total or 0)

                # Previous allocations to this item
                already_applied = float(it.allocations.aggregate(total=Sum('amount_applied'))['total'] or 0)
                outstanding = max(0.0, cash_component - already_applied)

                if outstanding <= 0:
                    continue

                apply_now = min(remaining, outstanding)
                if apply_now > 0:
                    PaymentAllocation.objects.create(
                        receipt=receipt,
                        invoice_item=it,
                        amount_applied=apply_now,
                    )
                    remaining -= apply_now
                    per_invoice_applied[it.invoice_id] = per_invoice_applied.get(it.invoice_id, 0.0) + apply_now

            # Update invoices cash_paid
            for inv in invoices:
                applied = per_invoice_applied.get(inv.id, 0.0)
                if applied > 0:
                    inv.cash_paid = (inv.cash_paid or 0) + applied
                    inv.save(update_fields=['cash_paid', 'invoice_updated_at'])

            ser = PaymentReceiptSerializer(receipt)
            return Response(ser.data, status=status.HTTP_201_CREATED)


def download_payment_receipt_pdf(request, receipt_id):
    receipt = get_object_or_404(PaymentReceipt, pk=receipt_id)
    company = Company.objects.first()

    company_logo_url = request.build_absolute_uri(company.logo.url) if company and company.logo else None

    allocations = receipt.allocations.select_related('invoice_item__invoice', 'invoice_item__item').all()
    # Group by invoice for display
    grouped = {}
    for alloc in allocations:
        inv = alloc.invoice_item.invoice
        grouped.setdefault(inv, []).append(alloc)

    html_template = get_template('payment_receipt.html').render({
        'company_logo_url': company_logo_url,
        'company': company,
        'receipt': receipt,
        'allocations_grouped': grouped,
    })

    pdf_file = HTML(string=html_template).write_pdf()
    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'filename="payment_receipt_{receipt.id}.pdf"'
    return response

def download_invoice_pdf(request, invoice_id):
    '''
    This view gets the generated pdf and downloads it locally
    pdf accessed here http://127.0.0.1:8080/billing/download_invoice_pdf/26/
    '''
    invoice = get_object_or_404(Invoice, pk=invoice_id)
    invoice_items = InvoiceItem.objects.filter(invoice=invoice)
    company = Company.objects.first()

    company_logo_url = request.build_absolute_uri(company.logo.url) if (company and getattr(company, 'logo', None)) else None

    for item in invoice_items:
        regular_sale_price = item.sale_price  
        if not regular_sale_price:
            regular_sale_price = item.item_amount or 0  
        if item.payment_mode and item.payment_mode.payment_category == 'insurance' and item.payment_mode.insurance:
            insurance_price = InsuranceItemSalePrice.objects.filter(
                item=item.item,
                insurance_company=item.payment_mode.insurance
            ).first()
            if insurance_price:
                item.insurance_sale_price = insurance_price.sale_price
                item.co_pay = insurance_price.co_pay
                item.total_amount = insurance_price.sale_price + insurance_price.co_pay
            else:
                item.insurance_sale_price = None
                item.co_pay = None
                item.total_amount = item.actual_total or item.item_amount or regular_sale_price
        else:
            item.insurance_sale_price = None
            item.co_pay = None
            item.total_amount = item.actual_total or item.item_amount or regular_sale_price

    subtotal = sum(item.total_amount for item in invoice_items)
    # tax = sum((item.item.vat_rate or 0) * item.total_amount / 100 for item in invoice_items)

    html_template = get_template('invoice.html').render({
        'company_logo_url': company_logo_url,
        'invoice': invoice,
        'invoice_items': invoice_items,
        'company': company,
        'subtotal': subtotal,
        'tax': 0.00
    })

    pdf_file = HTML(string=html_template).write_pdf()
    response = HttpResponse(pdf_file, content_type='application/pdf')
    # Hint browser to render inline in a new tab
    response['Content-Disposition'] = f'inline; filename="invoice_report_{invoice_id}.pdf"'

    return response