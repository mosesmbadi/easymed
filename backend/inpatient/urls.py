from django.urls import include, path, re_path
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter

from .views import (BedViewSet, PatientAdmissionViewSet,
                    PatientDischargeViewset, WardNurseAssignmentViewSet,
                    WardViewSet, DownloadDischargeSummaryView)

app_name = 'inpatient'

router = DefaultRouter()
router.register(r"patient-admissions", PatientAdmissionViewSet, basename="patient-admission")
router.register(r"wards", WardViewSet, basename="ward")
router.register(r"beds", BedViewSet, basename="bed")
router.register(r"ward-nurse-assignments", WardNurseAssignmentViewSet, basename="wardnurseassignment")

admissions_url = NestedDefaultRouter(router, "patient-admissions", lookup="admission")
admissions_url.register(r"discharge", PatientDischargeViewset, basename="discharge")
wards_url = NestedDefaultRouter(router, "wards", lookup="ward")
wards_url.register(r"beds", BedViewSet, basename="ward-bed")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(admissions_url.urls)),
    path("", include(wards_url.urls)),
    path("discharge-summary/<str:admission_id>/", DownloadDischargeSummaryView.as_view(), name="download-discharge-summary-by-admission"),
]