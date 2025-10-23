from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import (
    Invoice, InvoiceItem,
    PaymentMode, InvoicePayment,
    PaymentReceipt, PaymentAllocation
)


class InvoiceItemSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    item_name = serializers.SerializerMethodField()
    item_code = serializers.SerializerMethodField()
    payment_mode_name = serializers.SerializerMethodField()
    insurance_company_id = serializers.SerializerMethodField()
    sale_price = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceItem
        fields = '__all__'

    def get_category(self, obj):
        item = obj.item
        return item.category if item else None
    
    def get_item_name(self, obj):
        item = obj.item
        return item.name if item else None

    def get_item_code(self, obj):
        item = obj.item
        return item.item_code if item else None
    
    def get_payment_mode_name(self, obj):
        payment_mode = obj.payment_mode
        return payment_mode.payment_mode if payment_mode  else None

    def get_insurance_company_id(self, obj):
        payment_mode = obj.payment_mode
        return payment_mode.insurance_id if payment_mode  else None

    def get_sale_price(self, obj):
        """Compute effective sale_price for display purposes.

        Rule:
        - If PaymentMode is insurance and there is a matching InsuranceItemSalePrice,
          return its sale_price.
        - Otherwise, return Inventory.sale_price for the item.
        - If nothing found, return 0.
        """
        try:
            from inventory.models import Inventory, InsuranceItemSalePrice

            pm = getattr(obj, 'payment_mode', None)
            if pm and pm.payment_category == 'insurance' and pm.insurance_id:
                price_row = InsuranceItemSalePrice.objects.filter(
                    item=obj.item, insurance_company_id=pm.insurance_id
                ).first()
                if price_row:
                    return price_row.sale_price

            inv = Inventory.objects.filter(item=obj.item).order_by('-id').first()
            return inv.sale_price if inv and inv.sale_price is not None else 0
        except Exception:
            return 0
    
    def save(self, **kwargs):
        try:
            return super().save(**kwargs)
        except ValidationError as e:
            raise serializers.ValidationError({'detail': str(e)})


class InvoiceSerializer(serializers.ModelSerializer):
    invoice_items = InvoiceItemSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()

    def get_patient_name(self, obj):
        return obj.patient.first_name

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'invoice_date', 'patient',
                'invoice_items', 'cash_paid', 'total_cash', 'patient_name',
                'invoice_amount', 'status', 'invoice_description',
                'invoice_file', 'invoice_created_at', 'invoice_updated_at']
        read_only_fields = ['invoice_number']


class PaymentModeSerializer(serializers.ModelSerializer):
    insurance_company_name = serializers.SerializerMethodField()
    
    class Meta:
        model = PaymentMode 
        fields = '__all__'
        
    def get_insurance_company_name(self, obj):
        return obj.insurance.name if obj.insurance else None


class InvoicePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoicePayment
        fields = ['invoice', 'payment_mode', 'payment_amount', 'payment_date', 'reference_number']


class PaymentAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAllocation
        fields = ['invoice_item', 'amount_applied', 'applied_at']


class PaymentReceiptSerializer(serializers.ModelSerializer):
    allocations = PaymentAllocationSerializer(many=True, read_only=True)

    class Meta:
        model = PaymentReceipt
        fields = ['id', 'patient', 'payment_mode', 'total_amount', 'reference_number', 'created_at', 'allocations']


class AllocatePaymentRequestSerializer(serializers.Serializer):
    patient_id = serializers.IntegerField()
    invoice_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    payment_mode = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    reference_number = serializers.CharField(max_length=100)