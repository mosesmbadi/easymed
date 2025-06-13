from django.db import models, transaction
from django.db.models import Sum
from django.apps import apps
from django.utils import timezone



def invoice_file_path(instance, filename):
    return f'invoices/{instance.invoice_number}/{filename}'


class PaymentMode(models.Model):
    '''
    For total_cash under Invoice to work,
    Cash PaymentMode.payment_category should be cash
    '''
    PAYMENT_CATEGORY_CHOICES = (
        ('cash', 'Cash'),
        ('insurance', 'Insurance'),
        ('mpesa', 'MPesa'),
    )
    paymet_mode = models.CharField(max_length=100, blank=True, null=True, default='cash')
    insurance = models.ForeignKey(
            'company.InsuranceCompany',
            null=True,
            blank=True,
            on_delete=models.CASCADE
            )
    payment_category = models.CharField(
        max_length=20, choices=PAYMENT_CATEGORY_CHOICES, default='cash')
    
    def __str__(self):
        return self.payment_category + ' - ' + self.paymet_mode


class Invoice(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
    )
    patient = models.ForeignKey('patient.Patient', on_delete=models.SET_NULL, null=True)
    invoice_number = models.CharField(max_length=50, null=True)
    invoice_date = models.DateField(null=True)
    invoice_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='pending')
    invoice_description = models.CharField(max_length=200, null=True, blank=True)
    invoice_file = models.FileField(upload_to=invoice_file_path, null=True, blank=True)
    invoice_created_at = models.DateTimeField(auto_now_add=True)
    invoice_updated_at = models.DateTimeField(auto_now=True)
    # get total amount with Payment Mode "Cash"
    total_cash = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
    
    # TODO: Signal to update  cash_paid once InvoicePayments is updated
    cash_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)

    def calculate_invoice_totals(self):
        if self.pk:
            # Calculate total invoice amount
            self.invoice_amount = self.invoice_items.aggregate(
                total_amount=Sum('actual_total')
            )['total_amount'] or 0
            
            # Calculate total cash amount
            self.total_cash = self.invoice_items.filter(
                payment_mode__payment_category='cash'
            ).aggregate(
                total_cash=Sum('actual_total')
            )['total_cash'] or 0

    def generate_invoice_number(self):
        """Generates a unique invoice number.

        The format is DDLIXXXXX-YYYY, where XXXXX is a 5-digit sequential
        number and YYYY is the current year. The sequence resets to 00001
        at the beginning of each year.
        """
        if not self.pk:
            prefix = "DDLI"
            current_year = timezone.now().year

            with transaction.atomic():
                last_invoice = Invoice.objects.filter(
                    invoice_number__startswith=prefix
                    ).order_by('-invoice_number').select_for_update().first()
                    
                if last_invoice:
                    try:
                        last_invoice_year = int(last_invoice.invoice_number.split('-')[1])
                        if last_invoice_year == current_year:
                            last_invoice_number = int(last_invoice.invoice_number[4:9])
                            next_invoice_number = last_invoice_number + 1
                        else:
                            next_invoice_number = 1 
                    except (IndexError, ValueError):
                        next_invoice_number = 1
                else:
                    next_invoice_number = 1
                
                invoice_number = f"{prefix}{next_invoice_number:05d}-{current_year}"
                return invoice_number
        return None

    def save(self, *args, **kwargs):
        self.calculate_invoice_totals()

        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} - {self.invoice_date} - {self.invoice_amount} - {self.patient.first_name}"


class InvoicePayment(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE)
    payment_mode = models.ForeignKey(PaymentMode, on_delete=models.PROTECT, null=True)
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_date = models.DateField(null=True)
    payment_created_at = models.DateTimeField(auto_now_add=True)
    payment_updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.invoice.invoice_number
    
    
class InvoiceItem(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('billed', 'Billed'),
    )
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='invoice_items')
    item = models.ForeignKey('inventory.Item', on_delete=models.CASCADE)
    item_created_at = models.DateTimeField(auto_now_add=True)
    item_updated_at = models.DateTimeField(auto_now=True)
    payment_mode = models.ForeignKey(PaymentMode, on_delete=models.PROTECT, null=True)
    item_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # amount after co-pay is deducted
    actual_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='pending')

    @property
    def sale_price(self):
        Inventory = apps.get_model('inventory', 'Inventory') 
        inventory = Inventory.objects.filter(item=self.item).first()
        if inventory:
            return inventory.sale_price
        return 0
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def __str__(self):
        return self.item.name + ' - ' + str(self.item_created_at)
