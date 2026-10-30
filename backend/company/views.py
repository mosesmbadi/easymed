from django.shortcuts import render
from rest_framework import viewsets
from .models import Company, CompanyBranch, InsuranceCompany
from .serializers import CompanySerializer, CompanyBranchSerializer, InsuranceCompanySerializer
from authperms.permissions import IsSystemsAdminUser, IsNurseUser


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