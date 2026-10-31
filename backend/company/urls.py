from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CompanyBranchViewSets,
    InsuranceCompanyViewSet,
    FacilityView,
    FacilityProfileView,
)

router = DefaultRouter()

router.register(r'company-branch', CompanyBranchViewSets)
router.register(r'insurance-companies', InsuranceCompanyViewSet)


urlpatterns = [
    path('facility/', FacilityView.as_view(), name='facility'),
    path('profile/', FacilityProfileView.as_view(), name='facility-profile'),
    path('', include(router.urls)),
]
