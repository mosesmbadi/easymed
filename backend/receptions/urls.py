from django.urls import path
# views
from .views import (
    AssignPatientToDoctorAPIView,
    ConvertAppointmentBookingToPatientAPIView,
    DischargePatientsAPIView,
    PrintInvoiceAPIView,
    PrintReceiptAPIView,
    RegisterWalkInPatientsAPIView,
)

urlpatterns = [
    path("assign/patient-doctor", AssignPatientToDoctorAPIView.as_view(), name="assign-patient-doctor"),
    path("convert-bookings/<str:booking_id>", ConvertAppointmentBookingToPatientAPIView.as_view(), name="convert-bookings-patient"),
    path("discharge/patient/<str:patient_id>", DischargePatientsAPIView.as_view(), name="discharge-patient"),
    path("invoices/<str:invoice_id>/print", PrintInvoiceAPIView.as_view()),
    path("receipt/<str:receipt_id>/print", PrintReceiptAPIView.as_view(), name="print-receipt"),
]