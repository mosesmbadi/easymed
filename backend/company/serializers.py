from rest_framework import serializers

from .models import MODULE_LABELS, Company, CompanyBranch, InsuranceCompany


class FacilityProfileSerializer(serializers.ModelSerializer):
    """
    The facility running this deployment, as its own admin edits it. Which
    modules it has is set by the platform (Django admin), so read-only here.
    """
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'address1', 'address2', 'phone1', 'phone2', 'email1', 'email2',
            'patient_id_prefix', 'kra_pin', 'logo', 'facility_type', 'enabled_modules',
        ]
        read_only_fields = ['id', 'facility_type', 'enabled_modules']


class FacilitySerializer(serializers.ModelSerializer):
    """What every signed-in user needs to know to draw the right menus."""
    disabled_modules = serializers.ListField(child=serializers.CharField(), read_only=True)
    module_labels = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = ['facility_type', 'enabled_modules', 'disabled_modules', 'module_labels']

    def get_module_labels(self, obj):
        return MODULE_LABELS


class CompanyBranchSerializer(serializers.ModelSerializer):
    class Meta:
        model= CompanyBranch
        fields = '__all__'
        # A branch is always one of this facility's.
        read_only_fields = ['company']


class InsuranceCompanySerializer(serializers.ModelSerializer):
    account_type_display = serializers.CharField(
        source='get_account_type_display', read_only=True)

    class Meta:
        model = InsuranceCompany
        fields = '__all__'
