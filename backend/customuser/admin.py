from django.contrib import admin
from django.contrib import admin
from .models import (
    CustomUser,
    DoctorProfile,
    NurseProfile,
    SysadminProfile,
    LabTechProfile,
    PharmacistProfile,
    ReceptionistProfile,
)


class CustomUserAdmin(admin.ModelAdmin):
    # Someone who leaves is deactivated (is_active), not deleted.
    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(CustomUser, CustomUserAdmin)


class DoctorProfileAdmin(admin.ModelAdmin):
    pass


admin.site.register(DoctorProfile, DoctorProfileAdmin)


class NurseProfileAdmin(admin.ModelAdmin):
    pass


admin.site.register(NurseProfile, NurseProfileAdmin)


class SysAdminProfileAdmin(admin.ModelAdmin):
    pass


admin.site.register(SysadminProfile, SysAdminProfileAdmin)


class LabTechProfileAdmin(admin.ModelAdmin):
    pass


admin.site.register(LabTechProfile)


class PharmacistProfileAdmin(admin.ModelAdmin):
    pass


admin.site.register(PharmacistProfile, PharmacistProfileAdmin)


class ReceptionistProfileAdmin(admin.ModelAdmin):
    pass

admin.site.register(ReceptionistProfile, ReceptionistProfileAdmin)