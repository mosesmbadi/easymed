from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import (
    Invoice, InvoiceItem,
    PaymentMode, InvoicePayment,
    PaymentReceipt, PaymentAllocation,
    MainAccount, SubAccount
)


class InvoiceItemSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    item_name = serializers.SerializerMethodField()
    item_code = serializers.SerializerMethodField()
    payment_mode_name = serializers.SerializerMethodField()
    insurance_company_id = serializers.SerializerMethodField()
    sale_price = serializers.SerializerMethodField()
    price_source = serializers.SerializerMethodField()
    insurer_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    source_tag_name = serializers.CharField(source='source_tag.name', read_only=True)

    class Meta:
        model = InvoiceItem
        fields = '__all__'
        # Money is worked out by the server from the item, the quantity and the
        # payment mode. A client that could post its own totals is a client that
        # can bill any amount it likes, and the till was already sending figures
        # the model then quietly recomputed -- so say plainly that they are the
        # server's to set.
        read_only_fields = ['unit_price', 'item_amount', 'patient_amount', 'actual_total']

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
    
    def get_price_source(self, obj):
        """Return the source of pricing: 'insurance', 'cash', or 'cash_fallback'."""
        return obj.price_source

    def get_sale_price(self, obj):
        """
        Per-unit price for display: what the line was charged at.

        Read off the line's own frozen `unit_price`, so a billed invoice keeps
        showing what it was sold at rather than re-quoting today's price list.
        Only an unpriced line falls back to the live price.

        Note: item_amount = sale_price x quantity.
        """
        try:
            return obj.sale_price or 0
        except Exception:
            return 0
    
    def create(self, validated_data):
        """Auto-assign the default (Cash) payment mode when none is provided."""
        if not validated_data.get('payment_mode'):
            default_payment_mode = PaymentMode.get_default()
            if default_payment_mode:
                validated_data['payment_mode'] = default_payment_mode
        
        return super().create(validated_data)
    
    def save(self, **kwargs):
        try:
            return super().save(**kwargs)
        except ValidationError as e:
            raise serializers.ValidationError({'detail': str(e)})


class InvoiceSerializer(serializers.ModelSerializer):
    invoice_items = InvoiceItemSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()
    payment_receipts = serializers.SerializerMethodField()

    def get_patient_name(self, obj):
        return obj.patient.first_name

    def get_payment_receipts(self, obj):
        """
        Get all unique payment receipts that have allocations to this invoice's items.
        Returns a list of receipt IDs.
        """
        from billing.models import PaymentReceipt
        
        # Get all receipt IDs that have allocations to this invoice's items
        receipt_ids = PaymentReceipt.objects.filter(
            allocations__invoice_item__invoice=obj
        ).distinct().values_list('id', flat=True)
        
        return [{'id': rid} for rid in receipt_ids]

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'invoice_date', 'patient',
                'invoice_items', 'cash_paid', 'total_cash', 'patient_name',
                'invoice_amount', 'status', 'invoice_description',
                'invoice_file', 'invoice_created_at', 'invoice_updated_at', 'payment_receipts']
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
    invoice_id = serializers.IntegerField(source='invoice_item.invoice.id', read_only=True)
    invoice_number = serializers.CharField(source='invoice_item.invoice.invoice_number', read_only=True)

    class Meta:
        model = PaymentAllocation
        fields = ['invoice_item', 'invoice_id', 'invoice_number', 'amount_applied', 'applied_at']


class PaymentReceiptSerializer(serializers.ModelSerializer):
    allocations = PaymentAllocationSerializer(many=True, read_only=True)
    insurance_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    payment_mode_name = serializers.SerializerMethodField()
    sub_account_name = serializers.SerializerMethodField()
    invoice_numbers = serializers.SerializerMethodField()
    invoice_ids = serializers.SerializerMethodField()

    class Meta:
        model = PaymentReceipt
        fields = ['id', 'patient', 'patient_name', 'insurance', 'insurance_name', 
                  'sub_account', 'sub_account_name', 'payment_mode', 'payment_mode_name',
                  'invoice_numbers', 'invoice_ids',
                  'total_amount', 'reference_number', 'payment_date', 
                  'created_at', 'allocations']

    def get_payment_mode_name(self, obj):
        if obj.sub_account and obj.sub_account.payment_mode:
            return obj.sub_account.payment_mode.payment_mode
        if obj.payment_mode:
            return obj.payment_mode.payment_mode
        return None

    def get_sub_account_name(self, obj):
        return obj.sub_account.name if obj.sub_account else None

    def get_insurance_name(self, obj):
        return obj.insurance.name if obj.insurance else None
    
    def get_patient_name(self, obj):
        if not obj.patient:
            return None

        first_name = getattr(obj.patient, 'first_name', '') or ''
        # Patient model uses `second_name`; keep `last_name` fallback for compatibility.
        second_name = getattr(obj.patient, 'second_name', None)
        if second_name is None:
            second_name = getattr(obj.patient, 'last_name', '') or ''

        full_name = f"{first_name} {second_name}".strip()
        return full_name or None

    def get_invoice_numbers(self, obj):
        invoice_numbers = obj.allocations.values_list(
            'invoice_item__invoice__invoice_number', flat=True
        ).distinct()
        return [num for num in invoice_numbers if num]

    def get_invoice_ids(self, obj):
        invoice_ids = obj.allocations.values_list(
            'invoice_item__invoice_id', flat=True
        ).distinct()
        return list(invoice_ids)


class AllocatePaymentRequestSerializer(serializers.Serializer):
    patient_id = serializers.IntegerField(required=False, allow_null=True)
    insurance_id = serializers.IntegerField(required=False, allow_null=True)
    invoice_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    sub_account = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    reference_number = serializers.CharField(max_length=100)
    payment_date = serializers.DateField(required=False, allow_null=True)

    def validate(self, data):
        # Ensure either patient_id or insurance_id is provided, but not both
        patient_id = data.get('patient_id')
        insurance_id = data.get('insurance_id')
        
        if not patient_id and not insurance_id:
            raise serializers.ValidationError(
                "Either patient_id or insurance_id must be provided."
            )
        
        if patient_id and insurance_id:
            raise serializers.ValidationError(
                "Cannot provide both patient_id and insurance_id."
            )
        
        return data


class SubAccountSerializer(serializers.ModelSerializer):
    main_account_name = serializers.CharField(source='main_account.name', read_only=True)
    payment_mode_name = serializers.CharField(source='payment_mode.payment_mode', read_only=True)
    balance = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = SubAccount
        fields = '__all__'


class MainAccountSerializer(serializers.ModelSerializer):
    subaccounts = SubAccountSerializer(many=True, read_only=True)
    total_balance = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = MainAccount
        fields = '__all__'