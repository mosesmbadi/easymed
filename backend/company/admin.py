from django import forms
from django.contrib import admin
from .models import MODULE_LABELS, SWITCHABLE_MODULES, Company, CompanyBranch, InsuranceCompany


class CompanyAdminForm(forms.ModelForm):
    enabled_modules = forms.MultipleChoiceField(
        choices=[(m, MODULE_LABELS[m]) for m in SWITCHABLE_MODULES],
        widget=forms.CheckboxSelectMultiple, required=False,
        help_text="Only used when the facility type is Custom; the other types set these.")

    class Meta:
        model = Company
        fields = '__all__'


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    """The facility running this deployment. There is one, so no adding a second."""
    form = CompanyAdminForm
    list_display = ['name', 'facility_type', 'enabled_modules']

    def has_add_permission(self, request):
        return not Company.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(CompanyBranch)


@admin.register(InsuranceCompany)
class InsuranceCompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'account_type', 'contact_person', 'email', 'phone']
    list_filter = ['account_type']
    search_fields = ['name']
