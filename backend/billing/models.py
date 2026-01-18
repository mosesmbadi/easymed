from django.db import models, transaction
from django.db.models import Sum
from django.apps import apps
from django.utils import timezone



def invoice_file_path(instance, filename):
    return f'invoices/{instance.invoice_number}/{filename}'


class PaymentMode(models.Model):
    '''
    For total_cash under Invoice to work,
    Cash PaymentMode.payment_category should be cash.
    
    is_default: Marks the default payment mode (typically cash) to be used
    when no payment mode is explicitly selected or when patient has no insurance.
    '''
    PAYMENT_CATEGORY_CHOICES = (
        ('cash', 'Cash'),
        ('insurance', 'Insurance'),
        ('mpesa', 'MPesa'),
        ('cheque', 'CHEQUE'),
        ('direct_to_bank', 'DIRECT_TO_BANK')
    )
    payment_mode = models.CharField(max_length=100, blank=True, null=True, default='cash')
    insurance = models.ForeignKey(
            'company.InsuranceCompany',
            null=True,
            blank=True,
            on_delete=models.CASCADE
            )
    payment_category = models.CharField(
        max_length=20, choices=PAYMENT_CATEGORY_CHOICES, default='cash')
    is_default = models.BooleanField(default=False, help_text="Default payment mode for cash payments")
    
    class Meta:
        indexes = [
            models.Index(fields=['payment_category']),
            models.Index(fields=['is_default']),
        ]
    
    def __str__(self):
        return self.payment_category + ' - ' + self.payment_mode




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

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['invoice_date']),
            models.Index(fields=['patient']),  # Also frequently queried
        ]

    def __str__(self):
        return f"{self.invoice_number} - {self.invoice_date} - {self.invoice_amount} - {self.patient.first_name}"


class InvoicePayment(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE)
    payment_mode = models.ForeignKey(PaymentMode, on_delete=models.PROTECT, null=True)
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_date = models.DateField(null=True)
    payment_created_at = models.DateTimeField(auto_now_add=True)
    payment_updated_at = models.DateTimeField(auto_now=True)
    reference_number = models.CharField(max_length=100, null=True, blank=True)

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
        """Return the default cash price for this item from active Inventory.

        Per simplified billing rules, pricing is determined elsewhere based on
        selected PaymentMode. This property intentionally returns only the
        Inventory.sale_price (or 0 if unavailable) for display/fallback uses.
        """
        Inventory = apps.get_model('inventory', 'Inventory')
        inv = Inventory.objects.filter(item=self.item).order_by('-id').first()
        return inv.sale_price if inv and inv.sale_price is not None else 0
    
    @property
    def price_source(self):
        """Return the source of the pricing: 'insurance', 'cash', or 'unknown'."""
        if self.payment_mode and self.payment_mode.payment_category == 'insurance':
            InsuranceItemSalePrice = apps.get_model('inventory', 'InsuranceItemSalePrice')
            if self.payment_mode.insurance_id:
                ins_price = InsuranceItemSalePrice.objects.filter(
                    item=self.item, 
                    insurance_company_id=self.payment_mode.insurance_id
                ).exists()
                return 'insurance' if ins_price else 'cash_fallback'
        elif self.payment_mode:
            return 'cash'
        return 'unknown'
    
    def get_pricing_for_item(self):
        """
        Centralized pricing logic with explicit fallback chain.
        
        Returns a dict with:
        - item_amount: The price to display/bill
        - actual_total: The amount patient pays (after insurance/co-pay)
        - price_source: Where the price came from ('insurance', 'cash', 'cash_fallback')
        """
        Inventory = apps.get_model('inventory', 'Inventory')
        InsuranceItemSalePrice = apps.get_model('inventory', 'InsuranceItemSalePrice')

        # Get base cash price from inventory
        inv = Inventory.objects.filter(item=self.item).order_by('-id').first()
        base_price = inv.sale_price if inv and inv.sale_price is not None else 0

        # If insurance payment mode
        if self.payment_mode and self.payment_mode.payment_category == 'insurance':
            if self.payment_mode.insurance_id:
                ins_price = InsuranceItemSalePrice.objects.filter(
                    item=self.item, 
                    insurance_company_id=self.payment_mode.insurance_id
                ).first()
                
                if ins_price:
                    return {
                        'item_amount': ins_price.sale_price or 0,
                        'actual_total': ins_price.co_pay or 0,
                        'price_source': 'insurance'
                    }
                
                # Insurance selected but no price configured - fallback to cash
                return {
                    'item_amount': base_price,
                    'actual_total': base_price,
                    'price_source': 'cash_fallback'
                }
        
        # Default to cash price (Cash/MPesa/Cheque/Direct-to-bank etc.)
        return {
            'item_amount': base_price,
            'actual_total': base_price,
            'price_source': 'cash'
        }
    
    def save(self, *args, **kwargs):
        """Persist InvoiceItem with amounts derived from centralized pricing logic.

        Uses get_pricing_for_item() to determine prices with explicit fallback chain:
        1. If PaymentMode is insurance and InsuranceItemSalePrice exists: use insurance price
        2. If PaymentMode is insurance but no InsuranceItemSalePrice: fallback to cash price
        3. Otherwise: use Inventory.sale_price (cash price)
        """
        pricing = self.get_pricing_for_item()
        self.item_amount = pricing['item_amount']
        self.actual_total = pricing['actual_total']
        
        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['invoice']),  # Frequently queried
            models.Index(fields=['payment_mode']),  # Used in aggregations
            models.Index(fields=['item_created_at']),  # Used for ordering
        ]

    def __str__(self):
        return self.status + '-' + self.item.name + ' - ' + str(self.item_created_at)


class PaymentReceipt(models.Model):
    """
    Represents a single payment event that may be allocated across multiple invoices/items.
    """
    patient = models.ForeignKey('patient.Patient', on_delete=models.SET_NULL, null=True, blank=True)
    insurance = models.ForeignKey('company.InsuranceCompany', on_delete=models.SET_NULL, null=True, blank=True)
    payment_mode = models.ForeignKey(PaymentMode, on_delete=models.PROTECT)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference_number = models.CharField(max_length=100)
    payment_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['patient']),
            models.Index(fields=['insurance']),
            models.Index(fields=['payment_date']),
        ]

    def __str__(self):
        customer = self.patient or self.insurance or "Unknown"
        return f"Receipt #{self.id} - {customer} - {self.total_amount}"


class PaymentAllocation(models.Model):
    """
    Allocation of part of a PaymentReceipt to a particular InvoiceItem.
    Tracks exact amount applied for reconciliation and reporting.
    """
    receipt = models.ForeignKey(PaymentReceipt, on_delete=models.CASCADE, related_name='allocations')
    invoice_item = models.ForeignKey(InvoiceItem, on_delete=models.CASCADE, related_name='allocations')
    amount_applied = models.DecimalField(max_digits=12, decimal_places=2)
    applied_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['applied_at']),
            models.Index(fields=['invoice_item']),
        ]

    def __str__(self):
        return f"Allocation {self.amount_applied} to {self.invoice_item_id} for receipt {self.receipt_id}"
