from rest_framework import serializers

from .models import Company, CompanyBranch, InsuranceCompany

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'

class CompanyBranchSerializer(serializers.ModelSerializer):
    class Meta:
        model= CompanyBranch
        fields = '__all__'

class InsuranceCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceCompany
        fields = '__all__'