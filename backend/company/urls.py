from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CompanyViewSets,
    CompanyBranchViewSets,
    InsuranceCompanyViewSet,
    FacilityView,
)

router = DefaultRouter()

router.register(r'company', CompanyViewSets)
router.register(r'company-branch', CompanyBranchViewSets)
router.register(r'insurance-companies', InsuranceCompanyViewSet)


urlpatterns = [
    path('facility/', FacilityView.as_view(), name='facility'),
    path('', include(router.urls)),
]