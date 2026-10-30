from django.contrib import admin
from .models import Company, CompanyBranch, InsuranceCompany

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'facility_type']
admin.site.register(CompanyBranch)


@admin.register(InsuranceCompany)
class InsuranceCompanyAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']
