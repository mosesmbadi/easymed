from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .views import PatientAdmissionViewSet, PatientDischargeViewset, WardViewSet, BedViewSet, WardNurseAssignmentViewSet

router = DefaultRouter()
router.register(r'patient-admissions', PatientAdmissionViewSet, basename='patient-admission')
router.register(r'wards', WardViewSet, basename='ward')
router.register(r'beds', BedViewSet, basename='bed')
router.register(r'ward-nurse-assignments', WardNurseAssignmentViewSet, basename='ward-nurse-assignment')

admissions_url = NestedDefaultRouter(router, 'patient-admissions', lookup='admission')
admissions_url.register(r'discharge', PatientDischargeViewset, basename='patient-admission-discharge')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(admissions_url.urls)),
]

