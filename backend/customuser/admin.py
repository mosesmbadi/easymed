from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from authperms.models import Permission
from .models import (
    CustomUser,
    DoctorProfile,
    NurseProfile,
    SysadminProfile,
    LabTechProfile,
    PharmacistProfile,
    ReceptionistProfile,
)


class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = CustomUser
        fields = ('email',)


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = CustomUser
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Django's form joins permissions to content types, which our own
        # Permission model doesn't have.
        if 'user_permissions' in self.fields:
            self.fields['user_permissions'].queryset = Permission.objects.all()


# UserAdmin, unlike a plain ModelAdmin, hashes the password it is given;
# a raw one stored as typed never matches at login.
class CustomUserAdmin(UserAdmin):
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm
    list_display = ('email', 'first_name', 'last_name', 'role', 'group', 'is_active')
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser')
    search_fields = ('email', 'first_name', 'last_name', 'phone')
    ordering = ('-id',)
    filter_horizontal = ('user_permissions',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': (
            'first_name', 'last_name', 'phone', 'date_of_birth',
            'profession', 'registration_number', 'signature')}),
        ('Role and access', {'fields': (
            'role', 'group', 'is_active', 'is_staff', 'is_superuser',
            'can_manage_inventory', 'user_permissions')}),
        ('Dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'first_name', 'last_name', 'role', 'group',
                'password1', 'password2'),
        }),
    )
    actions = ['deactivate']

    # Someone who leaves should be deactivated. Deleting staff who signed
    # records is refused by the database (PROTECT); a patient's login goes
    # without their patient record (SET_NULL).
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    @admin.action(description="Deactivate selected users")
    def deactivate(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f"{count} user(s) deactivated.")


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