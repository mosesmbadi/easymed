from rest_framework.permissions import BasePermission

# models
from customuser.models import (
    CustomUser,
    Doctor,
    Nurse,
    LabTech,
    Receptionist
)


'''
Permissions will be imported into views like so
permission_classes = (IsDoctorUser | IsNurseUser | IsLabTechUser,)
'''
def is_admin(user):
    """A superuser or sysadmin passes every role check; the menu shows them everything too."""
    return user.is_superuser or getattr(user, 'role', None) == CustomUser.SYS_ADMIN


def HasAnyNamedPermission(*names):
    """
    Permission class requiring one of the named permissions (the same names the
    frontend menu checks, e.g. CAN_ACCESS_LABORATORY_DASHBOARD) via the user's
    group.
    """
    class _HasAnyNamedPermission(BasePermission):
        def has_permission(self, request, view):
            user = request.user
            if not (user and user.is_authenticated):
                return False
            if user.is_superuser:
                return True
            return bool(user.group_id and user.group.permissions.filter(name__in=names).exists())

    return _HasAnyNamedPermission


class IsStaffUser(BasePermission):
    def has_permission(self, request, view):
        if is_admin(request.user):
            return True
        return bool(request.user and request.user.is_staff)
    

class IsDoctorUser(BasePermission):
    def has_permission(self, request, view):
        if is_admin(request.user):
            return True
        return bool(request.user and request.user.is_staff and request.user.role == Doctor.BASE_ROLE)


class IsNurseUser(BasePermission):
    def has_permission(self, request, view):
        if is_admin(request.user):
            return True
        return bool(request.user and request.user.is_staff and request.user.role == Nurse.BASE_ROLE)

class IsSeniorNurseUser(BasePermission):
    def has_permission(self, request, view):
        if is_admin(request.user):
            return True
        return bool(request.user and request.user.is_staff and request.user.role == Nurse.SENIOR_NURSE)


class IsLabTechUser(BasePermission):
    def has_permission(self, request, view):
        if is_admin(request.user):
            return True
        return bool(request.user and request.user.is_staff and request.user.role == LabTech.BASE_ROLE)


class IsSystemsAdminUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return bool(user.is_superuser or user.role == CustomUser.SYS_ADMIN)

class IsPatientUser(BasePermission):
    def has_permission(self, request, view):
        if is_admin(request.user):
            return True
        return bool(request.user and request.user.role == CustomUser.BASE_ROLE)


class IsReceptionistUser(BasePermission):
    def has_permission(self, request, view):
        if is_admin(request.user):
            return True
        return bool(request.user and request.user.is_staff and request.user.role == Receptionist.BASE_ROLE)
