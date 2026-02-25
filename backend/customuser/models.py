from uuid import uuid4
from datetime import datetime
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from django.contrib.auth.models import BaseUserManager
from django.conf import settings

from authperms.models import Group, Permission

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, role=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, role=role, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", CustomUser.SYS_ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        if extra_fields.get("role") is not CustomUser.SYS_ADMIN:
            raise ValueError("Superuser must have role as SYS ADMIN")

        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    PATIENT = 'patient'
    DOCTOR = 'doctor'
    NURSE = 'nurse'
    SENIOR_NURSE = 'senior_nurse'
    LAB_TECH = 'labtech'
    PHARMACIST = 'pharmacist'
    RECEPTIONIST = 'receptionist'
    SYS_ADMIN = 'sysadmin'

    BASE_ROLE = PATIENT

    ROLE_CHOICES = (
        (PATIENT, 'Patient'),
        (DOCTOR, 'Doctor'),
        (NURSE, 'Nurse'),
        (SENIOR_NURSE, 'Senior Nurse'),
        (LAB_TECH, 'Lab Technician'),
        (PHARMACIST, 'Pharmacist'),
        (RECEPTIONIST, 'Receptionist'),
        (SYS_ADMIN, 'Sysadmin'),
    )

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30, null=True, blank=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    # TODO:make this a foreign key of occupation model
    profession = models.CharField(max_length=50, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default=BASE_ROLE)
    signature = models.ImageField(upload_to='signatures/', null=True, blank=True)
    user_permissions = models.ManyToManyField(
        Permission,
        blank=True,
        related_name='custom_users_permissions',
    )

    group = models.ForeignKey(Group, on_delete=models.CASCADE, blank=True, related_name='custom_users', null=True)

    groups = None

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        return f"{self.id} - {self.email} - {self.role} - {self.first_name} - {self.last_name} - Group: {self.group}"
    
    @property
    def age(self):
        if self.date_of_birth:
            today = datetime.today()
            user_age: int = (today.year - self.date_of_birth.year - (
                (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)))
            return user_age
        return None

    def save(self, *args, **kwargs):
        if self.role is not CustomUser.PATIENT:
            self.is_staff = True
        super().save(*args, **kwargs)

    def get_fullname(self):
        fullname = ""
        if self.first_name:
            fullname += self.first_name + " "
        if self.last_name:
            fullname += self.last_name

        return fullname


class DoctorProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)

    # Add doctor-specific fields here


class NurseProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    # Add nurse-specific fields here


class SysadminProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)

    def __str__(self):
        return self.user.email


class LabTechProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)

    def __str__(self):
        return self.user.email


class ReceptionistProfile(models.Model):
    id = models.UUIDField(default=uuid4, editable=False,
                          unique=True, primary_key=True)
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)

    def __str__(self):
        return self.user.email


class PharmacistProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)

    def __str__(self):
        return self.user.email


class ReceptionistManager(BaseUserManager):
    def get_queryset(self, *args, **kwargs):
        users = super().get_queryset(*args, **kwargs)
        return users.filter(role=CustomUser.RECEPTIONIST)


class Receptionist(CustomUser):
    class Meta:
        proxy = True

    objects = ReceptionistManager()
    BASE_ROLE = CustomUser.RECEPTIONIST


'''Why do we need a DoctorManager?
Separating query-related logic into a manager (like DoctorManager)
keeps the Doctor model focused solely on defining what a doctor
is, not how to retrieve doctors.'''
class DoctorManager(BaseUserManager):
    def get_queryset(self, *args, **kwargs):
        users = super().get_queryset(*args, **kwargs)
        return users.filter(role=CustomUser.DOCTOR)


class Doctor(CustomUser):
    '''Proxy model. No new table created'''
    class Meta:
        proxy = True

    objects = DoctorManager()
    BASE_ROLE = CustomUser.DOCTOR


class NurseManager(BaseUserManager):
    def get_queryset(self, *args, **kwargs):
        users = super().get_queryset(*args, **kwargs)
        return users.filter(role=CustomUser.NURSE)


class Nurse(CustomUser):
    class Meta:
        proxy = True

    objects = NurseManager()
    BASE_ROLE = CustomUser.NURSE


class LabTechManager(BaseUserManager):
    def get_queryset(self, *args, **kwargs):
        users = super().get_queryset(*args, **kwargs)
        return users.filter(role=CustomUser.LAB_TECH)


class LabTech(CustomUser):
    class Meta:
        proxy = True

    objects = LabTechManager()
    BASE_ROLE = CustomUser.LAB_TECH


class PharmacistManager(BaseUserManager):
    def get_queryset(self, *args, **kwargs):
        users = super().get_queryset(*args, **kwargs)
        return users.filter(role=CustomUser.PHARMACIST)


class Pharmacist(CustomUser):
    class Meta:
        proxy = True

    objects = PharmacistManager()
    BASE_ROLE = CustomUser.PHARMACIST


class PatientManager(BaseUserManager):
    def get_queryset(self, *args, **kwargs):
        users = super().get_queryset(*args, **kwargs)
        return users.filter(role=CustomUser.PATIENT)


class PatientUser(CustomUser):
    class Meta:
        proxy = True

    objects = PatientManager()
    BASE_ROLE = CustomUser.PATIENT

class PasswordReset(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Reset token for {self.user.email}"

class PasswordHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    password_hash = models.CharField(max_length=128)  
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp'] 
