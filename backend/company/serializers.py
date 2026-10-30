from rest_framework import serializers

from .models import Company, CompanyBranch, InsuranceCompany

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'
        # Which modules a tenant has is the platform's to set (Django admin),
        # not something the tenant's own admin can switch from settings.
        read_only_fields = ['facility_type']


class FacilitySerializer(serializers.ModelSerializer):
    """What every signed-in user needs to know to draw the right menus."""
    disabled_modules = serializers.ListField(child=serializers.CharField(), read_only=True)

    class Meta:
        model = Company
        fields = ['facility_type', 'disabled_modules']

class CompanyBranchSerializer(serializers.ModelSerializer):
    class Meta:
        model= CompanyBranch
        fields = '__all__'

class InsuranceCompanySerializer(serializers.ModelSerializer):
    account_type_display = serializers.CharField(
        source='get_account_type_display', read_only=True)

    class Meta:
        model = InsuranceCompany
        fields = '__all__'