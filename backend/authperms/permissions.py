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
class IsStaffUser(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return bool(request.user and request.user.is_staff)
    

class IsDoctorUser(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return bool(request.user and request.user.is_staff and request.user.role == Doctor.BASE_ROLE)


class IsNurseUser(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return bool(request.user and request.user.is_staff and request.user.role == Nurse.BASE_ROLE)

class IsSeniorNurseUser(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return bool(request.user and request.user.is_staff and request.user.role == Nurse.SENIOR_NURSE)


class IsLabTechUser(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return bool(request.user and request.user.is_staff and request.user.role == LabTech.BASE_ROLE)


class IsSystemsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            (request.user and request.user.is_staff and request.user.role == CustomUser.BASE_ROLE) or
            (request.user and request.user.is_staff and request.user.is_superuser))

class IsPatientUser(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return bool(request.user and request.user.role == CustomUser.BASE_ROLE)


class IsReceptionistUser(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        return bool(request.user and request.user.is_staff and request.user.role == Receptionist.BASE_ROLE)
