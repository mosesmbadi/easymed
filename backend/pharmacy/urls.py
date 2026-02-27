from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    PublicPrescriptionRequestViewSet,
    PublicPrescriptionRequestByPatientIDView,
    DrugsFeedbackViewSet,
    DrugCategoryViewSet,
    DrugModeViewSet,
    DrugStateViewSet,
    DrugViewSet,
    PharmacyDashboardMetricsView,
    print_pharmacy_report
)


router = DefaultRouter()
router.register(r'public-prescription-requests', PublicPrescriptionRequestViewSet)
router.register(r'drugs-feedback', DrugsFeedbackViewSet)
router.register(r'drug-categories', DrugCategoryViewSet)
router.register(r'drug-modes', DrugModeViewSet)
router.register(r'drug-states', DrugStateViewSet)
router.register(r'drugs', DrugViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('public-prescription/by_patient_id/<int:patient_id>/', PublicPrescriptionRequestByPatientIDView.as_view(), name='prescriptions-by-patient'),
    path('pharmacy-dashboard-metrics/', PharmacyDashboardMetricsView.as_view(), name='pharmacy-dashboard-metrics'),
    path('print-pharmacy-report/', print_pharmacy_report, name='print-pharmacy-report'),
]
