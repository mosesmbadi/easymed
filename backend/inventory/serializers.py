from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import (
    Item,
    Inventory,
    Supplier,
    SupplierInvoice,
    IncomingItem,
    Department,
    Requisition,
    RequisitionItem,
    PurchaseOrder,
    PurchaseOrderItem,
    InsuranceItemSalePrice,
    GoodsReceiptNote,
    Quotation,
    QuotationItem,
    QuotationCustomer,
    InventoryArchive,
    SupplierPaymentReceipt,
    SupplierPaymentAllocation
)

from . validators import (
    greater_than_zero,
    validate_requisition_item_uniqueness,
    assign_default_supplier
)

CustomUser = get_user_model()

# Base Serializers
class BaseItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_code = serializers.CharField(source='item.item_code', required=False)
    buying_price = serializers.DecimalField(source='item.buying_price', max_digits=10, decimal_places=2, read_only=True)
    selling_price = serializers.DecimalField(source='item.selling_price', max_digits=10, decimal_places=2, read_only=True)
    vat_rate = serializers.DecimalField(source='item.vat_rate', max_digits=10, decimal_places=2, read_only=True)

class BaseSupplierSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.official_name', read_only=True)
    preferred_supplier_name = serializers.CharField(source='preferred_supplier.official_name', read_only=True)

# Consolidated Serializers
class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class SupplierSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='official_name', read_only=True)  # Add alias for compatibility
    
    class Meta:
        model = Supplier
        fields = ['id', 'official_name', 'common_name', 'name']
        read_only_fields = ['id', 'name']


class SupplierInvoiceSerializer(serializers.ModelSerializer):
    total_amount = serializers.DecimalField(source='amount', read_only=True, max_digits=10, decimal_places=2)
    invoice_number = serializers.CharField(source='invoice_no', read_only=True)  # Add alias for frontend
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
        """Calculate total paid amount from payment allocations"""
        total_paid = obj.payment_allocations.aggregate(total=Sum('amount_applied'))['total']
        return float(total_paid or 0)


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = '__all__'  


class RequisitionItemSerializer(BaseItemSerializer, BaseSupplierSerializer):
    preferred_supplier = serializers.PrimaryKeyRelatedField(queryset=Supplier.objects.all(), required=False, write_only=True)
    requisition = serializers.PrimaryKeyRelatedField(source='requisition.id', read_only=True)
    requisition_number = serializers.CharField(source='requisition.requisition_number', read_only=True)
    requisition_date_created = serializers.DateTimeField(source='requisition.date_created', read_only=True)
    requested_by = serializers.CharField(source='requisition.requested_by.get_fullname', read_only=True)
    department_name = serializers.CharField(source='requisition.department.name', read_only=True)
    quantity_at_hand = serializers.IntegerField(source='inventory.quantity_at_hand', read_only=True)
    quantity_requested = serializers.IntegerField()
    quantity_approved = serializers.IntegerField(validators=[greater_than_zero("quantity_approved")], required=False)
    ordered = serializers.BooleanField(read_only=True)
    desc = serializers.CharField(source='item.desc', read_only=True)
    requested_amount = serializers.SerializerMethodField(read_only=True,method_name='get_requested_amount')

    class Meta:
        model = RequisitionItem
        fields = ['id', 'requisition_number', 'requisition_date_created', 'requested_by', 'ordered',
                  'item', 'item_code', 'item_name', 'desc', 'quantity_at_hand', 'quantity_requested', 'quantity_approved',
                  'preferred_supplier', 'preferred_supplier_name', 'buying_price', 'vat_rate', 'selling_price',
                  'requested_amount', 'date_created','department_name', 'requisition']
        read_only_fields = ['id', 'date_created']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['preferred_supplier'] = instance.preferred_supplier.official_name if instance.preferred_supplier else None
        data['item_code'] = instance.item.item_code if hasattr(instance.item, 'item_code') else None
        return data
    
    def get_quantity_at_hand(self, obj):    
        inventory = obj.item.active_inventory_items.order_by('expiry_date').first()
        return inventory.quantity_at_hand if inventory else 0
    
    def get_requested_amount(self, obj):
        inventory = obj.item.active_inventory_items.order_by('expiry_date').first()
        return float(obj.quantity_requested * inventory.purchase_price) if inventory else None

    def validate(self, attrs):
        if self.instance is None:  # Creation only
            requisition_id = self.context.get('requisition_id')
            item = attrs.get('item')
            preferred_supplier = attrs.get('preferred_supplier')
            quantity_requested = attrs.get('quantity_requested')
            if requisition_id and item and quantity_requested:
                validation_result = validate_requisition_item_uniqueness(requisition_id, item, preferred_supplier, quantity_requested)
                if validation_result["exists"]:
                    self.context['validation_result'] = validation_result
        return attrs

    def create(self, validated_data):
        requisition_id = self.context.get('requisition_id')
        validated_data['requisition_id'] = requisition_id

        with transaction.atomic():
            validation_result = self.context.get('validation_result')
            if validation_result and validation_result["exists"]:
                existing_item = validation_result["existing_item"]
                existing_item.quantity_requested = validation_result["new_quantity"]
                existing_item.save()
                return existing_item
            requisition_item = RequisitionItem.objects.create(**validated_data)
            return requisition_item

    def update(self, instance, validated_data):
        """
        Updates the RequisitionItem instance with the validated data.
        """
        instance.quantity_approved = validated_data.get('quantity_approved', instance.quantity_approved)
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

    class Meta:
        model = Requisition
        fields = ['id', 'requisition_number', 'total_amount', 'department', 'total_items_requested', 'requested_by', 'ordered_by',
                  'approved_by', 'department_approved', 'procurement_approved', 'department_approval_date',
                  'procurement_approval_date', 'items', 'date_created']
        read_only_fields = ['id', 'requisition_number', 'date_created', 'ordered_by', 'approved_by',
                            'department_approval_date', 'procurement_approval_date']

    def validate(self, attrs):
        if 'items' in attrs:
            for item_data in attrs['items']:
                assign_default_supplier(item_data)
                if 'quantity_requested' in item_data:
                    item_data['quantity_requested'] = greater_than_zero("quantity_requested")(item_data['quantity_requested'])
                validate_requisition_item_uniqueness(attrs.get('id'), item_data['item'], item_data['preferred_supplier'],
                                                     item_data['quantity_requested'])
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        with transaction.atomic():
            requisition = Requisition.objects.create(**validated_data)
            if items_data:
                items_by_supplier = {}
                for item_data in items_data:
                    key = (item_data['preferred_supplier'].id, item_data['item'].id)
                    if key in items_by_supplier:
                        items_by_supplier[key]['quantity_requested'] += item_data['quantity_requested']
                    else:
                        items_by_supplier[key] = item_data
                for item_data in items_by_supplier.values():
                    RequisitionItem.objects.create(requisition=requisition, **item_data)
            return requisition

    def update(self, instance, validated_data):
        with transaction.atomic():
            items_data = validated_data.pop('items', None)
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            if instance.department_approved:
                instance.department_approval_date = timezone.now()
            if instance.procurement_approved:
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
        total = 0
        for item in obj.items.all():
            inventory = item.item.active_inventory_items.order_by('expiry_date').first()
            if inventory:
                total += float(item.quantity_requested * inventory.purchase_price)
        return total


class PurchaseOrderItemSerializer(BaseItemSerializer, BaseSupplierSerializer):
    requisition_number = serializers.CharField(source='requisition_item.requisition.requisition_number', read_only=True)
    requisition_date_created = serializers.DateTimeField(source='requisition_item.requisition.date_created', read_only=True)
    requested_by = serializers.CharField(source='requisition_item.requisition.requested_by.get_fullname', read_only=True)
    requested_by_name = serializers.CharField(source='requisition_item.requisition.requested_by.get_fullname', read_only=True)
    ordered = serializers.BooleanField(source='requisition_item.ordered', read_only=True)
    item = serializers.PrimaryKeyRelatedField(source='requisition_item.item', read_only=True)
    desc = serializers.CharField(source='requisition_item.item.desc', read_only=True)
    quantity_at_hand = serializers.SerializerMethodField(read_only=True)
    quantity_requested = serializers.IntegerField(source='requisition_item.quantity_requested', read_only=True)
    quantity_approved = serializers.IntegerField(source='requisition_item.quantity_approved', read_only=True)
    preferred_supplier = serializers.CharField(source='requisition_item.preferred_supplier.id', read_only=True)
    requested_amount = serializers.SerializerMethodField(read_only=True)
    department_name = serializers.CharField(source='requisition_item.requisition.department.name', read_only=True)
    PO_number = serializers.CharField(source='purchase_order.PO_number', read_only=True)
    total_buying_amount = serializers.SerializerMethodField(read_only=True)

    # Override base fields with correct sources
    item_name = serializers.CharField(source='requisition_item.item.name', read_only=True)
    item_code = serializers.CharField(source='requisition_item.item.item_code', read_only=True)
    buying_price = serializers.DecimalField(source='requisition_item.item.buying_price', max_digits=10, decimal_places=2, read_only=True)
    selling_price = serializers.DecimalField(source='requisition_item.item.selling_price', max_digits=10, decimal_places=2, read_only=True)
    vat_rate = serializers.DecimalField(source='requisition_item.item.vat_rate', max_digits=10, decimal_places=2, read_only=True)
    preferred_supplier_name = serializers.CharField(source='requisition_item.preferred_supplier.official_name', read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = ['id', 'PO_number', 'requisition_number', 'requisition_date_created', 'requested_by', 'ordered',
                  'item', 'item_code', 'item_name', 'desc', 'quantity_at_hand', 'quantity_requested', 'quantity_approved',
                  'quantity_ordered', 'quantity_received', 'preferred_supplier', 'buying_price', 'vat_rate', 'selling_price',
                  'requested_amount', 'department_name', 'requested_by_name', 'preferred_supplier_name',
                  'total_buying_amount', 'date_created']
        read_only_fields = ['id', 'date_created']

    def get_quantity_at_hand(self, obj):
        inventory = obj.requisition_item.item.active_inventory_items.order_by('expiry_date').first()
        return inventory.quantity_at_hand if inventory else 0

    def get_requested_amount(self, obj):
        inventory = obj.requisition_item.item.active_inventory_items.order_by('expiry_date').first()
        return float(obj.requisition_item.quantity_requested * inventory.purchase_price) if inventory else None

    def get_total_buying_amount(self, obj):
        inventory = obj.requisition_item.item.active_inventory_items.order_by('expiry_date').first()
        return float(obj.quantity_ordered * inventory.purchase_price) if inventory else None
  
    
class PurchaseOrderSerializer(serializers.ModelSerializer):
    requisition_items = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    items = PurchaseOrderItemSerializer(source='po_items', many=True, read_only=True)  
    ordered_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=True)
    approved_by = serializers.CharField(source='approved_by.get_fullname', read_only=True, allow_null=True, default="Not Approved")
    total_items_ordered = serializers.SerializerMethodField(read_only=True)
    total_amount_before_vat = serializers.SerializerMethodField(read_only=True)
    total_vat_amount = serializers.SerializerMethodField(read_only=True)
    total_amount = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = ['id', 'PO_number', 'is_dispatched', 'status', 'total_items_ordered', 'total_amount_before_vat',
                  'total_vat_amount', 'total_amount', 'ordered_by', 'approved_by', 'items', 'requisition', 'requisition_items',]
        read_only_fields = ['id', 'PO_number', 'date_created', 'items']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['ordered_by'] = instance.ordered_by.get_fullname()
        return data

    def create(self, validated_data):
        requisition_item_ids = validated_data.pop('requisition_items', [])
        with transaction.atomic():
            if requisition_item_ids:
                requisition_items = RequisitionItem.objects.filter(id__in=requisition_item_ids, ordered=False,
                                                                  quantity_approved__gt=0)
                if not requisition_items.exists():
                    raise serializers.ValidationError("No valid requisition items found.")

                purchase_order = PurchaseOrder.objects.create(**validated_data)

                requisition = requisition_items.first().requisition
                purchase_order.requisition = requisition
                purchase_order.save()

                for req_item in requisition_items:
                    PurchaseOrderItem.objects.create(purchase_order=purchase_order, requisition_item=req_item,
                                                    quantity_ordered=req_item.quantity_approved)
                    req_item.ordered = True
                    req_item.save()
                return purchase_order
            else:
                return PurchaseOrder.objects.create(**validated_data) 

    def get_total_items_ordered(self, obj):
        return PurchaseOrderItem.objects.filter(purchase_order=obj).count()

    def get_total_amount_before_vat(self, obj):
        total = 0
        for item in PurchaseOrderItem.objects.filter(purchase_order=obj):
            inventory = item.requisition_item.item.active_inventory_items.order_by('expiry_date').first()
            if inventory:
                total += item.quantity_ordered * inventory.purchase_price
        return total

    def get_total_vat_amount(self, obj):
        total_vat = 0
        for item in PurchaseOrderItem.objects.filter(purchase_order=obj):
            inventory = item.requisition_item.item.active_inventory_items.order_by('expiry_date').first()
            if inventory:
                amount = item.quantity_ordered * inventory.purchase_price
                vat = amount * (item.requisition_item.item.vat_rate / 100)
                total_vat += vat
        return total_vat

    def get_total_amount(self, obj):
        return self.get_total_amount_before_vat(obj) + self.get_total_vat_amount(obj)

class IncomingItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.official_name', read_only=True)
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    total_price = serializers.SerializerMethodField()
    
    class Meta:
        model = IncomingItem
        fields = ['id', 'item', 'item_name', 'item_code', 'supplier', 'supplier_name', 'purchase_price', 
                 'sale_price', 'quantity', 'supplier_invoice', 'purchase_order', 
                 'lot_no', 'expiry_date', 'total_price', 'date_created', 'category_one']
        read_only_fields = ['date_created', 'total_price', 'item_code']
    
    def get_total_price(self, obj):
        return obj.purchase_price * obj.quantity if obj.purchase_price and obj.quantity else 0

class InventorySerializer(serializers.ModelSerializer):
    insurance_sale_prices = serializers.SerializerMethodField()
    item_name = serializers.ReadOnlyField(source='item.name')
    department_name = serializers.ReadOnlyField(source='department.name')
    total_quantity = serializers.SerializerMethodField()
    class Meta:
        model = Inventory
        fields = ['id', 'item', 'item_name', 'department', 'department_name', 'purchase_price', 'sale_price', 
                 'quantity_at_hand', 'lot_number', 'expiry_date', 'date_created', 
                 'category_one', 'insurance_sale_prices', 'total_quantity']

    def get_insurance_sale_prices(self, obj):
        sale_prices = InsuranceItemSalePrice.objects.filter(item=obj.item)
        insurance_prices = []
        for sale in sale_prices:

            insurance_price = {
                "insurance": sale.insurance_company.id,
                "insurance_name": sale.insurance_company.name,
                "price": str(sale.sale_price),
                "co_pay": str(sale.co_pay)
            }
            insurance_prices.append(insurance_price)
        return insurance_prices

    def get_total_quantity(self, obj):
        '''Get total quantity across all lots for this item'''
        total = Inventory.objects.filter(item=obj.item).order_by('expiry_date').aggregate(
            total_qty=Sum('quantity_at_hand'))['total_qty'] or 0
        return total


class InsuranceItemSalePriceSerializer(serializers.ModelSerializer):
    item_name = serializers.ReadOnlyField(source='item.name')
    item_id = serializers.ReadOnlyField(source='item.id')
    insurance_name = serializers.ReadOnlyField(source='insurance_company.name')
    class Meta:
        model = InsuranceItemSalePrice
        fields = '__all__'

class InventoryArchiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryArchive
        fields = '__all__'

class GoodsReceiptNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoodsReceiptNote
        fields = '__all__'


class QuotationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quotation
        fields = '__all__'


class QuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationItem
        fields = '__all__'


class SupplierPaymentAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierPaymentAllocation
        fields = ['supplier_invoice', 'amount_applied', 'applied_at']


class SupplierPaymentReceiptSerializer(serializers.ModelSerializer):
    allocations = SupplierPaymentAllocationSerializer(many=True, read_only=True)
    supplier_name = serializers.SerializerMethodField()

    class Meta:
        model = SupplierPaymentReceipt
        fields = ['id', 'supplier', 'supplier_name', 'payment_mode', 'total_amount', 
                  'reference_number', 'payment_date', 'created_at', 'allocations']

    def get_supplier_name(self, obj):
        return obj.supplier.name if obj.supplier else None


class AllocateSupplierPaymentRequestSerializer(serializers.Serializer):
    supplier_id = serializers.IntegerField(required=True)
    invoice_ids = serializers.ListField(child=serializers.IntegerField(), required=True)
    payment_mode = serializers.IntegerField(required=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    reference_number = serializers.CharField(max_length=100, required=True)
    payment_date = serializers.DateField(required=False, allow_null=True)