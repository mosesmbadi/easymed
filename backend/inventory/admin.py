from django.contrib import admin

from .models import (
    Department,
    GoodsReceiptNote,
    IncomingItem,
    InsuranceItemSalePrice,
    Item,
    ItemConsumable,
    ItemDepartment,
    ItemPrice,
    ItemUnit,
    PurchaseOrder,
    PurchaseOrderItem,
    Quotation,
    QuotationCustomer,
    QuotationItem,
    Requisition,
    RequisitionItem,
    StockBalance,
    StockLot,
    StockMovement,
    StockPolicy,
    StockReservation,
    StockTake,
    StockTakeLine,
    Supplier,
    SupplierInvoice,
    Unit,
)


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'name', 'category']
    search_fields = ['symbol', 'name']
    list_filter = ['category']


class ItemDepartmentInline(admin.TabularInline):
    model = ItemDepartment
    extra = 1
    autocomplete_fields = ['department']


class ItemUnitInline(admin.TabularInline):
    model = ItemUnit
    extra = 1


@admin.register(ItemUnit)
class ItemUnitAdmin(admin.ModelAdmin):
    list_display = ['item', 'name', 'factor_to_base', 'is_purchase_default', 'is_sale_default']
    list_filter = ['is_purchase_default', 'is_sale_default']
    search_fields = ['item__name', 'item__item_code', 'name']


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'item_code', 'category', 'tagged_departments',
                    'is_stock_tracked', 'default_re_order_level']
    search_fields = ['name', 'item_code', 'category']
    list_filter = ['category', 'is_stock_tracked', 'category_one', 'departments']
    inlines = [ItemDepartmentInline, ItemUnitInline]

    @admin.display(description='Departments')
    def tagged_departments(self, obj):
        return ', '.join(obj.departments.values_list('name', flat=True)) or '—'


@admin.register(ItemConsumable)
class ItemConsumableAdmin(admin.ModelAdmin):
    list_display = ('item', 'consumable', 'quantity_per_use', 'is_required')
    list_filter = ('is_required', 'consumable__category')
    search_fields = ('item__name', 'item__item_code', 'consumable__name', 'consumable__item_code')
    autocomplete_fields = ('item', 'consumable')


@admin.register(ItemDepartment)
class ItemDepartmentAdmin(admin.ModelAdmin):
    list_display = ['item', 'department', 'is_primary']
    list_filter = ['department', 'is_primary']
    search_fields = ['item__name', 'item__item_code', 'department__name']
    autocomplete_fields = ['item', 'department']


@admin.register(ItemPrice)
class ItemPriceAdmin(admin.ModelAdmin):
    list_display = ['item', 'sale_price', 'effective_from', 'effective_to']
    search_fields = ['item__name', 'item__item_code']
    list_filter = ['effective_from']
    autocomplete_fields = ['item']


@admin.register(StockLot)
class StockLotAdmin(admin.ModelAdmin):
    list_display = ['item', 'lot_number', 'expiry_date', 'supplier']
    search_fields = ['item__name', 'lot_number']
    list_filter = ['expiry_date']


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    '''
    The ledger is append-only, so the admin is read-only too. Corrections go
    through a reversal, never through an edit.
    '''
    list_display = ['occurred_at', 'movement_type', 'item', 'department', 'quantity',
                    'balance_after', 'unit_cost', 'source_type', 'performed_by']
    list_filter = ['movement_type', 'source_type', 'department', 'occurred_at']
    search_fields = ['item__name', 'item__item_code', 'lot__lot_number', 'source_reference', 'reason']
    date_hierarchy = 'occurred_at'
    readonly_fields = [field.name for field in StockMovement._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(StockBalance)
class StockBalanceAdmin(admin.ModelAdmin):
    '''Derived from the ledger, so it is never edited by hand.'''
    list_display = ['item', 'department', 'lot', 'quantity', 'unit_cost', 'last_issue_at']
    list_filter = ['department', 'item__category']
    search_fields = ['item__name', 'item__item_code', 'lot__lot_number']
    readonly_fields = ['item', 'lot', 'department', 'quantity', 'unit_cost',
                       'last_movement_at', 'last_receipt_at', 'last_issue_at', 'date_created']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(StockPolicy)
class StockPolicyAdmin(admin.ModelAdmin):
    list_display = ['item', 'department', 're_order_level', 'reorder_quantity', 'is_active']
    list_filter = ['department', 'is_active']
    search_fields = ['item__name', 'item__item_code']
    autocomplete_fields = ['item']


@admin.register(StockReservation)
class StockReservationAdmin(admin.ModelAdmin):
    list_display = ['item', 'department', 'quantity', 'status', 'expires_at', 'created_by']
    list_filter = ['status', 'department']
    search_fields = ['item__name']


class StockTakeLineInline(admin.TabularInline):
    model = StockTakeLine
    extra = 0
    readonly_fields = ['system_quantity', 'movement']


@admin.register(StockTake)
class StockTakeAdmin(admin.ModelAdmin):
    list_display = ['reference_number', 'department', 'status', 'counted_by', 'posted_at']
    list_filter = ['status', 'department']
    inlines = [StockTakeLineInline]
    readonly_fields = ['reference_number', 'posted_at', 'posted_by']


@admin.register(IncomingItem)
class IncomingItemAdmin(admin.ModelAdmin):
    list_display = ['item', 'quantity', 'item_unit', 'base_units', 'department', 'lot_no',
                    'expiry_date', 'supplier', 'posted_at']
    list_filter = ['department', 'supplier']
    search_fields = ['item__name', 'lot_no']
    readonly_fields = ['posted_at']


@admin.register(InsuranceItemSalePrice)
class InsuranceItemSalePriceAdmin(admin.ModelAdmin):
    list_display = ['item', 'insurance_company', 'sale_price', 'co_pay']
    search_fields = ['item__name', 'item__item_code', 'insurance_company__name']
    list_filter = ['insurance_company']
    autocomplete_fields = ['item', 'insurance_company']


admin.site.register(PurchaseOrder)
admin.site.register(PurchaseOrderItem)
admin.site.register(Supplier)
admin.site.register(SupplierInvoice)
admin.site.register(Requisition)
admin.site.register(RequisitionItem)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_stock_location']
    search_fields = ['name']
    list_filter = ['is_stock_location']


admin.site.register(GoodsReceiptNote)
admin.site.register(Quotation)
admin.site.register(QuotationItem)
admin.site.register(QuotationCustomer)
