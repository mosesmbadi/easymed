from django.contrib import admin
from .models import (
    PurchaseOrder, Inventory, Supplier, SupplierInvoice, Item,
    Requisition, IncomingItem,
    Department, InsuranceItemSalePrice,
    GoodsReceiptNote, PurchaseOrderItem, Quotation, QuotationItem,
    QuotationCustomer, RequisitionItem
)

admin.site.register(PurchaseOrder)
admin.site.register(PurchaseOrderItem)
admin.site.register(Inventory)
admin.site.register(Supplier)
admin.site.register(SupplierInvoice)


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'item_code', 'category']
    search_fields = ['name', 'item_code', 'category']
    list_filter = ['category']


admin.site.register(Requisition)
admin.site.register(IncomingItem)
admin.site.register(Department)


@admin.register(InsuranceItemSalePrice)
class InsuranceItemSalePriceAdmin(admin.ModelAdmin):
    list_display = ['item', 'insurance_company', 'sale_price', 'co_pay']
    search_fields = ['item__name', 'item__item_code', 'insurance_company__name']
    list_filter = ['insurance_company']
    autocomplete_fields = ['item', 'insurance_company']


admin.site.register(GoodsReceiptNote)
admin.site.register(Quotation)
admin.site.register(QuotationItem)
admin.site.register(QuotationCustomer)
admin.site.register(RequisitionItem)

