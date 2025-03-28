from rest_framework import serializers
from django.contrib.auth import get_user_model


from .models import Ward, Bed, PatientAdmission, WardNurseAssignment
from patient.models import Patient
from customuser.models import NurseProfile, DoctorProfile

User = get_user_model()

class WardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ward
        fields = ['id', 'name', 'capacity', 'created_at']

class BedSerializer(serializers.ModelSerializer):
    ward = WardSerializer(read_only=True)
    class Meta:
        model = Bed
        fields = ['id', 'ward', 'bed_number', 'status']

class PatientAdmissionSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    ward = serializers.PrimaryKeyRelatedField(queryset=Ward.objects.all())
    bed = serializers.PrimaryKeyRelatedField(queryset=Bed.objects.all())
    admitted_by = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role='doctor'), 
                                              default=serializers.CurrentUserDefault())
    admission_id = serializers.CharField(read_only=True)

    class Meta:
        model = PatientAdmission
        fields = ['id', 'patient', 'admission_id', 'ward', 'bed', 'reason_for_admission', 
                  'admitted_by', 'admitted_at', 'discharged_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['ward'] = instance.ward.name
        data['bed'] = instance.bed.bed_number
        data['patient'] = f'{instance.patient.first_name} {instance.patient.second_name}'
        data['admitted_by'] = instance.admitted_by.get_fullname()
        return data

    def validate(self, data):
        bed = data.get('bed')
        ward = data.get('ward')

        if bed.status != 'available':
            raise serializers.ValidationError({"bed": "This bed is already occupied."})
        if bed.ward != ward:
            raise serializers.ValidationError({"bed": "The bed does not belong to the selected ward."})

        return data

class WardNurseAssignmentSerializer(serializers.ModelSerializer):
    ward = serializers.PrimaryKeyRelatedField(queryset=Ward.objects.all())
    nurse = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role='nurse'))
    assigned_by = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='doctor'),
        default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = WardNurseAssignment
        fields = ['id', 'ward', 'nurse', 'assigned_by', 'assigned_at']
        read_only_fields = ['assigned_at']
        
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['ward'] = instance.ward.name
        data['nurse'] = instance.nurse.get_fullname()
        data['assigned_by'] = instance.assigned_by.get_fullname()
        return data

    def validate(self, data):
        """Ensure the assigned_by matches the requesting doctor."""
        assigned_by = data.get('assigned_by')
        if self.context['request'].user != assigned_by:
            raise serializers.ValidationError({"assigned_by": "You can only assign as yourself."})
        return data
