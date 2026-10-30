from rest_framework import serializers

# models
from customuser.models import (
    CustomUser,
    Doctor,
)

from patient.models import (
    Patient,
    PublicAppointment,
)


# class AssignPatientToDoctorSerializer(serializers.Serializer):
#     doctor_id = serializers.CharField(max_length=40)
#     appointments = serializers.PrimaryKeyRelatedField(
#         queryset=Appointment.objects.all(), required=True, many=True,)
    
#     def validate(self, attrs: dict):
#         doctor_id: str = attrs.get("doctor_id")
#         appointments_id: list[str] = attrs.get("appointments")
#         valid_appointments = appointments_id.copy()
#         if doctor_id is None or appointments_id is None:
#             raise serializers.ValidationError("doctor id and patients id fields are required")
        
#         try:
#             Doctor.objects.get(id=doctor_id)
#         except Doctor.DoesNotExist:
#             raise serializers.ValidationError(f"doctor id {doctor_id} does not exist")
            
        
#         for appointment_id in appointments_id:
#             try:
#                 Appointment.objects.get(id=appointment_id)
            
#             except Patient.DoesNotExist:
#                 valid_appointments.remove(appointment_id)
#                 continue
        
#         attrs["appointments"] = valid_appointments
#         attrs["doctor"] = Doctor.objects.get(id=doctor_id)

#         return attrs
    
#     def assign_doctor(self):
#         doctor: Doctor = self.validated_data.get("doctor")
#         appointments_id: list[str] = self.validated_data.get(
#             "appointments")
#         error_count = 0
#         for appointment_id in appointments_id:
#             try:
#                 appointment = Appointment.objects.get(id=appointment_id)
#                 appointment.assigned_doctor = doctor
#                 appointment.save()
#             except Exception as e:
#                 error_count += 1
#                 continue
        
#         error_message = {
#             "error_message": "an error occured when assigning the patient(s)"}
#         success_message = {
#             "message": f"successfully assigned patient(s) to doctor {doctor.first_name}"}
        
#         return error_message if error_count > 0 else success_message

# class RegisterWalkInPatientSerializer(serializers.Serializer):
#     pass
