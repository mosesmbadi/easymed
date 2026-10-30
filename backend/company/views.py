from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Company, CompanyBranch, InsuranceCompany
from .serializers import (
    CompanySerializer, CompanyBranchSerializer, InsuranceCompanySerializer, FacilitySerializer)
from authperms.permissions import IsSystemsAdminUser, IsNurseUser


class FacilityView(APIView):
    """
    The facility type and the modules it switches off.

    Separate from CompanyViewSets because every signed-in user needs this to
    draw the sidebar, while the company record itself is admin-only.
    """

    def get(self, request):
        company = Company.current()
        if company is None:
            return Response({'facility_type': Company.FacilityType.HOSPITAL, 'disabled_modules': []})
        return Response(FacilitySerializer(company).data)


class CompanyViewSets(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = (IsSystemsAdminUser, IsNurseUser)

class CompanyBranchViewSets(viewsets.ModelViewSet):
    queryset = CompanyBranch.objects.all()
    serializer_class = CompanyBranchSerializer

class InsuranceCompanyViewSet(viewsets.ModelViewSet):
    """Credit accounts. ?account_type=insurer|corporate|facility narrows the list."""
    queryset = InsuranceCompany.objects.all().order_by('name')
    serializer_class = InsuranceCompanySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        account_type = self.request.query_params.get('account_type')
        if account_type:
            queryset = queryset.filter(account_type=account_type)
        return queryset