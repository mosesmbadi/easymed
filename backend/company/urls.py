from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CompanyViewSets,
    CompanyBranchViewSets,
    InsuranceCompanyViewSet
)

router = DefaultRouter()

router.register(r'company', CompanyViewSets)
router.register(r'company-branch', CompanyBranchViewSets)
router.register(r'insurance-companies', InsuranceCompanyViewSet)


urlpatterns = [
    path('', include(router.urls)),
]