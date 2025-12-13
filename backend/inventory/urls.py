from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .views import (
    ItemViewSet,
    PurchaseOrderViewSet,
    PurchaseOrderItemViewSet,
    InventoryViewSet,
    SupplierViewSet,
    SupplierInvoiceViewSet,
    DepartmentViewSet,
    IncomingItemViewSet,
    RequisitionItemViewSet,
    RequisitionViewSet,
    InsuranceItemSalePriceViewSet,
    IncomingItemViewSet,
    InventoryFilterView,
    GoodsReceiptNoteViewSet,
    QuotationViewSet,
    QuotationItemViewSet,
    AllocateSupplierPaymentView,
    SupplierPaymentReceiptViewSet,

    download_requisition_pdf,
    download_purchaseorder_pdf,
    download_goods_receipt_note_pdf,
    download_supplier_invoice_pdf,
)

router = DefaultRouter()
router.register(r'items', ItemViewSet)
router.register(r'inventories', InventoryViewSet, basename='inventory')
router.register(r'suppliers', SupplierViewSet)
# router.register(r'department-inventory', DepartmentInventoryViewSet, basename='department-inventory')
router.register(r'departments', DepartmentViewSet)
router.register(r'requisition', RequisitionViewSet, basename='requisition')
router.register(r'incoming-item', IncomingItemViewSet, basename='incoming-item-list')
router.register(r'insurance-item-prices', InsuranceItemSalePriceViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchase-orders')
router.register(r'requisitionitems', RequisitionItemViewSet, basename='requisitionitems')
router.register(r'supplier-invoice', SupplierInvoiceViewSet, basename='supplier-invoice')
router.register(r'goods-receipt-note', GoodsReceiptNoteViewSet, basename='goods-receipt-note')
router.register(r'quotation', QuotationViewSet, basename='quotation')
router.register(r'quotationitem', QuotationItemViewSet, basename='quotationitems')
router.register(r'supplier-payment-receipts', SupplierPaymentReceiptViewSet, basename='supplier-payment-receipts')

requisition_url = NestedDefaultRouter(router, 'requisition', lookup='requisition')
requisition_url.register(r'requisitionitems', RequisitionItemViewSet, basename='requisitionitems')
requisition_url.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchase-orders')

purchase_orders_url = NestedDefaultRouter(router, 'purchase-orders', lookup='purchaseorder')
purchase_orders_url.register(r'purchaseorderitems', PurchaseOrderItemViewSet, basename='purchase_order_items')



urlpatterns = [
    path('', include(router.urls)),
    path('', include(requisition_url.urls)),
    path('', include(purchase_orders_url.urls)),

    path('inventory_filter/', InventoryFilterView.as_view(), name='inventory-filter'),
    path('purchase-orders/all_purchase_orders/', PurchaseOrderViewSet.as_view({'get': 'all_purchase_orders'}), name='all_purchase_orders'),
    
    path('allocate-supplier-payment/', AllocateSupplierPaymentView.as_view(), name='allocate-supplier-payment'),
    
    path('purchase_order_pdf/<int:purchaseorder_id>/', download_purchaseorder_pdf, name='download_purchaseorder_pdf'),
    path('receipt_note_pdf/<int:purchase_order_id>/', download_goods_receipt_note_pdf, name='incoming_items_pdf'),
    path('requisition_note_pdf/<int:requisition_id>/', download_requisition_pdf, name='download__requisition_pdf'),
    path('supplier_invoice_pdf/<int:supplier_id>/', download_supplier_invoice_pdf, name='download_supplier_invoice_pdf'),
    
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
