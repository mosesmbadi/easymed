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
    queryset = InsuranceCompany.objects.all()
    serializer_class = InsuranceCompanySerializer