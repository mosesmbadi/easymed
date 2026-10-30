from django.db import models
from billing.models import PaymentMode
from django.core.validators import FileExtensionValidator

class Company(models.Model):
    name = models.CharField(max_length=250)
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