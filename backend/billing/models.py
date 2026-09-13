from django.core.exceptions import ValidationError as DjangoValidationError
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
        ('mobile_money', 'Mobile Money'),
        ('bank_transfer', 'Bank Transfer'),
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

    def save(self, *args, **kwargs):
        """Only one payment mode can be the default at a time."""
        super().save(*args, **kwargs)
        if self.is_default:
            PaymentMode.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)

    @classmethod
    def get_default(cls):
        """
        The payment mode to bill against when no insurance is chosen.

        Falls back through: the flagged default -> any cash mode -> nothing.
        A Cash mode is seeded by migration, so the first branch normally wins.
        """
        return (
            cls.objects.filter(is_default=True).first()
            or cls.objects.filter(payment_category='cash').order_by('id').first()
        )

    def __str__(self):
        return self.payment_category + ' - ' + (self.payment_mode or '')




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
        """
        Roll the lines up.

        `invoice_amount` sums `actual_total`, which is what is receivable from
        whichever party each line is billed to -- the insurer on an insurance
        line, the patient on a cash one. A patient co-pay on an insurance line
        is therefore NOT in here; `patient_due` is where that lives.
        """
        if self.pk:
            self.invoice_amount = self.invoice_items.aggregate(
                total_amount=Sum('actual_total')
            )['total_amount'] or 0

            # Cash lines only, which for those is the whole line.
            self.total_cash = self.invoice_items.filter(
                payment_mode__payment_category='cash'
            ).aggregate(
                total_cash=Sum('actual_total')
            )['total_cash'] or 0

    @property
    def patient_due(self):
        """
        Everything the patient owes across this invoice: cash lines in full,
        plus the co-pay on every insurance line.
        """
        if not self.pk:
            return 0
        return self.invoice_items.aggregate(
            total=Sum('patient_amount')
        )['total'] or 0

    @property
    def gross_total(self):
        """What the invoice is worth in total, whoever ends up paying."""
        if not self.pk:
            return 0
        return self.invoice_items.aggregate(
            total=Sum('item_amount')
        )['total'] or 0

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
    # quantity is in the item's base units — e.g. 20 tablets, not 1 box of 20
    quantity = models.PositiveIntegerField(default=1)
    # What one base unit was charged at, captured when the line was billed.
    # Without this the line re-prices itself from today's price list on every
    # save, which is exactly what effective-dated pricing exists to prevent.
    unit_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Price of ONE base unit, frozen at the moment the line was billed")
    # The whole line, whoever ends up paying for it: unit_price x quantity.
    item_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Split of item_amount between the two possible payers. A cash line is all
    # patient; an insurance line is the co-pay to the patient and the rest to
    # the insurer. They always add back up to item_amount.
    patient_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="The patient's own share of this line: the co-pay, or the whole thing on a cash line")
    # What is receivable from the party this line is billed TO -- the insurer on
    # an insurance line, the patient on any other. This is the figure the
    # payment allocator and the insurance receivables screen both work in.
    actual_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='pending')
    source_tag = models.ForeignKey(
        'inventory.Department', on_delete=models.SET_NULL, null=True, blank=True, 
        help_text="Used for departmental revenue tracking (e.g. Lab, Pharmacy, Main)"
    )

    @property
    def sale_price(self):
        """
        What one base unit of this line was charged at.

        Answered from the line's own frozen `unit_price` once it has one. A
        billed line must never quote today's price: re-reading the price list
        means an invoice raised last month silently restates itself the next
        time anything touches the row.
        """
        if self.unit_price is not None:
            return self.unit_price
        return self.item.current_sale_price or 0

    @property
    def insurer_amount(self):
        """The payer's share -- zero on a cash line."""
        return (self.item_amount or 0) - (self.patient_amount or 0)

    @property
    def is_priced(self):
        """Whether this line has been pinned to a price."""
        return self.unit_price is not None
    
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
        Work out what this line costs and who owes which part of it.

        One writer, one set of rules. The amounts used to be computed here,
        overwritten by `InvoiceItem.save()`, then overwritten again by a
        pre_save signal using the opposite convention -- so an insurance line
        ended up billed at the insurer price MINUS the co-pay, and the hospital
        under-charged every insurer by exactly the patient contribution.

        Conventions every consumer can now rely on:

          unit_price      what one base unit is charged at, all payers together
          item_amount     unit_price x quantity -- the whole line
          patient_amount  the patient own share: the co-pay, or all of it
          actual_total    receivable from whoever the line is billed TO -- the
                          insurer on an insurance line, the patient on any
                          other. patient_amount + insurer_amount == item_amount

        An insurance price is a split, not a discount: `sale_price` is the
        insurer portion and `co_pay` the patient portion, so the line is worth
        the two added together.
        """
        InsuranceItemSalePrice = apps.get_model('inventory', 'InsuranceItemSalePrice')

        qty = self.quantity or 1
        cash_price = self.item.current_sale_price or 0

        insured = (
            self.payment_mode
            and self.payment_mode.payment_category == 'insurance'
            and self.payment_mode.insurance_id
        )

        if insured:
            ins_price = InsuranceItemSalePrice.objects.filter(
                item=self.item,
                insurance_company_id=self.payment_mode.insurance_id,
            ).first()

            if ins_price:
                insurer_unit = ins_price.sale_price or 0
                patient_unit = ins_price.co_pay or 0
                unit_price = insurer_unit + patient_unit
                return {
                    'unit_price': unit_price,
                    'item_amount': unit_price * qty,
                    'patient_amount': patient_unit * qty,
                    'actual_total': insurer_unit * qty,
                    'price_source': 'insurance',
                }

            # Insurance selected but nothing configured for this item. Bill the
            # cash price to the patient rather than quietly sending an insurer
            # a figure nobody agreed to.
            return {
                'unit_price': cash_price,
                'item_amount': cash_price * qty,
                'patient_amount': cash_price * qty,
                'actual_total': cash_price * qty,
                'price_source': 'cash_fallback',
            }

        return {
            'unit_price': cash_price,
            'item_amount': cash_price * qty,
            'patient_amount': cash_price * qty,
            'actual_total': cash_price * qty,
            'price_source': 'cash',
        }

    def save(self, *args, **kwargs):
        """
        Persist the line, pricing it at the moment of sale and not again.

        A line is raised when a doctor orders something and billed later at the
        till, so it follows the price list right up to and including the save
        that bills it -- that save is the sale, and the price then is the price
        charged. Every save after that leaves the money alone.

        This is what the effective-dated price list was always for, and what a
        `save()` that re-read today's price on every write quietly defeated: a
        status change, a stock posting or any signal firing was enough to
        restate an invoice raised weeks earlier.
        """
        # No payment mode chosen means no insurance was selected, so the line is
        # billed as cash against the default Cash payment mode.
        if self.payment_mode_id is None:
            self.payment_mode = PaymentMode.get_default()

        banked = None
        if self.pk:
            banked = type(self).objects.filter(pk=self.pk).values(
                'status', 'quantity').first()
        already_sold = bool(banked and banked['status'] == 'billed')

        if not already_sold:
            pricing = self.get_pricing_for_item()
            self.unit_price = pricing['unit_price']
            self.item_amount = pricing['item_amount']
            self.patient_amount = pricing['patient_amount']
            self.actual_total = pricing['actual_total']
        elif banked['quantity'] != self.quantity:
            # A billed line is a sold thing. Changing how many were sold would
            # leave the stored totals describing a different sale from the one
            # the stock ledger posted and the patient was quoted. Reverse it and
            # raise a new line instead -- that leaves a trail; editing in place
            # does not.
            raise DjangoValidationError(
                f"{self.item.name} has already been billed at a quantity of "
                f"{banked['quantity']}. Reverse the line and raise a new one "
                f"rather than changing the quantity on a sold line."
            )

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
    sub_account = models.ForeignKey('SubAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='receipts')
    payment_mode = models.ForeignKey(PaymentMode, on_delete=models.PROTECT, null=True, blank=True)
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


class MainAccount(models.Model):
    """
    The 'Parent' accounts: e.g., Cash, Petty Cash, Bank, Mobile Money.
    Summarizes the total liquidity across all departments.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def total_balance(self):
        # Dynamically calculate total balance from all sub-accounts
        return sum(sub.balance for sub in self.subaccounts.all())


class SubAccount(models.Model):
    main_account = models.ForeignKey(MainAccount, on_delete=models.CASCADE, related_name='subaccounts')
    payment_mode = models.ForeignKey('PaymentMode', on_delete=models.SET_NULL, null=True, blank=True, related_name='sub_accounts')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    opening_bal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    min_bal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    max_bal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    min_trans = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    max_trans = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.main_account.name})"

    @property
    def balance(self):
        from django.db.models import Sum
        received = self.receipts.aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        paid_out = self.supplier_receipts.aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        return self.opening_bal + received - paid_out
