from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

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
    SupplierPaymentAllocation,
    SupplierPaymentReceipt,
    Unit,
    UNIT_NAME_COLLISION_MESSAGE,
    unit_name_collides,
)
from .services import consumables as consumables_service
from .services import stock as stock_service
from .utils import generate_unique_item_code
from .validators import (
    assign_default_supplier,
    greater_than_zero,
    validate_requisition_item_uniqueness,
)

CustomUser = get_user_model()


# ---------------------------------------------------------------------------
# Base serializers
# ---------------------------------------------------------------------------

class BaseItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_code = serializers.CharField(source='item.item_code', required=False)
    buying_price = serializers.DecimalField(
        source='item.buying_price', max_digits=14, decimal_places=2, read_only=True)
    selling_price = serializers.DecimalField(
        source='item.selling_price', max_digits=14, decimal_places=2, read_only=True)
    vat_rate = serializers.DecimalField(
        source='item.vat_rate', max_digits=10, decimal_places=2, read_only=True)


class BaseSupplierSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.official_name', read_only=True)
    preferred_supplier_name = serializers.CharField(source='preferred_supplier.official_name', read_only=True)


# ---------------------------------------------------------------------------
# Catalogue
# ---------------------------------------------------------------------------

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


class SupplierSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='official_name', read_only=True)  # alias for compatibility

    class Meta:
        model = Supplier
        fields = ['id', 'official_name', 'common_name', 'name']
        read_only_fields = ['id', 'name']


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = '__all__'


class ItemPriceSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = ItemPrice
        fields = ['id', 'item', 'item_name', 'sale_price', 'effective_from', 'effective_to', 'date_created']
        read_only_fields = ['id', 'date_created']


class ItemUnitSerializer(serializers.ModelSerializer):
    item_name = serializers.ReadOnlyField(source='item.name')
    base_unit = serializers.ReadOnlyField(source='item.units_of_measure')

    class Meta:
        model = ItemUnit
        fields = ['id', 'item', 'item_name', 'name', 'factor_to_base',
                  'base_unit', 'is_purchase_default', 'is_sale_default']

    def validate_factor_to_base(self, value):
        if value <= 1:
            raise serializers.ValidationError(
                "A pack has to hold more than one base unit -- a factor of 1 is the base unit itself."
            )
        return value

    def validate(self, attrs):
        # Model.clean() never runs through DRF, so the collision has to be
        # caught here as well or the API is the way it gets in.
        item = attrs.get('item') or getattr(self.instance, 'item', None)
        name = attrs.get('name', getattr(self.instance, 'name', ''))
        if item and unit_name_collides(name, item.units_of_measure):
            raise serializers.ValidationError({'name': UNIT_NAME_COLLISION_MESSAGE.format(
                pack=name,
                base=item.units_of_measure,
                factor=attrs.get('factor_to_base', getattr(self.instance, 'factor_to_base', '')),
            )})
        return attrs


LAB_ACCOMPANIMENT_MESSAGE = (
    "{name} is a lab item, so it cannot carry accompaniments here. Reagents are "
    "declared on the Test Panel and collection consumables on the Specimen."
)

UNPRICED_ITEM_MESSAGE = (
    "{name} is not sold as it stands, so it holds no sale price. Lab reagents and "
    "consumables are raw materials -- price the Test Panel built from them; internal "
    "consumables are never sold at all."
)


class ItemConsumableSerializer(serializers.ModelSerializer):
    """One accompaniment line: this item needs N of that consumable."""
    consumable_name = serializers.CharField(source='consumable.name', read_only=True)
    consumable_code = serializers.CharField(source='consumable.item_code', read_only=True)
    consumable_unit = serializers.CharField(source='consumable.units_of_measure', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = ItemConsumable
        fields = ['id', 'item', 'item_name', 'consumable', 'consumable_name', 'consumable_code',
                  'consumable_unit', 'quantity_per_use', 'is_required', 'date_created']
        read_only_fields = ['id', 'date_created']

    def validate(self, attrs):
        item = attrs.get('item') or getattr(self.instance, 'item', None)
        consumable = attrs.get('consumable') or getattr(self.instance, 'consumable', None)
        if item and consumable and item.id == consumable.id:
            raise serializers.ValidationError(
                {'consumable': "An item cannot be its own accompaniment."})
        if item and not item.supports_accompaniments:
            raise serializers.ValidationError({'item': LAB_ACCOMPANIMENT_MESSAGE.format(name=item.name)})
        if consumable and not consumable.is_stock_tracked:
            raise serializers.ValidationError(
                {'consumable': f"{consumable.name} is a service and holds no stock, "
                               f"so it cannot be an accompaniment."})
        return attrs


class ConsumableRequirementSerializer(serializers.Serializer):
    """
    Read-only view of one accompaniment against live stock -- what the sample
    collection and dispensing screens show before anyone commits to a sale.
    """
    consumable = serializers.IntegerField(source='consumable.id')
    consumable_name = serializers.CharField(source='consumable.name')
    consumable_code = serializers.CharField(source='consumable.item_code')
    units_of_measure = serializers.CharField(source='consumable.units_of_measure')
    quantity_per_use = serializers.IntegerField()
    required_quantity = serializers.IntegerField()
    available_quantity = serializers.IntegerField()
    shortfall = serializers.IntegerField()
    is_required = serializers.BooleanField()


class ItemSerializer(serializers.ModelSerializer):
    unit_conversions = ItemUnitSerializer(many=True, read_only=True)
    item_code = serializers.CharField(max_length=255, required=False)
    unit_symbol = serializers.CharField(source='units.symbol', read_only=True)
    # Price is not a column on Item any more; it is the current row of the
    # price list. Writing it opens a new effective-dated price.
    sale_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    buying_price = serializers.DecimalField(max_digits=14, decimal_places=4, read_only=True)
    quantity_at_hand = serializers.IntegerField(read_only=True)
    departments = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), many=True, required=False,
        help_text="Departments that use this item. Tag 'General' to share it with all")
    department_names = serializers.SerializerMethodField(read_only=True)
    # Accompaniments are declared with the item, so an injectable drug can
    # never be catalogued without saying what it must be given with. Lab items
    # are the exception -- theirs live on the Specimen and the Test Panel.
    consumables = ItemConsumableSerializer(
        source='consumable_links', many=True, read_only=True)
    consumable_items = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False,
        help_text="Accompaniments: [{consumable: <item id>, quantity_per_use: 1, "
                  "is_required: true}]. Send [] to clear them. Not accepted for "
                  "lab items.")
    is_sellable = serializers.BooleanField(read_only=True)
    supports_accompaniments = serializers.BooleanField(read_only=True)

    class Meta:
        model = Item
        fields = '__all__'

    def get_department_names(self, obj):
        return list(obj.departments.values_list('name', flat=True))

    def validate_units_of_measure(self, value):
        # The collision is reachable from this side too: rename the base unit
        # to what one of the item's own packs is already called.
        if self.instance:
            clash = next(
                (pack for pack in self.instance.unit_conversions.all()
                 if unit_name_collides(pack.name, value)),
                None,
            )
            if clash:
                raise serializers.ValidationError(UNIT_NAME_COLLISION_MESSAGE.format(
                    pack=clash.name, base=value, factor=clash.factor_to_base,
                ))
        return value

    def _apply_price(self, item, sale_price):
        if sale_price is not None and item.is_sellable:
            request = self.context.get('request')
            user = getattr(request, 'user', None) if request else None
            stock_service.set_sale_price(
                item, sale_price,
                created_by=user if user and user.is_authenticated else None,
            )

    def create(self, validated_data):
        sale_price = validated_data.pop('sale_price', None)
        departments = validated_data.pop('departments', None)
        consumable_items = validated_data.pop('consumable_items', None)
        if not validated_data.get('item_code'):
            validated_data['item_code'] = generate_unique_item_code()

        with transaction.atomic():
            item = super().create(validated_data)
            if departments is not None:
                self._set_departments(item, departments)
            if consumable_items is not None:
                self._set_consumables(item, consumable_items)
            self._apply_price(item, sale_price)
        return item

    def update(self, instance, validated_data):
        sale_price = validated_data.pop('sale_price', None)
        departments = validated_data.pop('departments', None)
        consumable_items = validated_data.pop('consumable_items', None)

        with transaction.atomic():
            item = super().update(instance, validated_data)
            if departments is not None:
                self._set_departments(item, departments)
            if consumable_items is not None:
                self._set_consumables(item, consumable_items)
            self._apply_price(item, sale_price)
        return item

    def validate_item_code(self, value):
        '''
        The code is what groups an item's stock across every receipt and every
        month, so two different items wearing the same one silently merges
        them in any report that groups by it.
        '''
        code = (value or '').strip()
        if not code:
            return code
        clash = Item.objects.filter(item_code__iexact=code)
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        other = clash.first()
        if other:
            raise serializers.ValidationError(
                f"Item code '{code}' already belongs to {other.name}. "
                f"Codes group an item's stock, so they cannot be shared.")
        return code

    def validate_consumable_items(self, rows):
        '''
        Normalise the posted accompaniments to {consumable_id: defaults}.

        Everything checkable without the item's own id is checked here, so a
        bad payload is a 400 off is_valid() rather than an exception raised
        halfway through the save.
        '''
        wanted = {}
        for row in rows:
            consumable_id = row.get('consumable') or row.get('consumable_id') or row.get('id')
            if consumable_id in (None, ''):
                raise serializers.ValidationError(
                    "Each accompaniment needs a 'consumable' item id.")
            try:
                consumable_id = int(consumable_id)
                quantity = int(row.get('quantity_per_use') or 1)
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    "'consumable' and 'quantity_per_use' must be whole numbers.")
            if quantity < 1:
                raise serializers.ValidationError(
                    "An accompaniment must be used at least once.")
            wanted[consumable_id] = {
                'quantity_per_use': quantity,
                'is_required': bool(row.get('is_required', True)),
            }

        known = Item.objects.in_bulk(list(wanted))
        missing = set(wanted) - set(known)
        if missing:
            raise serializers.ValidationError(f"Unknown item id(s): {sorted(missing)}")
        for consumable in known.values():
            if not consumable.is_stock_tracked:
                raise serializers.ValidationError(
                    f"{consumable.name} is a service and holds no stock, so it "
                    f"cannot be an accompaniment.")
        return wanted

    def validate(self, attrs):
        # Self-reference is only checkable once the item's own id is known,
        # which on an edit it is. On a create the id does not exist yet, and
        # nothing can name an item that has not been saved.
        wanted = attrs.get('consumable_items')
        if wanted and self.instance and self.instance.id in wanted:
            raise serializers.ValidationError(
                {'consumable_items': "An item cannot be its own accompaniment."})

        # What the item is settles both of these, and the category can be
        # changed by this very payload, so read it from what is being saved.
        category = attrs.get('category', getattr(self.instance, 'category', None))
        category_one = attrs.get('category_one', getattr(self.instance, 'category_one', 'Resale'))
        name = attrs.get('name', getattr(self.instance, 'name', 'This item'))

        if wanted and category in Item.LAB_CATEGORIES:
            raise serializers.ValidationError(
                {'consumable_items': LAB_ACCOMPANIMENT_MESSAGE.format(name=name)})

        unpriced = category in Item.UNPRICED_CATEGORIES or category_one == 'Internal'
        if attrs.get('sale_price') is not None and unpriced:
            raise serializers.ValidationError(
                {'sale_price': UNPRICED_ITEM_MESSAGE.format(name=name)})

        return attrs

    def _set_consumables(self, item, wanted):
        '''
        Replace the item's accompaniments with exactly what was posted, so an
        edit that drops the swab actually drops it.
        '''
        wanted.pop(item.id, None)
        item.consumable_links.exclude(consumable_id__in=list(wanted)).delete()
        for consumable_id, defaults in wanted.items():
            ItemConsumable.objects.update_or_create(
                item=item, consumable_id=consumable_id, defaults=defaults)

    @staticmethod
    def _set_departments(item, departments):
        '''Replace the item's department tags, keeping the first as primary.'''
        wanted_ids = [department.id for department in departments]
        item.department_links.exclude(department_id__in=wanted_ids).delete()

        for index, department in enumerate(departments):
            ItemDepartment.objects.update_or_create(
                item=item, department=department,
                defaults={'is_primary': index == 0},
            )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Null rather than 0: a reagent has no price, which is a different
        # statement from one priced at nothing, and the grids render it blank.
        data['sale_price'] = instance.current_sale_price if instance.is_sellable else None
        if not instance.supports_accompaniments:
            data['consumables'] = []
        return data


class InsuranceItemSalePriceSerializer(serializers.ModelSerializer):
    item_name = serializers.ReadOnlyField(source='item.name')
    item_id = serializers.ReadOnlyField(source='item.id')
    insurance_name = serializers.ReadOnlyField(source='insurance_company.name')

    class Meta:
        model = InsuranceItemSalePrice
        fields = '__all__'


# ---------------------------------------------------------------------------
# Procurement
# ---------------------------------------------------------------------------

class SupplierInvoiceSerializer(serializers.ModelSerializer):
    total_amount = serializers.DecimalField(source='amount', read_only=True, max_digits=12, decimal_places=2)
    invoice_number = serializers.CharField(source='invoice_no', read_only=True)  # alias for frontend
    supplier_name = serializers.CharField(source='supplier.official_name', read_only=True)
    purchase_order_number = serializers.CharField(source='purchase_order.PO_number', read_only=True)
    requisition_number = serializers.SerializerMethodField()
    paid_amount = serializers.SerializerMethodField()

    class Meta:
        model = SupplierInvoice
        fields = ['id', 'invoice_no', 'invoice_number', 'supplier', 'supplier_name', 'purchase_order',
                  'purchase_order_number', 'requisition_number',
                  'status', 'total_amount', 'amount', 'paid_amount', 'date_created']
        read_only_fields = ['total_amount', 'paid_amount', 'date_created', 'requisition_number', 'invoice_number']

    def get_requisition_number(self, obj):
        if obj.purchase_order and obj.purchase_order.requisition:
            return obj.purchase_order.requisition.requisition_number
        return None

    def get_paid_amount(self, obj):
        total_paid = obj.payment_allocations.aggregate(total=Sum('amount_applied'))['total']
        return float(total_paid or 0)


def _unit_cost_for(item, requisition_item=None):
    """Cost for ONE of whatever the line is being ordered in."""
    if requisition_item is not None:
        return Decimal(requisition_item.effective_unit_cost)
    return Decimal(item.current_cost or 0)


class RequisitionItemSerializer(BaseItemSerializer, BaseSupplierSerializer):
    # Reads back as the supplier's pk, not its name: the purchase-order screen
    # posts this value straight back as `supplier`. The display name is already
    # carried separately by preferred_supplier_name.
    preferred_supplier = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.all(), required=False)
    requisition = serializers.PrimaryKeyRelatedField(source='requisition.id', read_only=True)
    requisition_number = serializers.CharField(source='requisition.requisition_number', read_only=True)
    requisition_date_created = serializers.DateTimeField(source='requisition.date_created', read_only=True)
    requested_by = serializers.CharField(source='requisition.requested_by.get_fullname', read_only=True)
    department_name = serializers.CharField(source='requisition.department.name', read_only=True)
    quantity_at_hand = serializers.SerializerMethodField(read_only=True)
    quantity_requested = serializers.IntegerField()
    quantity_approved = serializers.IntegerField(
        validators=[greater_than_zero("quantity_approved")], required=False)
    ordered = serializers.BooleanField(read_only=True)
    desc = serializers.CharField(source='item.desc', read_only=True)
    requested_amount = serializers.SerializerMethodField(read_only=True)
    unit_label = serializers.ReadOnlyField()
    conversion_factor = serializers.ReadOnlyField()
    base_quantity_requested = serializers.ReadOnlyField()
    base_unit = serializers.ReadOnlyField(source='item.units_of_measure')
    # Quoted per ordering unit, so a box of twelve shows the box price.
    buying_price = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = RequisitionItem
        fields = ['id', 'requisition_number', 'requisition_date_created', 'requested_by', 'ordered',
                  'item', 'item_code', 'item_name', 'desc', 'quantity_at_hand', 'quantity_requested',
                  'quantity_approved', 'preferred_supplier', 'preferred_supplier_name', 'buying_price',
                  'vat_rate', 'selling_price', 'requested_amount', 'date_created', 'department_name',
                  'requisition', 'unit_cost', 'item_unit', 'unit_label', 'conversion_factor',
                  'base_quantity_requested', 'base_unit']
        read_only_fields = ['id', 'date_created']

    def validate_item(self, value):
        # Catch this here rather than at goods receipt. Without it a service
        # item can be requisitioned, approved, ordered, invoiced and a GRN
        # raised against it, and only the very last step -- posting it to the
        # ledger -- refuses, by which point the paperwork all exists.
        if not value.is_stock_tracked:
            raise serializers.ValidationError(
                f"{value.name} is a {value.get_category_display()}, which is billed "
                "rather than stocked, so it cannot be requisitioned. If this is a "
                "physical item, correct its category first.")
        return value

    def get_buying_price(self, obj):
        return float(_unit_cost_for(obj.item, obj))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['item_code'] = instance.item.item_code
        return data

    def get_quantity_at_hand(self, obj):
        '''Stock on hand at the requesting department, in base units.'''
        return stock_service.on_hand_quantity(obj.item, obj.requisition.department)

    def get_requested_amount(self, obj):
        return float(obj.quantity_requested * _unit_cost_for(obj.item, obj))

    def validate(self, attrs):
        item = attrs.get('item') or getattr(self.instance, 'item', None)
        item_unit = attrs.get('item_unit', getattr(self.instance, 'item_unit', None))
        if item_unit is not None and item is not None and item_unit.item_id != item.id:
            raise serializers.ValidationError(
                {'item_unit': f"'{item_unit.name}' is a pack size for {item_unit.item.name}, not {item.name}."})

        if self.instance is None:  # Creation only
            requisition_id = self.context.get('requisition_id')
            preferred_supplier = attrs.get('preferred_supplier')
            quantity_requested = attrs.get('quantity_requested')
            if requisition_id and item and quantity_requested:
                # Merging only ever happens within one ordering unit.
                validation_result = validate_requisition_item_uniqueness(
                    requisition_id, item, preferred_supplier, quantity_requested, item_unit)
                if validation_result["exists"]:
                    self.context['validation_result'] = validation_result
        return attrs

    def create(self, validated_data):
        validated_data['requisition_id'] = self.context.get('requisition_id')

        with transaction.atomic():
            validation_result = self.context.get('validation_result')
            if validation_result and validation_result["exists"]:
                existing_item = validation_result["existing_item"]
                existing_item.quantity_requested = validation_result["new_quantity"]
                existing_item.save()
                return existing_item
            return RequisitionItem.objects.create(**validated_data)

    def update(self, instance, validated_data):
        instance.quantity_approved = validated_data.get('quantity_approved', instance.quantity_approved)
        instance.unit_cost = validated_data.get('unit_cost', instance.unit_cost)
        instance.save()
        return instance


class RequisitionSerializer(serializers.ModelSerializer):
    items = RequisitionItemSerializer(many=True, required=False)
    requested_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all())
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())
    ordered_by = serializers.CharField(source='requested_by.get_fullname', read_only=True)
    approved_by = serializers.CharField(source='approved_by.get_fullname', read_only=True, allow_null=True)
    total_items_requested = serializers.SerializerMethodField(read_only=True)
    total_amount = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_closed = serializers.BooleanField(read_only=True)
    closed_by = serializers.CharField(source='closed_by.get_fullname', read_only=True, allow_null=True)

    class Meta:
        model = Requisition
        fields = ['id', 'requisition_number', 'total_amount', 'department', 'total_items_requested',
                  'requested_by', 'ordered_by', 'approved_by', 'department_approved', 'procurement_approved',
                  'department_approval_date', 'procurement_approval_date', 'status', 'status_display',
                  'is_closed', 'closed_as', 'closed_reason', 'closed_by', 'closed_at',
                  'items', 'date_created']
        # `status` is derived from the approval flags, the lines' `ordered`
        # state and `closed_as`, so it is reported, never accepted. Closing is
        # its own decision and goes through the reject/cancel endpoints, which
        # check the transition is legal and record who did it and why.
        read_only_fields = ['id', 'requisition_number', 'date_created', 'ordered_by', 'approved_by',
                            'department_approval_date', 'procurement_approval_date', 'status',
                            'closed_as', 'closed_reason', 'closed_at']

    def validate(self, attrs):
        if 'items' in attrs:
            for item_data in attrs['items']:
                assign_default_supplier(item_data)
                if 'quantity_requested' in item_data:
                    item_data['quantity_requested'] = greater_than_zero("quantity_requested")(
                        item_data['quantity_requested'])
                validate_requisition_item_uniqueness(
                    attrs.get('id'), item_data['item'], item_data['preferred_supplier'],
                    item_data['quantity_requested'], item_data.get('item_unit'))
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        with transaction.atomic():
            requisition = Requisition.objects.create(**validated_data)
            if items_data:
                items_by_supplier = {}
                for item_data in items_data:
                    # The unit is part of the key: six boxes and four loose
                    # units of the same item are not ten of anything.
                    item_unit = item_data.get('item_unit')
                    key = (item_data['preferred_supplier'].id, item_data['item'].id,
                           item_unit.id if item_unit else None)
                    if key in items_by_supplier:
                        items_by_supplier[key]['quantity_requested'] += item_data['quantity_requested']
                    else:
                        items_by_supplier[key] = item_data
                for item_data in items_by_supplier.values():
                    RequisitionItem.objects.create(requisition=requisition, **item_data)
            return requisition

    def update(self, instance, validated_data):
        with transaction.atomic():
            validated_data.pop('items', None)
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            if instance.department_approved and not instance.department_approval_date:
                instance.department_approval_date = timezone.now()
            if instance.procurement_approved and not instance.procurement_approval_date:
                instance.procurement_approval_date = timezone.now()
            instance.save()
            return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['department'] = instance.department.name if instance.department else None
        return data

    def get_total_items_requested(self, obj):
        return RequisitionItem.objects.filter(requisition=obj).values('item').distinct().count()

    def get_total_amount(self, obj):
        total = Decimal('0')
        for line in obj.items.select_related('item'):
            total += Decimal(line.quantity_requested) * _unit_cost_for(line.item, line)
        return float(total)


class PurchaseOrderItemSerializer(BaseItemSerializer, BaseSupplierSerializer):
    requisition_number = serializers.CharField(
        source='requisition_item.requisition.requisition_number', read_only=True)
    requisition_date_created = serializers.DateTimeField(
        source='requisition_item.requisition.date_created', read_only=True)
    requested_by = serializers.CharField(
        source='requisition_item.requisition.requested_by.get_fullname', read_only=True)
    requested_by_name = serializers.CharField(
        source='requisition_item.requisition.requested_by.get_fullname', read_only=True)
    ordered = serializers.BooleanField(source='requisition_item.ordered', read_only=True)
    item = serializers.PrimaryKeyRelatedField(source='requisition_item.item', read_only=True)
    desc = serializers.CharField(source='requisition_item.item.desc', read_only=True)
    quantity_at_hand = serializers.SerializerMethodField(read_only=True)
    quantity_requested = serializers.IntegerField(source='requisition_item.quantity_requested', read_only=True)
    quantity_approved = serializers.IntegerField(source='requisition_item.quantity_approved', read_only=True)
    preferred_supplier = serializers.CharField(source='requisition_item.preferred_supplier.id', read_only=True)
    requested_amount = serializers.SerializerMethodField(read_only=True)
    department_name = serializers.CharField(
        source='requisition_item.requisition.department.name', read_only=True)
    PO_number = serializers.CharField(source='purchase_order.PO_number', read_only=True)
    total_buying_amount = serializers.SerializerMethodField(read_only=True)

    # Override base fields with correct sources
    item_name = serializers.CharField(source='requisition_item.item.name', read_only=True)
    item_code = serializers.CharField(source='requisition_item.item.item_code', read_only=True)
    buying_price = serializers.SerializerMethodField(read_only=True)
    selling_price = serializers.DecimalField(
        source='requisition_item.item.selling_price', max_digits=14, decimal_places=2, read_only=True)
    vat_rate = serializers.DecimalField(
        source='requisition_item.item.vat_rate', max_digits=10, decimal_places=2, read_only=True)
    preferred_supplier_name = serializers.CharField(
        source='requisition_item.preferred_supplier.official_name', read_only=True)

    item_unit = serializers.PrimaryKeyRelatedField(
        source='requisition_item.item_unit', read_only=True)
    unit_label = serializers.ReadOnlyField()
    conversion_factor = serializers.ReadOnlyField()
    base_quantity_ordered = serializers.ReadOnlyField()
    base_unit = serializers.ReadOnlyField(source='requisition_item.item.units_of_measure')

    class Meta:
        model = PurchaseOrderItem
        fields = ['id', 'PO_number', 'requisition_number', 'requisition_date_created', 'requested_by', 'ordered',
                  'item', 'item_code', 'item_name', 'desc', 'quantity_at_hand', 'quantity_requested',
                  'quantity_approved', 'quantity_ordered', 'quantity_received', 'preferred_supplier',
                  'buying_price', 'vat_rate', 'selling_price', 'requested_amount', 'department_name',
                  'requested_by_name', 'preferred_supplier_name', 'total_buying_amount', 'date_created',
                  'item_unit', 'unit_label', 'conversion_factor', 'base_quantity_ordered', 'base_unit']
        read_only_fields = ['id', 'date_created']

    def validate(self, attrs):
        # PurchaseOrderItem.clean() is never reached through DRF, so the
        # over-receipt guard has to live here to actually run.
        ordered = attrs.get('quantity_ordered', getattr(self.instance, 'quantity_ordered', 0))
        received = attrs.get('quantity_received', getattr(self.instance, 'quantity_received', 0))
        if received > ordered:
            unit = self.instance.unit_label if self.instance else 'units'
            raise serializers.ValidationError({
                'quantity_received':
                    f"Cannot receive {received} {unit} against {ordered} ordered."})
        return attrs

    def _cost(self, obj):
        req_item = obj.requisition_item
        if req_item is None:
            return Decimal('0')
        return _unit_cost_for(req_item.item, req_item)

    def get_buying_price(self, obj):
        return float(self._cost(obj))

    def get_quantity_at_hand(self, obj):
        if obj.requisition_item is None:
            return 0
        return stock_service.on_hand_quantity(
            obj.requisition_item.item, obj.requisition_item.requisition.department)

    def get_requested_amount(self, obj):
        if obj.requisition_item is None:
            return None
        return float(obj.requisition_item.quantity_requested * self._cost(obj))

    def get_total_buying_amount(self, obj):
        return float(obj.quantity_ordered * self._cost(obj))


class PurchaseOrderSerializer(serializers.ModelSerializer):
    requisition_items = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    items = PurchaseOrderItemSerializer(source='po_items', many=True, read_only=True)
    ordered_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=True)
    approved_by = serializers.CharField(
        source='approved_by.get_fullname', read_only=True, allow_null=True, default="Not Approved")
    total_items_ordered = serializers.SerializerMethodField(read_only=True)
    total_amount_before_vat = serializers.SerializerMethodField(read_only=True)
    total_vat_amount = serializers.SerializerMethodField(read_only=True)
    total_amount = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = ['id', 'PO_number', 'is_dispatched', 'status', 'total_items_ordered', 'total_amount_before_vat',
                  'total_vat_amount', 'total_amount', 'ordered_by', 'approved_by', 'items', 'requisition',
                  'requisition_items', 'supplier']
        read_only_fields = ['id', 'PO_number', 'date_created', 'items']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['ordered_by'] = instance.ordered_by.get_fullname()
        return data

    def create(self, validated_data):
        requisition_item_ids = validated_data.pop('requisition_items', [])
        with transaction.atomic():
            if not requisition_item_ids:
                return PurchaseOrder.objects.create(**validated_data)

            requisition_items = RequisitionItem.objects.filter(
                id__in=requisition_item_ids, ordered=False, quantity_approved__gt=0)
            if not requisition_items.exists():
                raise serializers.ValidationError("No valid requisition items found.")

            purchase_order = PurchaseOrder.objects.create(**validated_data)
            purchase_order.requisition = requisition_items.first().requisition
            if purchase_order.supplier is None:
                # An order raised straight off a requisition rarely carries the
                # supplier in the payload, but the lines already name one -- and
                # a purchase order with no supplier prints an empty address.
                supplier = next(
                    (line.preferred_supplier for line in requisition_items
                     if line.preferred_supplier_id), None)
                purchase_order.supplier = supplier
            purchase_order.save()

            for req_item in requisition_items:
                PurchaseOrderItem.objects.create(
                    purchase_order=purchase_order, requisition_item=req_item,
                    quantity_ordered=req_item.quantity_approved)
                req_item.ordered = True
                req_item.save()
            return purchase_order

    def _lines(self, obj):
        return PurchaseOrderItem.objects.filter(purchase_order=obj).select_related(
            'requisition_item', 'requisition_item__item')

    def get_total_items_ordered(self, obj):
        return self._lines(obj).count()

    def get_total_amount_before_vat(self, obj):
        total = Decimal('0')
        for line in self._lines(obj):
            if line.requisition_item:
                total += Decimal(line.quantity_ordered) * _unit_cost_for(
                    line.requisition_item.item, line.requisition_item)
        return total

    def get_total_vat_amount(self, obj):
        total_vat = Decimal('0')
        for line in self._lines(obj):
            if line.requisition_item:
                amount = Decimal(line.quantity_ordered) * _unit_cost_for(
                    line.requisition_item.item, line.requisition_item)
                total_vat += amount * (line.requisition_item.item.vat_rate / 100)
        return total_vat

    def get_total_amount(self, obj):
        return self.get_total_amount_before_vat(obj) + self.get_total_vat_amount(obj)


class GoodsReceiptNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoodsReceiptNote
        fields = '__all__'
        read_only_fields = ['grn_number', 'date_created']


class IncomingItemSerializer(serializers.ModelSerializer):
    '''
    A goods-received line. Saving one posts a RECEIPT movement to the ledger
    through the service layer -- explicitly, inside the request transaction,
    and idempotently on the line id.
    '''
    item_name = serializers.CharField(source='item.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.official_name', read_only=True)
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    base_units = serializers.IntegerField(read_only=True)
    unit_cost = serializers.DecimalField(max_digits=14, decimal_places=4, read_only=True)
    item_unit_name = serializers.CharField(source='item_unit.name', read_only=True)
    conversion_factor = serializers.IntegerField(read_only=True)
    total_price = serializers.SerializerMethodField()
    is_posted = serializers.BooleanField(read_only=True)
    # Goods without an expiry are the norm, and a form that leaves the field
    # blank sends "". Treat that as "no expiry" rather than failing the whole
    # receipt on a date format.
    expiry_date = serializers.DateField(required=False, allow_null=True, default=None)

    class Meta:
        model = IncomingItem
        fields = ['id', 'item', 'item_name', 'item_code', 'supplier', 'supplier_name', 'department',
                  'department_name', 'purchase_price', 'sale_price', 'quantity', 'item_unit',
                  'item_unit_name', 'conversion_factor', 'base_units', 'unit_cost',
                  'supplier_invoice', 'purchase_order', 'lot_no',
                  'expiry_date', 'total_price', 'date_created', 'posted_at', 'is_posted']
        read_only_fields = ['date_created', 'total_price', 'item_code', 'posted_at', 'is_posted']

    def get_total_price(self, obj):
        return float(obj.line_total)

    def to_internal_value(self, data):
        # An empty date or lot from a form means "not supplied", not "invalid".
        if hasattr(data, 'copy'):
            data = data.copy()
            if data.get('expiry_date') == '':
                data['expiry_date'] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        item = attrs.get('item') or getattr(self.instance, 'item', None)
        if item is not None and not item.is_stock_tracked:
            raise serializers.ValidationError(
                {'item': f"{item.name} is a service and cannot be received into stock."})

        if attrs.get('sale_price') is not None and item is not None and not item.is_sellable:
            raise serializers.ValidationError(
                {'sale_price': UNPRICED_ITEM_MESSAGE.format(name=item.name)})

        quantity = attrs.get('quantity', getattr(self.instance, 'quantity', None))
        if quantity is not None and quantity <= 0:
            raise serializers.ValidationError({'quantity': "Quantity received must be greater than zero."})

        item_unit = attrs.get('item_unit', getattr(self.instance, 'item_unit', None))
        if item_unit is not None and item is not None and item_unit.item_id != item.id:
            raise serializers.ValidationError(
                {'item_unit': f"'{item_unit.name}' is a pack size for {item_unit.item.name}, not {item.name}."})

        supplier_invoice = attrs.get('supplier_invoice')
        supplier = attrs.get('supplier')
        if supplier_invoice and supplier and supplier != supplier_invoice.supplier:
            raise serializers.ValidationError(
                {'supplier': "Supplier must match the supplier on the invoice."})
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if user is not None and not user.is_authenticated:
            user = None

        with transaction.atomic():
            incoming_item = IncomingItem.objects.create(received_by=user, **validated_data)
            stock_service.receive_incoming_item(incoming_item, performed_by=user)
            self._sync_purchase_order(incoming_item)
        incoming_item.refresh_from_db()
        return incoming_item

    def update(self, instance, validated_data):
        if instance.is_posted:
            raise serializers.ValidationError(
                "This receipt has already been posted to the stock ledger. Post a stock "
                "adjustment or a return to supplier instead of editing it."
            )
        return super().update(instance, validated_data)

    @staticmethod
    def _sync_purchase_order(incoming_item):
        '''
        Accumulate what has actually been received against the PO line, so a
        second partial delivery adds to the first instead of replacing it.
        '''
        if not incoming_item.purchase_order_id:
            return

        po_item = PurchaseOrderItem.objects.filter(
            purchase_order=incoming_item.purchase_order,
            requisition_item__item=incoming_item.item,
        ).first()
        if po_item is None:
            return

        received = IncomingItem.objects.filter(
            purchase_order=incoming_item.purchase_order,
            item=incoming_item.item,
            posted_at__isnull=False,
        )
        # This field counts ordering units, the same as quantity_ordered --
        # base_quantity_received scales it up and clean() compares the two
        # directly. Storing base units here reported six boxes received when
        # one had arrived.
        received_base = sum(line.base_units for line in received)
        po_item.quantity_received = received_base // (po_item.conversion_factor or 1)
        po_item.save(update_fields=['quantity_received'])

        from .utils import update_purchase_order_status
        update_purchase_order_status(po_item.purchase_order)


class GoodsReceiptSerializer(serializers.Serializer):
    '''
    Receiving a delivery: the supplier invoice, the goods received note and
    every line that arrived, written as one transaction.

    These used to be three independent requests from the browser. A failure on
    the third left an invoice and a GRN behind claiming goods that had never
    reached stock, and nothing pointed at the discrepancy. Here either the
    whole delivery lands or none of it does.
    '''
    purchase_order = serializers.PrimaryKeyRelatedField(queryset=PurchaseOrder.objects.all())
    invoice_no = serializers.CharField(max_length=255)
    supplier = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.all(), required=False, allow_null=True,
        help_text="Defaults to the supplier on the purchase order")
    status = serializers.ChoiceField(
        choices=SupplierInvoice.STATUS, required=False, default='pending')
    note = serializers.CharField(
        max_length=255, required=False, allow_blank=True, default='',
        help_text="Goes on the goods received note")
    lines = serializers.ListField(child=serializers.DictField(), allow_empty=False)

    def validate_invoice_no(self, value):
        if SupplierInvoice.objects.filter(invoice_no=value).exists():
            raise serializers.ValidationError(
                f"Invoice {value} has already been recorded.")
        return value

    def validate(self, attrs):
        purchase_order = attrs['purchase_order']
        supplier = attrs.get('supplier') or purchase_order.supplier
        if supplier is None:
            raise serializers.ValidationError(
                {'supplier': "No supplier on the purchase order, so one must be given."})
        attrs['supplier'] = supplier

        # Validate every line before writing anything, so the error names the
        # line that is wrong rather than failing halfway through the delivery.
        line_serializers = []
        errors = {}
        for index, line in enumerate(attrs['lines']):
            payload = dict(line)
            payload.setdefault('supplier', supplier.id)
            payload.setdefault('purchase_order', purchase_order.id)
            payload.pop('supplier_invoice', None)
            payload.pop('goods_receipt_note', None)

            line_serializer = IncomingItemSerializer(data=payload, context=self.context)
            if line_serializer.is_valid():
                line_serializers.append(line_serializer)
            else:
                errors[index] = line_serializer.errors
        if errors:
            raise serializers.ValidationError({'lines': errors})

        attrs['line_serializers'] = line_serializers
        return attrs

    def create(self, validated_data):
        purchase_order = validated_data['purchase_order']
        supplier = validated_data['supplier']
        line_serializers = validated_data['line_serializers']

        with transaction.atomic():
            invoice = SupplierInvoice.objects.create(
                invoice_no=validated_data['invoice_no'],
                supplier=supplier,
                purchase_order=purchase_order,
                status=validated_data.get('status', 'pending'),
            )
            grn = GoodsReceiptNote.objects.create(
                note=validated_data.get('note', ''),
                purchase_order=purchase_order,
            )

            lines = []
            for line_serializer in line_serializers:
                # Each line is posted to the ledger by IncomingItemSerializer,
                # inside this transaction, so a failure on the last line undoes
                # the invoice and the GRN too.
                lines.append(line_serializer.save(
                    supplier_invoice=invoice,
                    goods_receipt_note=grn,
                    purchase_order=purchase_order,
                    supplier=supplier,
                ))

            # The invoice is worth what actually arrived, not what was typed.
            invoice.recalculate_amount()
            invoice.refresh_from_db()

        return {'supplier_invoice': invoice, 'goods_receipt_note': grn, 'lines': lines}

    def to_representation(self, instance):
        return {
            'supplier_invoice': SupplierInvoiceSerializer(instance['supplier_invoice']).data,
            'goods_receipt_note': GoodsReceiptNoteSerializer(instance['goods_receipt_note']).data,
            'lines': IncomingItemSerializer(instance['lines'], many=True).data,
        }


# ---------------------------------------------------------------------------
# Stock
# ---------------------------------------------------------------------------

class StockLotSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = StockLot
        fields = ['id', 'item', 'item_name', 'lot_number', 'expiry_date', 'supplier',
                  'is_expired', 'date_created']
        read_only_fields = ['id', 'date_created']


class StockBalanceSerializer(serializers.ModelSerializer):
    '''
    One row per item / lot / location, read from the derived balance cache.

    Field names deliberately match the old Inventory payload so the dashboard
    keeps working -- but `quantity_at_hand` is now the ledger's running total,
    not a column anyone can write to.
    '''
    item_name = serializers.ReadOnlyField(source='item.name')
    item_code = serializers.ReadOnlyField(source='item.item_code')
    category = serializers.ReadOnlyField(source='item.category')
    category_display = serializers.ReadOnlyField(source='item.get_category_display')
    category_one = serializers.ReadOnlyField(source='item.category_one')
    units_of_measure = serializers.ReadOnlyField(source='item.units_of_measure')
    unit_conversions = serializers.SerializerMethodField()
    department_name = serializers.ReadOnlyField(source='department.name')
    lot_number = serializers.ReadOnlyField(source='lot.lot_number')
    expiry_date = serializers.ReadOnlyField(source='lot.expiry_date')
    is_expired = serializers.ReadOnlyField(source='lot.is_expired')

    quantity_at_hand = serializers.IntegerField(source='quantity', read_only=True)
    purchase_price = serializers.DecimalField(source='unit_cost', max_digits=14, decimal_places=4, read_only=True)
    sale_price = serializers.SerializerMethodField()
    re_order_level = serializers.SerializerMethodField()
    total_quantity = serializers.SerializerMethodField()
    available_quantity = serializers.SerializerMethodField()
    lot_value = serializers.SerializerMethodField()
    insurance_sale_prices = serializers.SerializerMethodField()

    class Meta:
        model = StockBalance
        fields = ['id', 'item', 'item_name', 'item_code', 'category', 'category_display',
                  'category_one', 'units_of_measure',
                  'unit_conversions', 'department', 'department_name', 'lot', 'lot_number', 'expiry_date',
                  'is_expired', 'quantity_at_hand', 'available_quantity', 'total_quantity', 'purchase_price',
                  'sale_price', 're_order_level', 'lot_value', 'last_movement_at', 'last_receipt_at',
                  'last_issue_at', 'insurance_sale_prices', 'date_created']

    def get_unit_conversions(self, obj):
        return ItemUnitSerializer(obj.item.unit_conversions.all(), many=True).data

    def get_sale_price(self, obj):
        # Null, not zero: a reagent has no price, which is a different claim
        # from one priced at nothing, and the stock grid renders it blank.
        if not obj.item.is_sellable:
            return None
        return obj.item.current_sale_price

    def get_re_order_level(self, obj):
        return stock_service.re_order_level_for(obj.item, obj.department)

    def get_total_quantity(self, obj):
        '''Total across every lot of this item at this location.'''
        return stock_service.on_hand_quantity(obj.item, obj.department)

    def get_available_quantity(self, obj):
        return stock_service.available_quantity(obj.item, obj.department)

    def get_lot_value(self, obj):
        return float(obj.total_value)

    def get_insurance_sale_prices(self, obj):
        return [
            {
                "insurance": row.insurance_company_id,
                "insurance_name": row.insurance_company.name,
                "price": float(row.sale_price),
                "co_pay": float(row.co_pay),
            }
            for row in InsuranceItemSalePrice.objects.filter(
                item=obj.item).select_related('insurance_company')
        ]


# The dashboard still calls this endpoint "inventories".
InventorySerializer = StockBalanceSerializer


class StockMovementSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    lot_number = serializers.CharField(source='lot.lot_number', read_only=True)
    expiry_date = serializers.DateField(source='lot.expiry_date', read_only=True)
    performed_by_name = serializers.SerializerMethodField()
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)
    total_cost = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = ['id', 'reference', 'movement_type', 'movement_type_display', 'item', 'item_name',
                  'item_code', 'lot', 'lot_number', 'expiry_date', 'department', 'department_name',
                  'quantity', 'unit_cost', 'total_cost', 'balance_after', 'occurred_at', 'posted_at',
                  'performed_by', 'performed_by_name', 'reason', 'source_type', 'source_id',
                  'source_reference', 'reverses']
        read_only_fields = fields

    def get_performed_by_name(self, obj):
        if obj.performed_by:
            return obj.performed_by.get_fullname()
        return None

    def get_total_cost(self, obj):
        return float(obj.total_cost)


class StockPolicySerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = StockPolicy
        fields = ['id', 'item', 'item_name', 'department', 'department_name', 're_order_level',
                  'reorder_quantity', 'max_level', 'is_active', 'date_created']
        read_only_fields = ['id', 'date_created']


class StockReservationSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = StockReservation
        fields = ['id', 'reference', 'item', 'item_name', 'department', 'department_name', 'lot',
                  'quantity', 'status', 'expires_at', 'reason', 'source_type', 'source_id',
                  'resolved_at', 'date_created']
        read_only_fields = ['id', 'reference', 'status', 'resolved_at', 'date_created']

    def create(self, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        return stock_service.reserve(
            item=validated_data['item'],
            department=validated_data['department'],
            quantity=validated_data['quantity'],
            expires_at=validated_data.get('expires_at'),
            reason=validated_data.get('reason', ''),
            created_by=user if user and user.is_authenticated else None,
        )


class StockTakeLineSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='lot.item.name', read_only=True)
    lot_number = serializers.CharField(source='lot.lot_number', read_only=True)
    expiry_date = serializers.DateField(source='lot.expiry_date', read_only=True)
    variance = serializers.IntegerField(read_only=True)

    class Meta:
        model = StockTakeLine
        fields = ['id', 'stock_take', 'lot', 'item_name', 'lot_number', 'expiry_date',
                  'system_quantity', 'counted_quantity', 'variance', 'note', 'movement']
        read_only_fields = ['id', 'system_quantity', 'variance', 'movement']

    def create(self, validated_data):
        # Snapshot what the ledger says right now, so the variance is meaningful.
        stock_take = validated_data['stock_take']
        lot = validated_data['lot']
        balance = StockBalance.objects.filter(
            lot=lot, department=stock_take.department).first()
        validated_data['system_quantity'] = balance.quantity if balance else 0
        return super().create(validated_data)


class StockTakeSerializer(serializers.ModelSerializer):
    lines = StockTakeLineSerializer(many=True, read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    counted_by_name = serializers.CharField(source='counted_by.get_fullname', read_only=True)

    class Meta:
        model = StockTake
        fields = ['id', 'reference_number', 'department', 'department_name', 'status', 'note',
                  'counted_by', 'counted_by_name', 'posted_by', 'posted_at', 'lines', 'date_created']
        read_only_fields = ['id', 'reference_number', 'status', 'posted_by', 'posted_at', 'date_created']


class StockAdjustmentSerializer(serializers.Serializer):
    '''Write an explicit, reasoned correction into the ledger.'''
    item = serializers.PrimaryKeyRelatedField(queryset=Item.objects.all())
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())
    lot = serializers.PrimaryKeyRelatedField(queryset=StockLot.objects.all(), required=False, allow_null=True)
    lot_number = serializers.CharField(required=False, allow_blank=True)
    expiry_date = serializers.DateField(required=False, allow_null=True)
    quantity = serializers.IntegerField(help_text="Signed. Negative writes stock off.")
    movement_type = serializers.ChoiceField(
        choices=[
            StockMovement.Type.ADJUSTMENT,
            StockMovement.Type.WASTAGE,
            StockMovement.Type.EXPIRY_WRITE_OFF,
            StockMovement.Type.RETURN_TO_SUPPLIER,
            StockMovement.Type.RETURN_FROM_ISSUE,
        ],
        default=StockMovement.Type.ADJUSTMENT,
    )
    reason = serializers.CharField(max_length=255)

    def validate(self, attrs):
        if attrs['quantity'] == 0:
            raise serializers.ValidationError({'quantity': "An adjustment of zero has no meaning."})
        if not attrs['item'].is_stock_tracked:
            raise serializers.ValidationError({'item': "Service items hold no stock."})
        if not attrs.get('lot') and attrs.get('lot_number') is None and attrs.get('expiry_date') is None:
            attrs['lot_number'] = ''
        return attrs


class StockTransferSerializer(serializers.Serializer):
    item = serializers.PrimaryKeyRelatedField(queryset=Item.objects.all())
    from_department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())
    to_department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs['from_department'] == attrs['to_department']:
            raise serializers.ValidationError("Source and destination departments must differ.")
        if not attrs['item'].is_stock_tracked:
            raise serializers.ValidationError({'item': "Service items hold no stock."})
        return attrs


class OpeningStockSerializer(serializers.Serializer):
    '''
    Manual stock entry from the dashboard. Accepts the shape the old
    "Add Inventory" form posted, but records it as an OPENING_BALANCE movement
    rather than conjuring a quantity column out of thin air.
    '''
    item = serializers.PrimaryKeyRelatedField(queryset=Item.objects.all())
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())
    quantity_at_hand = serializers.IntegerField(min_value=1)
    lot_number = serializers.CharField(required=False, allow_blank=True, default='')
    expiry_date = serializers.DateField(required=False, allow_null=True)
    purchase_price = serializers.DecimalField(max_digits=14, decimal_places=4, required=False, allow_null=True)
    sale_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    re_order_level = serializers.IntegerField(required=False, min_value=0)
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_item(self, value):
        if not value.is_stock_tracked:
            raise serializers.ValidationError(
                f"{value.name} is a service item and cannot hold stock.")
        return value

    def validate(self, attrs):
        item = attrs.get('item')
        if attrs.get('sale_price') is not None and item is not None and not item.is_sellable:
            raise serializers.ValidationError(
                {'sale_price': UNPRICED_ITEM_MESSAGE.format(name=item.name)})
        return attrs


# ---------------------------------------------------------------------------
# Quotations & supplier payments
# ---------------------------------------------------------------------------

class QuotationCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationCustomer
        fields = '__all__'


class QuotationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quotation
        fields = '__all__'
        read_only_fields = ['quotation_number', 'date_created']


class QuotationItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = QuotationItem
        fields = '__all__'


class SupplierPaymentAllocationSerializer(serializers.ModelSerializer):
    invoice_no = serializers.CharField(source='supplier_invoice.invoice_no', read_only=True)

    class Meta:
        model = SupplierPaymentAllocation
        fields = ['id', 'receipt', 'supplier_invoice', 'invoice_no', 'amount_applied', 'applied_at']
        read_only_fields = ['applied_at']


class SupplierPaymentReceiptSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.official_name', read_only=True)
    allocations = SupplierPaymentAllocationSerializer(many=True, read_only=True)
    sub_account_name = serializers.SerializerMethodField()
    invoice_numbers = serializers.SerializerMethodField()

    class Meta:
        model = SupplierPaymentReceipt
        fields = ['id', 'supplier', 'supplier_name', 'sub_account', 'sub_account_name', 'payment_mode',
                  'total_amount', 'reference_number', 'payment_date', 'created_at', 'allocations',
                  'invoice_numbers']
        read_only_fields = ['created_at']

    def get_sub_account_name(self, obj):
        if obj.sub_account:
            name = obj.sub_account.name
            if getattr(obj.sub_account, 'main_account', None):
                name += f' ({obj.sub_account.main_account.name})'
            return name
        return None

    def get_invoice_numbers(self, obj):
        return list(
            obj.allocations.values_list('supplier_invoice__invoice_no', flat=True).distinct()
        )


class AllocateSupplierPaymentRequestSerializer(serializers.Serializer):
    supplier_id = serializers.IntegerField(required=True)
    invoice_ids = serializers.ListField(child=serializers.IntegerField(), required=True)
    sub_account = serializers.IntegerField(required=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    reference_number = serializers.CharField(max_length=100, required=True)
    payment_date = serializers.DateField(required=False, allow_null=True)
