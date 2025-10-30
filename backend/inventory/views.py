import os
from rest_framework import viewsets, status
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response # type: ignore
from rest_framework.exceptions import ValidationError
from weasyprint import HTML
from django.shortcuts import render, get_object_or_404
from django.template.loader import get_template
from django.http import HttpResponse
from django.conf import settings
from rest_framework.generics import ListAPIView
from django.utils import timezone
from django.db.models.functions import Now
from django.db.models import F, Sum
from datetime import timedelta


from company.models import Company
from customuser.models import CustomUser
from .models import (
    Item,
    Inventory,
    Supplier,
    SupplierInvoice,
    IncomingItem,
    Department,
    RequisitionItem,
    Requisition,
    PurchaseOrder,
    PurchaseOrderItem,
    InsuranceItemSalePrice,
    GoodsReceiptNote,
    Quotation,
    QuotationItem,
    SupplierInvoice,
    InventoryArchive

)

from .serializers import (
    ItemSerializer,
    InventorySerializer,
    SupplierSerializer,
    SupplierInvoiceSerializer,
    DepartmentSerializer,
    RequisitionSerializer,
    RequisitionItemSerializer,
    PurchaseOrderSerializer,
    PurchaseOrderItemSerializer,
    IncomingItemSerializer,
    InsuranceItemSalePriceSerializer,
    GoodsReceiptNoteSerializer,
    QuotationSerializer,
    QuotationItemSerializer,
    InventoryArchiveSerializer
)

from .filters import (
    InventoryFilter,
    InventoryFilterSearch,
    ItemFilter,
    SupplierFilter,
    RequisitionItemFilter
)

class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    filter_backends = (DjangoFilterBackend,)
    filterset_class = ItemFilter


class IncomingItemViewSet(viewsets.ModelViewSet):
    queryset = IncomingItem.objects.all()
    serializer_class = IncomingItemSerializer
    filterset_fields = ['supplier_invoice', 'purchase_order', 'supplier']
    filter_backends = [InventoryFilterSearch, DjangoFilterBackend]
    search_fields = [
        'lot_no', 'item__name', 'item__item_code', 'supplier__official_name'
    ]

    def perform_create(self, serializer):
        """
        When creating an IncomingItem, ensure it's linked to the correct supplier_invoice
        and the supplier matches the one on the invoice
        """
        supplier_invoice = serializer.validated_data.get('supplier_invoice')
        supplier = serializer.validated_data.get('supplier')
        
        if supplier_invoice and supplier != supplier_invoice.supplier:
            raise ValidationError(
                "Supplier must match the supplier on the invoice"
            )
        
        serializer.save()

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer


class RequisitionViewSet(viewsets.ModelViewSet):
    queryset = Requisition.objects.all().order_by('-id')
    serializer_class = RequisitionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['requested_by', 'department']
    filter_backends = [InventoryFilterSearch, DjangoFilterBackend]
    search_fields = [
        'requisition_number', 'requested_by__first_name', 'requested_by__last_name', 'department__name',
        'approved_by__first_name', 'approved_by__last_name'
    ]

    
class RequisitionItemViewSet(viewsets.ModelViewSet):
    queryset = RequisitionItem.objects.all()
    serializer_class = RequisitionItemSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = RequisitionItemFilter


    
    def get_queryset(self):
        requisition_id = self.kwargs.get('requisition_pk')
        return  RequisitionItem.objects.filter(requisition=requisition_id)

    def get_serializer_context(self):
        requisition_id = self.kwargs.get('requisition_pk')
        return {'requisition_id': requisition_id}


class InventoryViewSet(viewsets.ModelViewSet):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    filter_backends = (DjangoFilterBackend,)
    filterset_fields = ['item',]
    filterset_class = InventoryFilter
    filter_backends = [InventoryFilterSearch, DjangoFilterBackend]
    search_fields = [
        'lot_number', 'item__name', 'item__item_code', 'department__name'
    ]

    @action(detail=False, methods=['get'], url_path='slow-moving-items')
    def slow_moving_items(self, request):
        inventory_items = Inventory.objects.filter(
            quantity_at_hand__gt=0,
            item__slow_moving_period__isnull=False,
            last_deducted_at__isnull=False,
        ).annotate(
            days_without_transactions=(Now() - F('last_deducted_at'))
        ).filter(
            days_without_transactions__gte=F('item__slow_moving_period') * timedelta(days=1)
        ).select_related('item', 'department')

        slow_moving_items = [{
            'item_id': inv.item.id,
            'item_name': inv.item.name,
            'category': inv.item.category,
            'department': inv.department.name,
            'quantity': inv.quantity_at_hand,
            'days_without_transactions': inv.days_without_transactions.days,
            'slow_moving_period': inv.item.slow_moving_period,
            'lot_number': inv.lot_number,
            'expiry_date': inv.expiry_date,
            'purchase_price': inv.purchase_price,
            'sale_price': inv.sale_price
        } for inv in inventory_items]

        return Response(slow_moving_items)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = (DjangoFilterBackend,)
    filterset_class = SupplierFilter


class SupplierInvoiceViewSet(viewsets.ModelViewSet):
    queryset = SupplierInvoice.objects.all()
    serializer_class = SupplierInvoiceSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['supplier', 'purchase_order', 'status']

    def get_queryset(self):
        queryset = SupplierInvoice.objects.all().select_related(
            'supplier',
            'purchase_order',
            'purchase_order__requisition'
        ).prefetch_related(
            'incomingitem_set__goods_receipt_note'
        )
        return queryset


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']
    filter_backends = [InventoryFilterSearch, DjangoFilterBackend]
    search_fields = [
        'PO_number', 'ordered_by__first_name', 'ordered_by__last_name',
        'approved_by__first_name', 'approved_by__last_name'
    ]

    def get_queryset(self):
        requisition_id = self.kwargs.get('requisition_pk')
        if requisition_id:
            return PurchaseOrder.objects.filter(requisition_id=requisition_id)
        return PurchaseOrder.objects.all()

    def get_serializer_context(self):
        requisition_id = self.kwargs.get('requisition_pk')
        return {
            'request': self.request,
            'requisition_id': requisition_id,
            'requested_by': self.request.user 
        }
    

    
    def create(self, request, *args, **kwargs):
        context = self.get_serializer_context()
        serializer = PurchaseOrderSerializer(data=request.data, context=context)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save(created_by=self.request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)},status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def all_purchase_orders(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = PurchaseOrderSerializer(queryset, many=True)
        return Response(serializer.data)
   
class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderItemSerializer
    allowed_http_methods = ['get', 'put']
    lookup_field = 'id' 

    def get_queryset(self):
        purchase_order_id = self.kwargs.get('purchaseorder_pk')
        return PurchaseOrderItem.objects.filter(purchase_order=purchase_order_id)

    
class InsuranceItemSalePriceViewSet(viewsets.ModelViewSet):
    queryset = InsuranceItemSalePrice.objects.all()
    serializer_class = InsuranceItemSalePriceSerializer


class InventoryFilterView(ListAPIView):
    '''
    To get Low Quantity Drugs, use: GET /inventory_filter/?category=Drug&filter_type=low_quantity
    To get near expiry drugs, use: GET /inventory_filter/?category=Drug&filter_type=near_expiry
    To get near-expiry Lab Reagents, use: GET /inventory_filter/?category=LabReagent&filter_type=near_expiry

    ...get it?
    '''
    serializer_class = InventorySerializer

    def get_queryset(self):
        category = self.request.query_params.get('category', None)
        filter_type = self.request.query_params.get('filter_type', None)

        if not category or not filter_type:
            raise ValidationError({"error": "Both 'category' and 'filter_type' parameters are required."})

        queryset = Inventory.objects.filter(item__category=category)

        # we can add more filter types
        if filter_type == 'low_quantity':
            queryset = queryset.filter(quantity_at_hand__lte=F('re_order_level'))
        elif filter_type == 'near_expiry':
            today = timezone.now().date()
            three_months_later = today + timedelta(days=90)  # 3 months from now
            five_months_later = today + timedelta(days=150)  # 5 months from now
            queryset = queryset.filter(expiry_date__range=[three_months_later, five_months_later])
        elif not queryset.exists():
            return Response([], status=status.HTTP_200_OK)
        else:
            raise ValidationError({"error": f"Invalid filter_type: {filter_type}. Must be 'low_quantity' or 'near_expiry'."})

        return queryset

class InventoryArchiveViewSet(viewsets.ModelViewSet):
    queryset = InventoryArchive.objects.all()
    serializer_class = InventoryArchiveSerializer
    
class GoodsReceiptNoteViewSet(viewsets.ModelViewSet):
    queryset = GoodsReceiptNote.objects.all()
    serializer_class = GoodsReceiptNoteSerializer

class QuotationViewSet(viewsets.ModelViewSet):
    queryset = Quotation.objects.all()
    serializer_class = QuotationSerializer


class QuotationItemViewSet(viewsets.ModelViewSet):
    queryset = QuotationItem.objects.all()
    serializer_class = QuotationItemSerializer

def download_requisition_pdf(request, requisition_id):
    '''
    This view gets the geneated pdf and downloads it locally
    pdf accessed here http://127.0.0.1:8080/download_requisition_pdf/26/
    '''
    company = Company.objects.first()
    company_logo_url = request.build_absolute_uri(company.logo.url) if company.logo else None
    requisition = get_object_or_404(Requisition, pk=requisition_id)
    requisition_items = RequisitionItem.objects.filter(requisition=requisition)

    # Calculate the total cost of the requisition
    total_cost = 0
    for item in requisition_items:
        # Ensure both unit_cost and quantity_approved are valid before multiplying
        unit_cost = item.unit_cost if item.unit_cost is not None else 0
        quantity_approved = item.quantity_approved if item.quantity_approved is not None else 0
        total_cost += unit_cost * quantity_approved
    print(f'Total cost: {total_cost}')    
    

    context = {
        'requisition': requisition,
        'requisition_items': requisition_items,
        'company': company,
        'company_logo_url': company_logo_url,
        'total_cost': total_cost,

    }

    html_template = get_template('requisition.html').render(context)
    
    pdf_file = HTML(string=html_template).write_pdf()
    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'filename="purchase_order_report_{requisition_id}.pdf"'

    return response


def download_purchaseorder_pdf(request, purchaseorder_id):
    '''
    Picture this, you have 1 crate of 30 eggs
    Quantity ordered is 60 eggs.
    But on the LPO pdf we want to see 2 crates. Get it?
    '''
    purchase_order = get_object_or_404(PurchaseOrder, pk=purchaseorder_id)
    purchase_order_items = PurchaseOrderItem.objects.filter(purchase_order=purchase_order)
    company = Company.objects.first()
    user = CustomUser.objects.first()

    company_logo_url = request.build_absolute_uri(company.logo.url) if company.logo else None

    context = {
        'purchaseorder': purchase_order,
        'purchaseorder_items': purchase_order_items,
        'company': company,
        'company_logo_url': company_logo_url,
        'user': user
    }

    html_template = get_template('purchase_order_note.html').render(context)
    
    pdf_file = HTML(string=html_template).write_pdf()

    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'filename="purchase_order_report_{purchaseorder_id}.pdf"'

    return response


def download_goods_receipt_note_pdf(request, purchase_order_id):
    incoming_items = IncomingItem.objects.filter(purchase_order_id=purchase_order_id)
    company = Company.objects.first()
    
    # Extract the Goods Receipt Note and its number (assuming all items share the same GRN)
    goods_receipt_note = incoming_items.first().goods_receipt_note if incoming_items.exists() else None
    grn_number = goods_receipt_note.grn_number if goods_receipt_note else "N/A"
    # Prepare data for the template
    item_details = []
    total_price_before_vat = 0
    total_vat = 0
    total_amount_after_vat = 0

    for item in incoming_items:
        amount_before_vat = item.purchase_price * item.quantity
        vat_amount = amount_before_vat * (item.item.vat_rate / 100)
        amount_with_vat = amount_before_vat + vat_amount
        
        total_price_before_vat += amount_before_vat
        total_vat += vat_amount
        total_amount_after_vat += amount_with_vat
        item_details.append({
            'supplier': item.supplier,
            'item_code': item.item.item_code,  # Fixed: Access item_code through the item relationship
            'lot_number': item.lot_no,
            'item_name': item.item.name,
            'quantity_received': item.quantity,
            'unit_price': item.purchase_price,
            'amount_before_vat': amount_before_vat,
            'vat_amount': vat_amount,
            'amount_with_vat': amount_with_vat
        })

    # Construct full logo URL for template
    company_logo_url = request.build_absolute_uri(company.logo.url) if company.logo else None

    context = {
        'incoming_items': incoming_items,
        'company': company,
        'company_logo_url': company_logo_url,
        'grn_number': grn_number,
        'item_details': item_details,
        'total_price_before_vat': total_price_before_vat,
        'total_vat': total_vat,
        'total_amount_after_vat': total_amount_after_vat
        
    }

    html_template = get_template('goods_receipt_note.html').render(context)
    pdf_file = HTML(string=html_template).write_pdf()
    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="incoming_items.pdf"'
    return response


def download_supplier_invoice_pdf(request, supplier_id):
    supplier = get_object_or_404(Supplier, pk=supplier_id)
    supplier_invoices = SupplierInvoice.objects.filter(supplier=supplier).prefetch_related('incomingitem_set')
    incoming_items = IncomingItem.objects.filter(supplier_invoice__supplier=supplier)
    company = Company.objects.first()

    company_logo_url = request.build_absolute_uri(company.logo.url) if company.logo else None

    context = {
        'supplier': supplier,
        'supplier_invoices': supplier_invoices,
        'company': company,
        'company_logo_url': company_logo_url,
        'incoming_items': incoming_items,
    }

    html_template = get_template('supplier_invoice.html').render(context)

    pdf_file = HTML(string=html_template).write_pdf()

    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'filename="supplier_invoice_report_{supplier_id}.pdf"'

    return response


class AllocateSupplierPaymentView(APIView):
    """
    Allocate a payment to supplier invoices, creating a SupplierPaymentReceipt and allocations.
    """
    def post(self, request, *args, **kwargs):
        from .serializers import AllocateSupplierPaymentRequestSerializer, SupplierPaymentReceiptSerializer
        from .models import SupplierPaymentReceipt, SupplierPaymentAllocation, SupplierInvoice
        from billing.models import PaymentMode
        from django.db import transaction

        req_ser = AllocateSupplierPaymentRequestSerializer(data=request.data)
        req_ser.is_valid(raise_exception=True)
        data = req_ser.validated_data

        supplier_id = data['supplier_id']
        invoice_ids = data['invoice_ids']
        payment_mode_id = data['payment_mode']
        amount = data['amount']
        reference_number = data['reference_number']
        payment_date = data.get('payment_date')

        # Get supplier invoices
        invoices = SupplierInvoice.objects.filter(id__in=invoice_ids, supplier_id=supplier_id)
        if not invoices.exists():
            return Response({"detail": "No invoices found for the selected supplier."}, status=status.HTTP_400_BAD_REQUEST)

        # Get payment mode
        try:
            paymode = PaymentMode.objects.get(id=payment_mode_id)
        except PaymentMode.DoesNotExist:
            return Response({"detail": "Invalid payment mode."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Create payment receipt
            receipt = SupplierPaymentReceipt.objects.create(
                supplier_id=supplier_id,
                payment_mode=paymode,
                total_amount=amount,
                reference_number=reference_number,
                payment_date=payment_date,
            )

            remaining = float(amount)

            # Allocate to invoices (oldest first)
            for invoice in invoices.order_by('date_created'):
                if remaining <= 0:
                    break

                # Get outstanding amount
                already_paid = float(invoice.payment_allocations.aggregate(total=Sum('amount_applied'))['total'] or 0)
                outstanding = float(invoice.amount) - already_paid

                if outstanding <= 0:
                    continue

                apply_now = min(remaining, outstanding)
                if apply_now > 0:
                    SupplierPaymentAllocation.objects.create(
                        receipt=receipt,
                        supplier_invoice=invoice,
                        amount_applied=apply_now,
                    )
                    remaining -= apply_now

                    # Update invoice status if fully paid
                    if outstanding - apply_now <= 0.01:  # Account for floating point precision
                        invoice.status = 'paid'
                        invoice.save(update_fields=['status'])

            ser = SupplierPaymentReceiptSerializer(receipt)
            return Response(ser.data, status=status.HTTP_201_CREATED)


class SupplierPaymentReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing and retrieving supplier payment receipts.
    """
    from .serializers import SupplierPaymentReceiptSerializer
    from .models import SupplierPaymentReceipt
    
    queryset = SupplierPaymentReceipt.objects.all().select_related(
        'supplier', 'payment_mode'
    ).order_by('-created_at')
    serializer_class = SupplierPaymentReceiptSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['supplier', 'payment_mode', 'payment_date']
