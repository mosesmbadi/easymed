from django.utils import timezone
from rest_framework import serializers
from .models import (
    ContactDetails,
    Patient,
    NextOfKin,
    Prescription,
    PrescribedDrug,
    PublicAppointment,
    Consultation,
    Referral,
    Triage,
    AttendanceProcess,
)
from company.serializers import InsuranceCompanySerializer
from inventory.models import (
    Inventory,
    Item,
)
from billing.models import InvoiceItem
from billing.serializers import InvoiceItemSerializer

class ContactDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactDetails
        fields = '__all__'


class PatientSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = "__all__"
        ordering = "id"

    def get_age(self, obj: Patient):
        if obj.age:
            return obj.age
        return None
    
    def get_patient_insurances(self, obj: Patient):
        return [{"id": insurance.id, "name": insurance.name} for insurance in obj.insurances.all()]
    

    def to_representation(self, instance: Patient):
        data = super().to_representation(instance)
        data["gender"] = instance.get_gender_display()
        data["insurances"] = self.get_patient_insurances(instance)
        return data


class NextOfKinSerializer(serializers.ModelSerializer):
    class Meta:
        model = NextOfKin
        fields = '__all__'


class ConsultationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consultation
        fields = '__all__'


    
class PublicAppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicAppointment
        fields = [
            "id",
            'item',
            'first_name',
            'second_name',
            'date_of_birth',
            'gender',
            'appointment_date_time',
            'status',
            'reason',
            'date_created',
        ]
        read_only_fields = ("id", "date_created",)

    def to_representation(self, instance: PublicAppointment):
        data = super().to_representation(instance)
        data["gender"] = instance.get_gender_display()
        data["status"] = instance.get_status_display()
        if instance.item:
            data["item"] = instance.item.name
        return data

    def get_item_name(self, obj: PublicAppointment):
        return obj.item.name


class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = '__all__'


class PrescribedDrugSerializer(serializers.ModelSerializer):
    item_name = serializers.ReadOnlyField(source='item.name')
    sale_price = serializers.SerializerMethodField()

    class Meta:
        model = PrescribedDrug
        fields = '__all__'

    def get_sale_price(self, obj):
        inventory = Inventory.objects.filter(item=obj.item).order_by('expiry_date').first()
        if inventory:
            return inventory.sale_price
        return 0
        

class ReferralSerializer(serializers.ModelSerializer):
    class Meta:
        model = Referral
        fields = ['note', 'service', 'email', 'referred_by']
        read_only_fields = ['referred_by']


class TriageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Triage
        fields = '__all__'


class AttendanceProcessSerializer(serializers.ModelSerializer):
    insurances = serializers.SerializerMethodField()
    invoice_items = serializers.SerializerMethodField()
    class Meta:
        model = AttendanceProcess
        fields = '__all__'

    def get_insurances(self, obj):
        insurances = obj.patient.insurances.all()
        return InsuranceCompanySerializer(insurances, many=True).data
    
    def get_invoice_items(self, obj):
        invoice = obj.invoice.pk
        invoice_items = InvoiceItem.objects.filter(invoice=invoice)
        serialized_items = InvoiceItemSerializer(invoice_items, many=True)
        return serialized_items.data
    