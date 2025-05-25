from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (Bed, PatientAdmission, PatientDischarge, Ward,
                     WardNurseAssignment)

User = get_user_model()


class PatientAdmissionSerializer(serializers.ModelSerializer):
    ward = serializers.PrimaryKeyRelatedField(
        queryset=Ward.objects.all(), write_only=True
    )
    bed = serializers.PrimaryKeyRelatedField(
        queryset=Bed.objects.all(), write_only=True
    )

    patient_first_name = serializers.CharField(
        source="patient.first_name", read_only=True
    )
    patient_second_name = serializers.CharField(
        source="patient.second_name", read_only=True
    )
    patient_age = serializers.IntegerField(source="patient.age", read_only=True)
    patient_gender = serializers.CharField(source="patient.gender", read_only=True)
    admission_id = serializers.CharField(read_only=True)
    admitted_by_name = serializers.CharField(
        source="admitted_by.get_fullname", read_only=True
    )

    class Meta:
        model = PatientAdmission
        fields = [
            "id",
            "admission_id",
            "patient",
            "patient_first_name",
            "patient_second_name",
            "patient_age",
            "patient_gender",
            "ward",
            "bed",
            "reason_for_admission",
            "admitted_by_name",
            "admitted_at",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["ward"] = instance.ward.name
        data["bed"] = instance.bed.bed_number
        return data

    def validate(self, data):
        bed = data.get("bed")
        ward = data.get("ward")

        if bed.status != "available":
            raise serializers.ValidationError({"bed": "This bed is already occupied."})
        if bed.ward != ward:
            raise serializers.ValidationError(
                {"bed": "The bed does not belong to the selected ward."}
            )

        return data


class WardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ward
        fields = [
            "id",
            "name",
            "capacity",
            "ward_type",
            "gender",
            "created_at",
            "admissions",
        ]

        read_only_fields = ["created_at", "id"]
   
    
class BedSerializer(serializers.ModelSerializer):
    ward = serializers.SerializerMethodField()
    current_occupant = serializers.SerializerMethodField()

    class Meta:
        model = Bed
        fields = ['id', 'bed_number', 'status', 'bed_type', 'ward', 'current_occupant']

    def get_ward(self, instance):
        return {
            'id': instance.ward.id,
            'name': instance.ward.name
        }

    def get_current_occupant(self, instance):
        admission = PatientAdmission.objects.filter(bed=instance, discharge__isnull=True).first()
        if admission:
            return PatientAdmissionSerializer(admission).data
        return None

class PatientDischargeSerializer(serializers.ModelSerializer):
    discharged_by_name = serializers.CharField(
        source="discharged_by.get_fullname", read_only=True
    )
    admission = serializers.PrimaryKeyRelatedField(
        queryset=PatientAdmission.objects.all(), write_only=True
    )
    admission_id = serializers.CharField(
        source="admission.admission_id", read_only=True
    )

    class Meta:
        model = PatientDischarge
        fields = [
            "id",
            "admission",
            "admission_id",
            "discharged_by_name",
            "discharged_at",
            "discharge_notes",
        ]
        read_only_fields = ["discharged_at"]


class WardNurseAssignmentSerializer(serializers.ModelSerializer):
    ward = serializers.PrimaryKeyRelatedField(queryset=Ward.objects.all())
    nurse = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="nurse")
    )
    assigned_by = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="senior_nurse"),
        default=serializers.CurrentUserDefault(),
    )

    class Meta:
        model = WardNurseAssignment
        fields = ["id", "ward", "nurse", "assigned_by", "assigned_at"]
        read_only_fields = ["assigned_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["ward"] = instance.ward.name
        data["nurse"] = instance.nurse.get_fullname()
        data["assigned_by"] = instance.assigned_by.get_fullname()
        return data

class WardSerializer(serializers.ModelSerializer):
    admissions = serializers.SerializerMethodField()
    nurse_assignments = WardNurseAssignmentSerializer(many=True, read_only=True)
    class Meta:
        model = Ward
        fields = [
            'id', 
            'name', 
            'capacity', 
            'ward_type', 
            'gender',
            'created_at', 
            'admissions', 
            'nurse_assignments'
        ]

        read_only_fields = ['created_at', 'id']

    def get_admissions(self, instance):
        active_admissions = instance.admissions.filter(discharge__isnull=True)
        return PatientAdmissionSerializer(active_admissions, many=True).data


