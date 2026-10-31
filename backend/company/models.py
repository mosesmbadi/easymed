from django.core.exceptions import ValidationError
from django.db import models
from billing.models import PaymentMode
from django.core.validators import FileExtensionValidator

# Modules a facility can have switched off. Everything else -- patients, lab,
# pharmacy, billing, finance, inventory, reports -- every facility has.
SWITCHABLE_MODULES = ('reception', 'triage', 'doctor', 'inpatient', 'radiology')
MODULE_LABELS = {
    'reception': 'Check-in (reception)',
    'triage': 'Nursing station (triage)',
    'doctor': "Doctor's desk",
    'inpatient': 'In-patient wards',
    'radiology': 'Radiology',
}


def all_modules():
    return list(SWITCHABLE_MODULES)


class Company(models.Model):
    """
    The facility running this deployment -- the one tenant it serves.

    There is exactly one. Other organisations the facility deals with are not
    companies here: an insurer, an employer or a clinic that sends samples is
    a credit account (InsuranceCompany), and a supplier is a Supplier.

    Two kinds of field live here. The profile -- name, addresses, logo for
    reports, patient number prefix, KRA PIN -- the facility edits itself. Which
    modules it has is set by the platform when it is onboarded, and is
    read-only through the API.
    """
    class FacilityType(models.TextChoices):
        HOSPITAL = 'hospital', 'Hospital'
        STANDALONE_LAB = 'standalone_lab', 'Standalone Lab'
        CUSTOM = 'custom', 'Custom'

    # What each preset switches on. CUSTOM keeps whatever enabled_modules holds.
    MODULE_PRESETS = {
        FacilityType.HOSPITAL: SWITCHABLE_MODULES,
        FacilityType.STANDALONE_LAB: (),
    }

    name = models.CharField(max_length=250)
    facility_type = models.CharField(
        max_length=30, choices=FacilityType.choices, default=FacilityType.HOSPITAL,
        help_text="A preset for the modules below: Hospital has them all, Standalone Lab "
                  "none of them. Choose Custom to pick them yourself, e.g. a lab that also "
                  "does imaging.")
    enabled_modules = models.JSONField(
        default=all_modules, blank=True,
        help_text="Switchable modules this facility has. Set from the facility type "
                  "unless that is Custom.")
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
    kra_pin = models.CharField(
        max_length=20, blank=True, default='',
        help_text="The facility's KRA PIN, printed on invoices and sent to eTIMS.")
    logo = models.FileField(
        upload_to="Company/company-logo",
        max_length=254,
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'img', 'png', 'jpg'])]
    )

    class Meta:
        verbose_name = "facility profile"
        verbose_name_plural = "facility profile"

    def clean(self):
        unknown = set(self.enabled_modules or ()) - set(SWITCHABLE_MODULES)
        if unknown:
            raise ValidationError({'enabled_modules': f"Unknown modules: {', '.join(sorted(unknown))}"})

    def save(self, *args, **kwargs):
        if self._state.adding and type(self).objects.exists():
            raise ValidationError(
                "This deployment already has its facility profile; edit that one. "
                "Insurers, employers and referring clinics are credit accounts.")
        # A save naming only the facility type must carry the modules it sets.
        update_fields = kwargs.get('update_fields')
        if update_fields is not None and 'facility_type' in update_fields:
            kwargs['update_fields'] = set(update_fields) | {'enabled_modules'}
        preset = self.MODULE_PRESETS.get(self.facility_type)
        if preset is not None:
            self.enabled_modules = list(preset)
        else:
            # Keep the catalogue's order, and nothing it doesn't know.
            chosen = set(self.enabled_modules or ())
            self.enabled_modules = [m for m in SWITCHABLE_MODULES if m in chosen]
        super().save(*args, **kwargs)

    @property
    def disabled_modules(self):
        enabled = set(self.enabled_modules or ())
        return tuple(m for m in SWITCHABLE_MODULES if m not in enabled)

    def module_enabled(self, module):
        return module not in self.disabled_modules

    @classmethod
    def current(cls):
        """The facility this deployment serves, or None before it is set up."""
        return cls.objects.order_by('pk').first()

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
    """
    A credit account: someone other than the patient who is billed for the
    patient's care, at prices agreed with them, and settles later.

    An insurer was the first kind, hence the name. An employer that pays for
    its staff and a facility that sends samples in are billed the same way --
    their own payment mode, their own price list, lines receivable from them,
    settled by receipts against them -- so they are the same model.
    """
    class AccountType(models.TextChoices):
        INSURER = 'insurer', 'Insurer'
        CORPORATE = 'corporate', 'Corporate client'
        FACILITY = 'facility', 'Referring facility'

    name = models.CharField(max_length=150)
    account_type = models.CharField(
        max_length=20, choices=AccountType.choices, default=AccountType.INSURER)
    contact_person = models.CharField(max_length=150, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    phone = models.CharField(max_length=30, blank=True, default='')
    address = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        verbose_name = "Credit account"
        verbose_name_plural = "Credit accounts"

    @property
    def bills_list_price_when_unagreed(self):
        """
        Whether a line with no agreed price goes to the account at the cash
        price. An insurer only pays what it agreed to, so there the patient
        pays instead; an employer or a referring facility has signed up to the
        price list unless it negotiated otherwise.
        """
        return self.account_type != self.AccountType.INSURER

    @property
    def bills_on_account(self):
        """
        Whether a line billed to this account is a sale the moment it is
        raised -- no stop at the till, the account settles monthly. An
        insurer's lines still wait for the cashier, who checks cover first.
        """
        return self.account_type in (self.AccountType.CORPORATE, self.AccountType.FACILITY)

    def save(self, *args, **kwargs):
        created = not self.pk
        super().save(*args, **kwargs)
        # The payment mode is how a line is billed to the account; the
        # category stays 'insurance' for every kind, since pricing and
        # receivables key on it.
        if created:
            PaymentMode.objects.create(
                payment_mode=self.name,
                insurance=self,
                payment_category='insurance'
            )
        else:
            PaymentMode.objects.filter(insurance=self).update(payment_mode=self.name)

    def delete(self, *args, **kwargs):
        PaymentMode.objects.filter(insurance=self).delete()
        super().delete(*args, **kwargs)

    def __str__(self):
        return self.name