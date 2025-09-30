import django_filters
from rest_framework import filters

# models
from .models import (
    IncomingItem,
    Inventory,
    Item,
    PurchaseOrder,
    Supplier,
    PurchaseOrderItem,
    RequisitionItem

)

class RequisitionItemFilter(django_filters.FilterSet):
    class Meta:
        model = RequisitionItem
        fields = ['preferred_supplier']


class InventoryFilter(django_filters.FilterSet):
    item = django_filters.CharFilter(field_name='item__id', lookup_expr='icontains')
    department = django_filters.NumberFilter(field_name='department__id')
    department_name = django_filters.CharFilter(field_name='department__name', lookup_expr='icontains')

    class Meta:
        model = Inventory
        fields = ['item', 'department', 'department_name']


class ItemFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr='icontains')
    item_no = django_filters.CharFilter(lookup_expr='icontains')
    category = django_filters.CharFilter(lookup_expr='exact')
    class Meta:
        model = Item
        fields = ('name', 'item_no', 'category')


class PurchaseOrderFilter(django_filters.FilterSet):
    supplier_ID__name = django_filters.CharFilter(lookup_expr='icontains')
    class Meta:
        model = PurchaseOrder
        fields = ('id', 'supplier_ID__name')

class PurchaseOrderSupplierFilter(django_filters.FilterSet):
    supplier = django_filters.ModelChoiceFilter(
        queryset=Supplier.objects.all(),
        method='filter_by_supplier',
        label='Supplier'
    )

    class Meta:
        model = PurchaseOrder
        fields = ['supplier']  # This field will be used in filtering

    def filter_by_supplier(self, queryset, name, value):
        """
        Filters PurchaseOrders by the supplier of their related PurchaseOrderItems.
        """
        return queryset.filter(purchase_order__supplier=value).distinct()




class PurchaseOrderItemFilter(django_filters.FilterSet):
    class Meta:
        model = PurchaseOrderItem
        fields = ( 'id', 'requisition_item')

class IncomingItemFilter(django_filters.FilterSet):
    class Meta:
        model = IncomingItem
        fields = ( 'supplier_invoice', 'purchase_order', 'supplier', 'goods_receipt_note')


class SupplierFilter(django_filters.FilterSet):
    class Meta:
        model = Supplier
        fields = ('common_name',)

class InventoryFilterSearch(filters.SearchFilter):
    def get_search_fields(self, view, request):
        # Get the value of the 'search_field' query parameter
        search_field_param = request.query_params.get('search_field')

        # Check if the parameter exists and is a valid field name
        if search_field_param in view.search_fields:
            return [search_field_param]
        
        # If the parameter is not provided or is invalid, use the view's default search fields
        return super().get_search_fields(view, request)