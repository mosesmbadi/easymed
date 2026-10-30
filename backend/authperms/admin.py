from django.contrib import admin
from django.contrib.auth.models import Group as GroupAdmin

# models
from .models import Group, Permission

# Register your models here.

admin.site.unregister(GroupAdmin)

class GroupAdmin(admin.ModelAdmin):
    pass


admin.site.register(Group, GroupAdmin)


class PermissionAdmin(admin.ModelAdmin):
    pass


admin.site.register(Permission, PermissionAdmin)
