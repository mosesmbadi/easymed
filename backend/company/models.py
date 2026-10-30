from django.db import models
from billing.models import PaymentMode
from django.core.validators import FileExtensionValidator

class Company(models.Model):
    class FacilityType(models.TextChoices):
        HOSPITAL = 'hospital', 'Hospital'
        STANDALONE_LAB = 'standalone_lab', 'Standalone Lab'

    # Modules that only make sense where patients are seen clinically. Each
    # facility type switches a set of them off; everything not listed here
    # (patients, lab, pharmacy, billing, finance, inventory, reports) is on
    # everywhere.
    CLINICAL_MODULES = ('reception', 'triage', 'doctor', 'inpatient', 'radiology')
    DISABLED_MODULES = {
        FacilityType.HOSPITAL: (),
        FacilityType.STANDALONE_LAB: CLINICAL_MODULES,
    }

    name = models.CharField(max_length=250)
    # Set by the platform when the tenant is onboarded, not by the tenant: it
    # decides which modules they have. Read-only through the API.
    facility_type = models.CharField(
        max_length=30, choices=FacilityType.choices, default=FacilityType.HOSPITAL,
        help_text="Hospital runs the full patient journey; Standalone Lab hides "
                  "reception check-in, triage, doctor, inpatient and radiology.")
    address1 = models.CharField(max_length=250, null=True, blank=True)
    address2 = models.CharField(max_length=250, null=True, blank=True)
    phone1 = models.CharField(max_length=250, null=True, blank=True)
    phone2 = models.CharField(max_length=250, null=True, blank=True)
    email1 = models.EmailField(null=True, blank=True)
    email2 = models.EmailField(null=True, blank=True)
    patient_id_prefix = models.CharField(
        max_length=20, 
        null=True, 
        blank=True,
        help_text="Prefix for patient IDs (e.g., ESMED-)"
    )
    logo = models.FileField(
        upload_to="Company/company-logo",
        max_length=254,
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'img', 'png', 'jpg'])]
    )

    class Meta:
        verbose_name_plural = "company"

    @property
    def disabled_modules(self):
        return self.DISABLED_MODULES.get(self.facility_type, ())

    def module_enabled(self, module):
        return module not in self.disabled_modules

    @classmethod
    def current(cls):
        """The tenant this deployment serves. There is one Company row per install."""
        return cls.objects.first()

    def __str__(self):
        return self.name


class CompanyBranch(models.Model):
    name = models.CharField(max_length=250)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    address = models.CharField(max_length=250, null=True, blank=True)
    phone = models.CharField(max_length=250, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    logo = models.FileField(
        upload_to="Company/company-logo",
        max_length=254,
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'img', 'png', 'jpg'])]
    )

    class Meta:
        verbose_name_plural = "Company Branch"

    def __str__(self):
        return self.name  


class InsuranceCompany(models.Model):
    name = models.CharField(max_length=30)

    def save(self, *args, **kwargs):
        created = not self.pk
        super().save(*args, **kwargs)
        if created:
            PaymentMode.objects.create(
                payment_mode=self.name,
                insurance=self,
                payment_category='insurance'
            )

    def delete(self, *args, **kwargs):
        PaymentMode.objects.filter(insurance=self).delete()
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.name