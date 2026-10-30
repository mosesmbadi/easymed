import django_filters
from django.db.models import Q
from rest_framework import filters

from .models import (
    SHARED_DEPARTMENT_NAME,
    IncomingItem,
    Item,
    PurchaseOrder,
    PurchaseOrderItem,
    RequisitionItem,
    StockBalance,
    StockMovement,
    Supplier,
)


class RequisitionItemFilter(django_filters.FilterSet):
    class Meta:
        model = RequisitionItem
        fields = ['preferred_supplier']


class StockBalanceFilter(django_filters.FilterSet):
    '''
    Kept compatible with the old inventory filters (`item`, `department`,
    `department_name`) so the dashboard query does not change.
    '''
    item = django_filters.NumberFilter(field_name='item__id', lookup_expr='exact')
    category = django_filters.CharFilter(field_name='item__category', lookup_expr='exact')
    department = django_filters.NumberFilter(field_name='department__id')
    department_name = django_filters.CharFilter(field_name='department__name', lookup_expr='icontains')
    lot_number = django_filters.CharFilter(field_name='lot__lot_number', lookup_expr='icontains')
    in_stock = django_filters.BooleanFilter(method='filter_in_stock')
    expires_before = django_filters.DateFilter(field_name='lot__expiry_date', lookup_expr='lte')
    expires_after = django_filters.DateFilter(field_name='lot__expiry_date', lookup_expr='gte')

    class Meta:
        model = StockBalance
        fields = ['item', 'category', 'department', 'department_name', 'lot_number']

    def filter_in_stock(self, queryset, name, value):
        return queryset.filter(quantity__gt=0) if value else queryset.filter(quantity__lte=0)


# Historical name, still imported in a few places.
InventoryFilter = StockBalanceFilter


class StockMovementFilter(django_filters.FilterSet):
    item = django_filters.NumberFilter(field_name='item__id')
    department = django_filters.NumberFilter(field_name='department__id')
    lot = django_filters.NumberFilter(field_name='lot__id')
    movement_type = django_filters.CharFilter(lookup_expr='exact')
    source_type = django_filters.CharFilter(lookup_expr='exact')
    occurred_after = django_filters.DateTimeFilter(field_name='occurred_at', lookup_expr='gte')
    occurred_before = django_filters.DateTimeFilter(field_name='occurred_at', lookup_expr='lte')

    class Meta:
        model = StockMovement
        fields = ['item', 'department', 'lot', 'movement_type', 'source_type', 'reference']


class IncomingItemFilter(django_filters.FilterSet):
    posted = django_filters.BooleanFilter(field_name='posted_at', lookup_expr='isnull', exclude=True)

    class Meta:
        model = IncomingItem
        fields = ['supplier_invoice', 'purchase_order', 'supplier', 'item', 'department']


class ItemFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr='icontains')
    item_code = django_filters.CharFilter(lookup_expr='icontains')
    category = django_filters.CharFilter(lookup_expr='exact')
    is_stock_tracked = django_filters.BooleanFilter()
    department = django_filters.NumberFilter(method='filter_department')
    department_name = django_filters.CharFilter(method='filter_department_name')

    class Meta:
        model = Item
        fields = ('name', 'item_code', 'category', 'is_stock_tracked')

    @staticmethod
    def _visible_to(queryset, condition):
        '''
        Items tagged to the department, plus shared (General) items, plus items
        nobody has tagged yet -- so untagged stock does not vanish from every
        department the moment tagging is introduced.
        '''
        return queryset.filter(
            condition
            | Q(department_links__department__name__iexact=SHARED_DEPARTMENT_NAME)
            | Q(department_links__isnull=True)
        ).distinct()

    def filter_department(self, queryset, name, value):
        return self._visible_to(queryset, Q(department_links__department_id=value))

    def filter_department_name(self, queryset, name, value):
        return self._visible_to(queryset, Q(department_links__department__name__iexact=value))


class PurchaseOrderFilter(django_filters.FilterSet):
    class Meta:
        model = PurchaseOrder
        fields = ('id', 'supplier', 'status')


class PurchaseOrderSupplierFilter(django_filters.FilterSet):
    supplier = django_filters.ModelChoiceFilter(
        queryset=Supplier.objects.all(),
        method='filter_by_supplier',
        label='Supplier',
    )

    class Meta:
        model = PurchaseOrder
        fields = ['supplier']

    def filter_by_supplier(self, queryset, name, value):
        """
        Filters PurchaseOrders by the supplier of their related PurchaseOrderItems.
        """
        return queryset.filter(supplier=value).distinct()


class PurchaseOrderItemFilter(django_filters.FilterSet):
    class Meta:
        model = PurchaseOrderItem
        fields = ('id', 'requisition_item')


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
