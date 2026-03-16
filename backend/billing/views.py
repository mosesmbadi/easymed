from django.shortcuts import render, Http404
from rest_framework import viewsets, status
from django.template.loader import get_template

from .models import Invoice, InvoiceItem, PaymentMode, MainAccount, SubAccount
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
from decimal import Decimal
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
    PaymentReceiptSerializer, AllocatePaymentRequestSerializer,
    MainAccountSerializer, SubAccountSerializer
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
        queryset = Invoice.objects.filter(patient_id=patient_id)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.order_by('-invoice_created_at')


class InvoicesByInsuranceId(APIView):
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser,)

    def get(self, request, insurance_id):
        status_filter = request.query_params.get('status')

        invoices = Invoice.objects.filter(
            invoice_items__payment_mode__insurance_id=insurance_id
        ).select_related('patient').prefetch_related(
            'invoice_items__payment_mode'
        ).distinct().order_by('-invoice_created_at')

        result = []
        for inv in invoices:
            insurance_items = inv.invoice_items.filter(payment_mode__insurance_id=insurance_id)

            insurance_total = Decimal('0')
            insurance_paid = Decimal('0')

            for item in insurance_items:
                component_total = item.actual_total or Decimal('0')
                applied = item.allocations.filter(
                    receipt__insurance_id=insurance_id
                ).aggregate(total=Sum('amount_applied'))['total'] or Decimal('0')

                insurance_total += component_total
                insurance_paid += applied

            insurance_balance = insurance_total - insurance_paid
            if insurance_balance < 0:
                insurance_balance = Decimal('0')

            insurance_status = 'paid' if insurance_balance <= 0 else 'pending'
            if status_filter in ('pending', 'paid') and insurance_status != status_filter:
                continue

            result.append({
                'id': inv.id,
                'invoice_number': inv.invoice_number,
                'invoice_date': inv.invoice_date,
                'patient': {
                    'id': inv.patient_id,
                    'first_name': getattr(inv.patient, 'first_name', ''),
                    'second_name': getattr(inv.patient, 'second_name', ''),
                } if inv.patient_id else None,
                # Keep compatibility with existing frontend columns/calculations.
                'invoice_amount': insurance_total,
                'cash_paid': insurance_paid,
                'status': insurance_status,
                # Explicit insurance-specific totals.
                'insurance_total': insurance_total,
                'insurance_paid': insurance_paid,
                'insurance_balance': insurance_balance,
            })

        return Response(result)

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
        invoice.cash_paid = (invoice.cash_paid or Decimal('0')) + (instance.payment_amount or Decimal('0'))

        invoice_total = invoice.invoice_amount or Decimal('0')
        invoice.status = 'paid' if invoice.cash_paid >= invoice_total else 'pending'

        invoice.save(update_fields=['cash_paid', 'status', 'invoice_updated_at'])


class PaymentModeViewset(viewsets.ModelViewSet):
        queryset = PaymentMode.objects.all()
        serializer_class = PaymentModeSerializer


class MainAccountViewSet(viewsets.ModelViewSet):
    queryset = MainAccount.objects.all().order_by('-id')
    serializer_class = MainAccountSerializer


class SubAccountViewSet(viewsets.ModelViewSet):
    queryset = SubAccount.objects.all().order_by('-id')
    serializer_class = SubAccountSerializer


class PaymentReceiptViewset(viewsets.ReadOnlyModelViewSet):
    """
    API ViewSet to list and retrieve payment receipts.
    Read-only as receipts should not be edited or deleted.
    """
    queryset = PaymentReceipt.objects.all().select_related(
        'patient', 'insurance', 'payment_mode'
    ).prefetch_related(
        'allocations__invoice_item__invoice'
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
            is_insurance_payment = bool(insurance_id)

            # Fetch allocatable items across invoices, oldest first.
            # Insurance payments only apply to items billed with that insurance.
            items_qs = InvoiceItem.objects.filter(invoice__in=invoices)
            if is_insurance_payment:
                items_qs = items_qs.filter(payment_mode__insurance_id=insurance_id)

            items = items_qs.select_related('payment_mode', 'invoice', 'item').order_by('item_created_at', 'id')

            per_invoice_applied = {}

            for it in items:
                if remaining <= 0:
                    break

                # Determine payable component for this item based on who is paying.
                if is_insurance_payment:
                    # Insurance pays the insurance-covered component (actual_total).
                    payable_component = float(it.actual_total or 0)
                    already_applied = float(
                        it.allocations.filter(receipt__insurance_id=insurance_id).aggregate(
                            total=Sum('amount_applied')
                        )['total'] or 0
                    )
                else:
                    # Patient cash pays cash component:
                    # - cash item -> actual_total
                    # - insurance item -> co-pay = item_amount - actual_total
                    if it.payment_mode and it.payment_mode.payment_category == 'insurance':
                        payable_component = float((it.item_amount or 0) - (it.actual_total or 0))
                    else:
                        payable_component = float(it.actual_total or 0)

                    already_applied = float(
                        it.allocations.filter(
                            receipt__patient_id=patient_id,
                            receipt__insurance__isnull=True,
                        ).aggregate(total=Sum('amount_applied'))['total'] or 0
                    )

                outstanding = max(0.0, payable_component - already_applied)

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

                # Fallback only for patient cash receipts when no allocatable items exist.
                # For insurance receipts, allocation must remain tied to insurance items.
                if not is_insurance_payment and applied <= 0 and remaining > 0:
                    outstanding_invoice = float(max(Decimal('0'), (inv.invoice_amount or Decimal('0')) - (inv.cash_paid or Decimal('0'))))
                    if outstanding_invoice > 0:
                        invoice_level_apply = min(remaining, outstanding_invoice)
                        if invoice_level_apply > 0:
                            applied = invoice_level_apply
                            remaining -= invoice_level_apply

                if applied > 0:
                    inv.cash_paid = (inv.cash_paid or Decimal('0')) + Decimal(str(applied))

                    invoice_total = inv.invoice_amount or Decimal('0')
                    inv.status = 'paid' if inv.cash_paid >= invoice_total else 'pending'

                    inv.save(update_fields=['cash_paid', 'status', 'invoice_updated_at'])

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

    invoice_numbers = [inv.invoice_number for inv in grouped.keys() if getattr(inv, 'invoice_number', None)]

    html_template = get_template('payment_receipt.html').render({
        'company_logo_url': company_logo_url,
        'company': company,
        'receipt': receipt,
        'allocations_grouped': grouped,
        'invoice_numbers': invoice_numbers,
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
    patient = invoice.patient
    insurance_items = invoice_items.filter(payment_mode__payment_category="insurance")
    insurance_names_str = ", ".join(insurance_items.values_list('payment_mode__payment_mode', flat=True).distinct())

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
    
    insurance_total = sum(item.total_amount for item in invoice_items if item.payment_mode and item.payment_mode.payment_category == 'insurance')
    cash_total = subtotal - insurance_total

    # tax = sum((item.item.vat_rate or 0) * item.total_amount / 100 for item in invoice_items)
    
    cash_paid = invoice.cash_paid or 0
    balance = invoice.invoice_amount - cash_paid

    html_template = get_template('invoice.html').render({
        'company_logo_url': company_logo_url,
        'invoice': invoice,
        'invoice_items': invoice_items,
        'company': company,
        'subtotal': subtotal,
        'insurance_total': insurance_total,
        'cash_total': cash_total,
        'tax': 0.00,
        'patient': patient,
        'insurance_name': insurance_names_str,
        'balance': balance
    })

    pdf_file = HTML(string=html_template).write_pdf()
    response = HttpResponse(pdf_file, content_type='application/pdf')
    # Hint browser to render inline in a new tab
    response['Content-Disposition'] = f'inline; filename="invoice_report_{invoice_id}.pdf"'

    return response
class AccountingSummaryView(APIView):
    """
    API View to summarize accounting data based on:
    - Payments received from patients/insurers
    - Payments made to suppliers
    """
    permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser | IsReceptionistUser,)

    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Payments received allocations
        received_qs = PaymentAllocation.objects.select_related(
            'receipt__patient',
            'receipt__insurance',
            'receipt__payment_mode',
            'invoice_item__invoice',
        ).prefetch_related('receipt__payment_mode__sub_accounts__main_account')

        # Payments made to suppliers allocations
        from inventory.models import SupplierPaymentAllocation
        supplier_paid_qs = SupplierPaymentAllocation.objects.select_related(
            'receipt__supplier',
            'receipt__payment_mode',
            'supplier_invoice',
        ).prefetch_related('receipt__payment_mode__sub_accounts__main_account')

        if start_date:
            received_qs = received_qs.filter(
                Q(receipt__payment_date__gte=start_date) |
                Q(receipt__payment_date__isnull=True, receipt__created_at__date__gte=start_date)
            )
            supplier_paid_qs = supplier_paid_qs.filter(
                Q(receipt__payment_date__gte=start_date) |
                Q(receipt__payment_date__isnull=True, receipt__created_at__date__gte=start_date)
            )
        if end_date:
            received_qs = received_qs.filter(
                Q(receipt__payment_date__lte=end_date) |
                Q(receipt__payment_date__isnull=True, receipt__created_at__date__lte=end_date)
            )
            supplier_paid_qs = supplier_paid_qs.filter(
                Q(receipt__payment_date__lte=end_date) |
                Q(receipt__payment_date__isnull=True, receipt__created_at__date__lte=end_date)
            )
            
        # 1. Drill-down view: Individual transactions
        transactions = []
        for alloc in received_qs:
            # Prefer configured main account tag from payment mode, fallback to mode name.
            source_name = 'Main Account'
            pay_mode = getattr(alloc.receipt, 'payment_mode', None)
            sub_acct = pay_mode.sub_accounts.first() if pay_mode else None
            if sub_acct and sub_acct.main_account:
                source_name = sub_acct.main_account.name
            elif pay_mode and pay_mode.payment_mode:
                source_name = pay_mode.payment_mode

            customer_name = "Unknown"
            if alloc.receipt and alloc.receipt.patient:
                customer_name = f"{alloc.receipt.patient.first_name} {alloc.receipt.patient.second_name}"
            elif alloc.receipt and alloc.receipt.insurance:
                customer_name = alloc.receipt.insurance.name

            tx_date = alloc.receipt.payment_date or alloc.receipt.created_at.date()
            invoice_number = alloc.invoice_item.invoice.invoice_number if alloc.invoice_item and alloc.invoice_item.invoice else "N/A"
                
            transactions.append({
                'id': alloc.id,
                'date': tx_date,
                'invoice_number': invoice_number,
                'customer': customer_name,
                'tag': source_name,
                'sub_account': pay_mode.payment_mode if pay_mode else source_name,
                'action': 'Received',
                'amount': alloc.amount_applied,
            })

        for alloc in supplier_paid_qs:
            # Prefer configured main account tag from payment mode, fallback to mode name.
            source_name = 'Main Account'
            pay_mode = getattr(alloc.receipt, 'payment_mode', None)
            sub_acct = pay_mode.sub_accounts.first() if pay_mode else None
            if sub_acct and sub_acct.main_account:
                source_name = sub_acct.main_account.name
            elif pay_mode and pay_mode.payment_mode:
                source_name = pay_mode.payment_mode

            supplier_name = "Unknown Supplier"
            if alloc.receipt and alloc.receipt.supplier:
                supplier_name = alloc.receipt.supplier.official_name or alloc.receipt.supplier.common_name

            tx_date = alloc.receipt.payment_date or alloc.receipt.created_at.date()
            invoice_number = alloc.supplier_invoice.invoice_no if alloc.supplier_invoice else "N/A"

            transactions.append({
                'id': f"sp-{alloc.id}",
                'date': tx_date,
                'invoice_number': invoice_number,
                'customer': supplier_name,
                'tag': source_name,
                'sub_account': pay_mode.payment_mode if pay_mode else source_name,
                'action': 'Paid to Supplier',
                'amount': alloc.amount_applied,
            })

        # Latest first for readability
        transactions = sorted(transactions, key=lambda x: x['date'], reverse=True)
            
        # 2a. Sub-Account Aggregation: per (main_account, sub_account)
        sub_account_totals_dict = {}
        for trans in transactions:
            key = (trans['tag'], trans.get('sub_account', trans['tag']))
            if key not in sub_account_totals_dict:
                sub_account_totals_dict[key] = {
                    'main_account': trans['tag'],
                    'sub_account': trans.get('sub_account', trans['tag']),
                    'total_debited': 0,
                    'total_credited': 0,
                    'net_balance': 0,
                }
            amount = float(trans['amount'])
            if trans['action'] == 'Received':
                sub_account_totals_dict[key]['total_debited'] += amount
                sub_account_totals_dict[key]['net_balance'] += amount
            else:
                sub_account_totals_dict[key]['total_credited'] += amount
                sub_account_totals_dict[key]['net_balance'] -= amount

        sub_account_totals = sorted(
            sub_account_totals_dict.values(),
            key=lambda x: (x['main_account'], x['sub_account'])
        )

        # 2b. Bird's Eye View: Departmental Aggregation
        totals_dict = {}
        for trans in transactions:
            tag = trans['tag']
            if tag not in totals_dict:
                totals_dict[tag] = {
                    'tag': tag,
                    'total_debited': 0,
                    'total_credited': 0,
                    'net_balance': 0
                }
            
            amount = float(trans['amount'])
            if trans['action'] == 'Received':
                totals_dict[tag]['total_debited'] += amount
                totals_dict[tag]['net_balance'] += amount
            else:
                totals_dict[tag]['total_credited'] += amount
                totals_dict[tag]['net_balance'] -= amount
            
        # Convert dictionary to list
        totals = list(totals_dict.values())
        
        # Calculate Grand Totals
        grand_total = sum(t['net_balance'] for t in totals)
        if totals:
            totals.append({
                'tag': 'TOTAL',
                'total_debited': sum(t['total_debited'] for t in totals),
                'total_credited': sum(t['total_credited'] for t in totals),
                'net_balance': grand_total,
                'is_summary': True
            })

        return Response({
            'totals': totals,
            'sub_account_totals': list(sub_account_totals),
            'transactions': transactions
        })
