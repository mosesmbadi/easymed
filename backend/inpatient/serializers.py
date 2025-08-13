from django.contrib.auth import get_user_model
from rest_framework import serializers

from patient.serializers import ReferralSerializer
from patient.models import AttendanceProcess
from .models import (Bed, PatientAdmission, PatientDischarge, Ward,
                    WardNurseAssignment, InPatientTriage)
from .celery_tasks import set_bed_status_occupied


User = get_user_model()


class PatientAdmissionSerializer(serializers.ModelSerializer):
    ward = serializers.PrimaryKeyRelatedField(queryset=Ward.objects.all(), required=False, allow_null=True)
    bed = serializers.PrimaryKeyRelatedField(queryset=Bed.objects.all(), required=False, allow_null=True)
    attendance_process = serializers.PrimaryKeyRelatedField(queryset=AttendanceProcess.objects.all(), required=False, allow_null=True)

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
            "id", "admission_id", "patient",
            "patient_first_name", "patient_second_name",
            "patient_age", "patient_gender", "ward", "bed",
            "reason_for_admission", "admitted_by_name", "admitted_at", "attendance_process", "discharged"
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Only add extra fields if instance is a model (not an OrderedDict)
        from django.db.models import Model
        if isinstance(instance, Model):
            data["ward"] = getattr(instance.ward, "name", None)
            data["bed"] = getattr(instance.bed, "bed_number", None)
            data["bed_status"] = getattr(instance.bed, "status", None)
        return data


    def validate(self, attrs):
        bed = attrs.get("bed")
        ward = attrs.get("ward")

        # For update, get the current instance
        instance = getattr(self, 'instance', None)

        if bed:
            # Check if the bed is already assigned to another active admission
            existing_admission = PatientAdmission.objects.filter(
                bed=bed, discharge__isnull=True
            )
            if instance:
                existing_admission = existing_admission.exclude(pk=instance.pk)
            if existing_admission.exists():
                raise serializers.ValidationError(
                    {"bed": "This bed is already occupied."}
                )
            if bed.status != "available":
                raise serializers.ValidationError(
                    {"bed": "This bed is already occupied."}
                )
            if ward and bed.ward != ward:
                raise serializers.ValidationError(
                    {"bed": "The bed does not belong to the selected ward."}
                )
        return attrs

    def save(self, **kwargs):
        instance = super().save(**kwargs)
        if instance.bed:
            set_bed_status_occupied.delay(instance.bed.id)
        return instance    


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

    
class InPatientTriageSerializer(serializers.ModelSerializer):
    patient_admission = serializers.PrimaryKeyRelatedField(queryset=PatientAdmission.objects.all())
    attendance_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = InPatientTriage
        fields = [
            'id', 'created_by', 'date_created', 'temperature', 'height', 'weight', 'pulse',
            'diastolic', 'systolic', 'bmi', 'fee', 'notes', 'patient_admission', 'attendance_id'
        ]

    def get_attendance_id(self, obj):
        # Return the related PatientAdmission's attendance_process id
        if obj.patient_admission and hasattr(obj.patient_admission, 'attendance_process'):
            return getattr(obj.patient_admission.attendance_process, 'id', None)
        return None


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
    discharged_by_name = serializers.CharField(source="discharged_by.get_fullname", read_only=True)
    admission = serializers.PrimaryKeyRelatedField(
        queryset=PatientAdmission.objects.all(),
        write_only=True,
        required=False  # Make optional since set via context
    )
    admission_id = serializers.CharField(source="admission.admission_id", read_only=True)
    referral_data = ReferralSerializer(required=False, allow_null=True)

    class Meta:
        model = PatientDischarge
        fields = [
            'id', 'admission', 'admission_id', 'discharge_types',
            'discharged_by_name', 'discharge_notes', 'referral',
            'referral_data', 'discharged_at'
        ]
        read_only_fields = ['discharged_by', 'discharged_at', 'referral', 'discharged_by_name', 'admission_id']

    def validate(self, data):
        discharge_types = data.get('discharge_types')
        referral_data = data.get('referral_data')

        if discharge_types == 'referral' and not referral_data:
            raise serializers.ValidationError("Referral details are required for external referral discharge.")
        if discharge_types != 'referral' and referral_data:
            raise serializers.ValidationError("Referral details should only be set for referral discharge.")
        return data
        
    def create(self, validated_data):
        referral_data = validated_data.pop('referral_data', None)
        discharge_types = validated_data.get('discharge_types')

        # Set admission from context
        admission = self.context.get('admission')
        if not admission:
            raise serializers.ValidationError("Admission is required.")
        validated_data['admission'] = admission

        # Set discharged_by to the requesting user
        validated_data['discharged_by'] = self.context['request'].user

        # Create Referral instance for referral discharge
        if discharge_types == 'referral':
            referral_serializer = ReferralSerializer(data=referral_data)
            referral_serializer.is_valid(raise_exception=True)
            referral = referral_serializer.save(referred_by_id=self.context['request'].user.id)
            validated_data['referral'] = referral
        return super().create(validated_data)

        
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
        data["ward_id"] = instance.ward.pk
        data["nurse"] = instance.nurse.get_fullname()
        data["nurse_id"] = instance.nurse.pk
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


