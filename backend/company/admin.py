from django.contrib import admin
from .models import Company, CompanyBranch, InsuranceCompany

admin.site.register(Company)
admin.site.register(CompanyBranch)


@admin.register(InsuranceCompany)
class InsuranceCompanyAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']
