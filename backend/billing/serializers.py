from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import (
    Invoice, InvoiceItem,
    PaymentMode, InvoicePayment
)


class InvoiceItemSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    item_name = serializers.SerializerMethodField()
    item_code = serializers.SerializerMethodField()
    payment_mode_name = serializers.SerializerMethodField()
    insurance_company_id = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'invoice', 'item', 'payment_mode', 'item_amount',
            'category', 'item_name', 'item_code', 'payment_mode_name',
            'insurance_company_id'
            ]

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
        return payment_mode.paymet_mode if payment_mode  else None

    def get_insurance_company_id(self, obj):
        payment_mode = obj.payment_mode
        return payment_mode.insurance_id if payment_mode  else None
    
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
    class Meta:
        model = PaymentMode 
        fields = '__all__'       


class InvoicePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoicePayment
        fields = ['invoice', 'payment_mode', 'payment_amount', 'payment_date']