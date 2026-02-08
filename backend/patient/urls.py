from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContactDetailsViewSet,
    PatientViewSet,
    NextOfKinViewSet,
    PrescriptionViewSet,
    PrescribedDrugViewSet,
    PublicAppointmentViewSet,
    ConsultationViewSet,
    ReferralViewSet,
    TriageViewSet,
    PatientByUserIdAPIView,
    # ConvertToAppointmentAPIView,
    PrescribedDrugByPatientIdAPIView,
    PrescribedDrugByPrescriptionViewSet,
    AttendanceProcessViewSet,

    download_prescription_pdf,
    generate_lab_tests_report,
)

router = DefaultRouter()
router.register(r'contact-details', ContactDetailsViewSet)
router.register(r'patients', PatientViewSet)
router.register(r'next-of-kin', NextOfKinViewSet)

router.register(r'publicappointments', PublicAppointmentViewSet)
router.register(r'prescriptions', PrescriptionViewSet)
router.register(r'prescribed-drugs', PrescribedDrugViewSet)
router.register(r'consultations', ConsultationViewSet)
router.register(r'referrals', ReferralViewSet)
router.register(r'triage', TriageViewSet)
router.register(r'initiate-attendance-process', AttendanceProcessViewSet)



urlpatterns = [
    path('', include(router.urls)),
    path('patient-profile/', PatientByUserIdAPIView.as_view(), name="patient-profile"),
    path('patients/<int:user_id>/', PatientByUserIdAPIView.as_view(), name="patient-by-userid"),
    
    # path('appointments/by_patient_id/<int:patient_id>/', AppointmentsByPatientIdAPIView.as_view(), name="appointment-by-patientid"),
    # path('appointments/by_doctor/<int:assigned_doctor_id>/', AppointmentByDoctorView.as_view(), name='appointments-by-doctor'),

    path('prescribed-drugs/by_patient_id/<int:patient_id>/', PrescribedDrugByPatientIdAPIView.as_view(), name="prescribed-drug-by-patientid"),

    # path('convert-to-appointment/', ConvertToAppointmentAPIView.as_view(), name="convert-to-appointment"),
    
    path('prescribed-drugs/by-prescription/<int:prescription_id>/', PrescribedDrugByPrescriptionViewSet.as_view({'get': 'list'}), name='prescribed_drugs_by_prescription'),

    path('reports/download_prescription_pdf/<int:prescription_id>/', download_prescription_pdf, name='download_prescription_pdf'),

    path('reports/lab-tests/', generate_lab_tests_report, name='generate_lab_tests_report'),

    path('prescribed-drugs/', PrescribedDrugViewSet.as_view({'get': 'list', 'post': 'create'}), name='prescribeddrug-list'),
]
