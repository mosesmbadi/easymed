from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientAdmissionViewSet, WardViewSet, BedViewSet, WardNurseAssignmentViewSet

router = DefaultRouter()
router.register(r'patient-admissions', PatientAdmissionViewSet, basename='patient-admission')
router.register(r'wards', WardViewSet, basename='ward')
router.register(r'beds', BedViewSet, basename='bed')
router.register(r'ward-nurse-assignments', WardNurseAssignmentViewSet, basename='ward-nurse-assignment')

urlpatterns = [
    path('', include(router.urls)),
]