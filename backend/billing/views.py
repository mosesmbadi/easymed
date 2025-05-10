from django.shortcuts import render
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
from rest_framework.views import APIView


from .models import InvoiceItem, Invoice, InvoicePayment
from company.models import Company
from inventory.models import Inventory, Item
from authperms.permissions import (
    IsDoctorUser,
    IsLabTechUser,
    IsNurseUser,
)
from .serializers import (
    InvoiceItemSerializer, InvoiceSerializer,
    PaymentModeSerializer, InvoicePaymentSerializer
    )


class InvoiceViewset(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().order_by('-id')
    serializer_class = InvoiceSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser,)


class InvoicesByPatientId(generics.ListAPIView):
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        patient_id = self.kwargs['patient_id']
        return Invoice.objects.filter(patient_id=patient_id)

class InvoiceItemViewset(viewsets.ModelViewSet):
    queryset = InvoiceItem.objects.all().order_by('-id')
    serializer_class = InvoiceItemSerializer
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser,)

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


class PaymentModeViewset(viewsets.ModelViewSet):
        queryset = PaymentMode.objects.all()
        serializer_class = PaymentModeSerializer


class PaymentBreakdownView(APIView):
    """
    API View to return the total payments breakdown per PaymentMode.
    """

    def get(self, request, *args, **kwargs):
        # Aggregate total amounts per payment mode
        payment_modes = PaymentMode.objects.all()
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
                "payment_mode": payment_mode.paymet_mode,
                "payment_category": payment_mode.payment_category,
                "total_amount": total_amount,
                "total_paid": total_paid,
                "total_pending": total_pending,
            })

        return Response(breakdown, status=status.HTTP_200_OK)

def download_invoice_pdf(request, invoice_id,):
    '''
    This view gets the geneated pdf and downloads it ocally
    pdf accessed here http://127.0.0.1:8080/download_invoice_pdf/26/
    '''
    invoice = get_object_or_404(Invoice, pk=invoice_id)
    invoice_items = InvoiceItem.objects.filter(invoice=invoice)
    company = Company.objects.first()

    # Construct full logo URL for template
    company_logo_url = request.build_absolute_uri(company.logo.url) if company.logo else None


    # Fetch the sale price for each InvoiceItem
    for item in invoice_items:
        incoming_item = IncomingItem.objects.filter(item=item.item).first()
        if incoming_item:
            item.sale_price = incoming_item.sale_price

    html_template = get_template('invoice.html').render({
        'company_logo_url': company_logo_url,
        'invoice': invoice,
        'invoice_items': invoice_items,
        'company': company
    })
    pdf_file = HTML(string=html_template).write_pdf()
    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'filename="invoice_report_{invoice_id}.pdf"'

    return response


