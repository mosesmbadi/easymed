from decimal import Decimal

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
    patient = models.ForeignKey('patient.Patient', on_delete=models.PROTECT, null=True)
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
        customer = self.patient or "No patient"
        return f"{self.invoice_number} - {self.invoice_date} - {self.invoice_amount} - {customer}"


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
    item = models.ForeignKey('inventory.Item', on_delete=models.PROTECT)
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
    # What has come off the line since. Discounts come off the patient's share
    # only: a price agreed with an insurer or an employer is not ours to cut.
    # item_amount stays the gross figure, and patient_amount and actual_total
    # are what is left after these.
    discount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Discount given on this line at the till")
    invoice_discount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="This line's share of a discount given on the invoice's total")
    credited_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Taken off by credit notes, patient and payer portions together")
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
        return self.net_amount - (self.patient_amount or 0)

    @property
    def net_amount(self):
        """What the line is worth after discounts and credit notes, whoever pays."""
        return ((self.item_amount or 0) - (self.discount or 0)
                - (self.invoice_discount or 0) - (self.credited_amount or 0))

    @property
    def is_billed_to_patient(self):
        """True when the patient, not an insurer or account, owes `actual_total`."""
        return self.price_source in ('cash', 'cash_fallback', 'unknown')

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
                if ins_price:
                    return 'insurance'
                if self.payment_mode.insurance.bills_list_price_when_unagreed:
                    return 'account_list_price'
                return 'cash_fallback'
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

            # Nothing agreed for this item. An employer or a referring facility
            # pays the price list; see InsuranceCompany.bills_list_price_when_unagreed.
            if self.payment_mode.insurance.bills_list_price_when_unagreed:
                return {
                    'unit_price': cash_price,
                    'item_amount': cash_price * qty,
                    'patient_amount': 0,
                    'actual_total': cash_price * qty,
                    'price_source': 'account_list_price',
                }

            # An insurer: bill the cash price to the patient rather than
            # quietly sending it a figure nobody agreed to.
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
                'status', 'quantity', 'discount', 'invoice_discount').first()
        already_sold = bool(banked and banked['status'] == 'billed')

        self.discount = Decimal(str(self.discount or 0))
        self.invoice_discount = Decimal(str(self.invoice_discount or 0))
        if self.discount < 0:
            raise DjangoValidationError("A discount can't be negative.")

        if not already_sold:
            pricing = self.get_pricing_for_item()
            if self.discount > pricing['patient_amount']:
                raise DjangoValidationError(
                    f"The discount on {self.item.name} is more than the "
                    f"{pricing['patient_amount']} the patient pays for it.")
            self.unit_price = pricing['unit_price']
            self.item_amount = pricing['item_amount']
            self.patient_amount = pricing['patient_amount'] - self.discount
            self.actual_total = pricing['actual_total']
            if pricing['price_source'] in ('cash', 'cash_fallback'):
                self.actual_total -= self.discount
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
        else:
            self._apply_discount_change(banked)

        super().save(*args, **kwargs)

    def _apply_discount_change(self, banked):
        """A discount changed on a sold line moves what the patient owes by the difference."""
        change = (self.discount + self.invoice_discount
                  - banked['discount'] - banked['invoice_discount'])
        if not change:
            return
        paid = self.allocations.filter(receipt__insurance__isnull=True).aggregate(
            total=Sum('amount_applied'))['total'] or 0
        if self.patient_amount - change < paid:
            raise DjangoValidationError(
                f"That discount would take {self.item.name} below the {paid} "
                f"already paid for it. Issue a credit note instead.")
        self.patient_amount -= change
        if self.is_billed_to_patient:
            self.actual_total -= change

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['invoice']),  # Frequently queried
            models.Index(fields=['payment_mode']),  # Used in aggregations
            models.Index(fields=['item_created_at']),  # Used for ordering
        ]

    def __str__(self):
        return self.status + '-' + self.item.name + ' - ' + str(self.item_created_at)


class CreditNote(models.Model):
    """
    A reversal of something already billed: a whole invoice or part of it.

    Issued, never edited. It takes the value off the lines it names, so every
    balance and report that reads a line sees the customer's reduced total.
    """
    credit_note_number = models.CharField(max_length=50, unique=True, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='credit_notes')
    reason = models.CharField(max_length=255)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Value credited that had already been paid, so is now owed back.
    refund_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    issued_by = models.ForeignKey(
        'customuser.CustomUser', on_delete=models.SET_NULL, null=True, blank=True)
    issued_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-issued_at', '-id']

    def save(self, *args, **kwargs):
        if not self.credit_note_number:
            prefix, suffix = "DDLC", f"-{timezone.now().year}"
            last = CreditNote.objects.select_for_update().filter(
                credit_note_number__startswith=prefix, credit_note_number__endswith=suffix,
            ).order_by('-credit_note_number').first()
            number = int(last.credit_note_number[len(prefix):-len(suffix)]) + 1 if last else 1
            self.credit_note_number = f"{prefix}{number:05d}{suffix}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.credit_note_number} on {self.invoice.invoice_number}: {self.total_amount}"


class CreditNoteLine(models.Model):
    """How much one invoice line was credited, and whose debt that reduced."""
    credit_note = models.ForeignKey(CreditNote, on_delete=models.CASCADE, related_name='lines')
    invoice_item = models.ForeignKey(
        InvoiceItem, on_delete=models.PROTECT, related_name='credit_note_lines')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    patient_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payer_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    restocked = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.credit_note.credit_note_number}: {self.amount} on line {self.invoice_item_id}"


class PaymentReceipt(models.Model):
    """
    Represents a single payment event that may be allocated across multiple invoices/items.
    """
    patient = models.ForeignKey('patient.Patient', on_delete=models.PROTECT, null=True, blank=True)
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
        transferred_in = self.transfers_in.aggregate(
            total=Sum('amount')
        )['total'] or 0
        transferred_out = self.transfers_out.aggregate(
            total=Sum('amount')
        )['total'] or 0
        return self.opening_bal + received - paid_out + transferred_in - transferred_out


class AccountTransfer(models.Model):
    """
    Money moved between two of the facility's own accounts: M-Pesa to bank, bank
    to petty cash.

    Never edited or deleted. A mistake is put right by a reversing transfer, so
    the trail shows both what happened and that it was corrected.
    See billing.transfers, which is the only thing that should create these.
    """
    from_account = models.ForeignKey(SubAccount, on_delete=models.PROTECT, related_name='transfers_out')
    to_account = models.ForeignKey(SubAccount, on_delete=models.PROTECT, related_name='transfers_in')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    transfer_date = models.DateField()
    note = models.CharField(max_length=255, blank=True, default='')
    reversal_of = models.OneToOneField(
        'self', on_delete=models.PROTECT, null=True, blank=True, related_name='reversed_by')
    created_by = models.ForeignKey(
        'customuser.CustomUser', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-transfer_date', '-id']
        constraints = [
            models.CheckConstraint(check=models.Q(amount__gt=0), name='account_transfer_amount_positive'),
            models.CheckConstraint(
                check=~models.Q(from_account=models.F('to_account')),
                name='account_transfer_between_different_accounts'),
        ]

    @property
    def reference(self):
        return f"TRF-{self.pk:05d}"

    def __str__(self):
        return f"{self.reference}: {self.amount} from {self.from_account.name} to {self.to_account.name}"


class EtimsSubmission(models.Model):
    """
    An invoice's trip to KRA eTIMS: sent once it is settled, retried until
    KRA answers. Nothing waits on it -- the sale stands whether or not eTIMS
    is configured or reachable -- but an invoice without a signed submission
    is one the facility still owes KRA.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SENT = 'sent', 'Accepted by KRA'
        FAILED = 'failed', 'Failed'

    invoice = models.OneToOneField(Invoice, on_delete=models.CASCADE, related_name='etims')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    attempts = models.PositiveIntegerField(default=0)
    # What KRA's control unit gave back: the receipt number, its signature
    # and the link printed as a QR code on the invoice.
    receipt_number = models.CharField(max_length=50, blank=True, default='')
    receipt_signature = models.CharField(max_length=100, blank=True, default='')
    internal_data = models.CharField(max_length=200, blank=True, default='')
    qr_url = models.URLField(max_length=500, blank=True, default='')
    error = models.TextField(blank=True, default='')
    request_payload = models.JSONField(null=True, blank=True)
    response_payload = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"eTIMS {self.invoice.invoice_number}: {self.get_status_display()}"


class MpesaPaymentRequest(models.Model):
    """
    An M-Pesa STK push: the cashier asks Safaricom to prompt the patient's
    phone, and Safaricom calls back when they have paid -- or declined, or let
    it time out. A paid callback books the money like the cashier would.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Waiting for the customer'
        PAID = 'paid', 'Paid'
        FAILED = 'failed', 'Failed'
        CANCELLED = 'cancelled', 'Cancelled by the customer'

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='mpesa_requests')
    phone = models.CharField(max_length=15)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    merchant_request_id = models.CharField(max_length=100, blank=True, default='')
    checkout_request_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    mpesa_receipt_number = models.CharField(max_length=30, blank=True, default='')
    result_description = models.CharField(max_length=255, blank=True, default='')
    receipt = models.ForeignKey(PaymentReceipt, on_delete=models.SET_NULL, null=True, blank=True)
    requested_by = models.ForeignKey(
        'customuser.CustomUser', on_delete=models.SET_NULL, null=True, blank=True)
    callback_payload = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"M-Pesa {self.phone} {self.amount}: {self.get_status_display()}"
