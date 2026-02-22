import uuid
import random
from datetime import datetime
from django.db import models
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError, status

from customuser.models import CustomUser
from company.models import InsuranceCompany

'''
An item will have a packed and sub-packed properties

You have 1 pack(box) of 20 syringes inside
packed will be 1 and subpacked will be 20
If you have 60 syringes in stock ==> quantities_at_hand
That means you have 3 packs (boxes)

You have one chair
Packed is 1 subpacked is 1
If you have three chairs in stock ==> quantities_at_hand
That means you have 3 chairs

Throughout the system, our BaseUnitofMeasure is the subpacked i.e
whenever quantity is referred, we're referring to subpacked.
'''

class AbstractBaseModel(models.Model):
    date_created = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True


class Department(AbstractBaseModel):
    '''
    Strict naming should be employed as frontend Inventory query
    is dependent on it. Choices can be
    Lab
    Pharmacy
    General
    Main
    '''
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return f"{self.id} - {self.name}"
    

class Supplier(AbstractBaseModel):
    official_name = models.CharField(max_length=255)  
    common_name = models.CharField(max_length=30) 

    def __str__(self):
        return f"{self.id} - {self.official_name} ({self.common_name})"


class Unit(AbstractBaseModel):
    CATEGORY_CHOICES = [
        ('mass', 'Mass / Weight'),
        ('volume', 'Volume'),
        ('length', 'Length'),
        ('concentration', 'Concentration'),
        ('hematology', 'Hematology'),
        ('enzyme', 'Enzyme Activity'),
        ('hormone', 'Hormones & Tumor Markers'),
        ('microbiology', 'Microbiology'),
        ('urinalysis', 'Urinalysis'),
        ('coagulation', 'Coagulation'),
        ('blood_gas', 'Blood Gas'),
        ('osmolality', 'Osmolality & Density'),
        ('molecular', 'Molecular Biology'),
        ('dose', 'Dose & Ratio'),
        ('general', 'General'),
    ]
    symbol = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=100, blank=True)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='general')

    class Meta:
        ordering = ['category', 'symbol']

    def __str__(self):
        return self.symbol


class Item(AbstractBaseModel):
    '''
    Refer to the docs above
    '''
    UNIT_CHOICES = [
        ('unit', 'Unit'),
        ('kits', 'Kits'),
        ('mg', 'Milligram'),
        ('g', 'Gram'),
        ('kg', 'Kilogram'),
        ('ml', 'Milliliter'),
        ('L', 'Liter'),
    ]
    CATEGORY_CHOICES = [
        ('SurgicalEquipment', 'Surgical Equipment'),
        ('LabReagent', 'Lab Reagent'), # lab Test Kit
        ('Drug', 'Drug'),
        ('Furniture', 'Furniture'),
        ('Lab Test', 'Lab Test'),
        ('General Appointment', 'General Appointment'),
        ('Specialized Appointment', 'Specialized Appointment'),
        ('general', 'General'),
    ]
    item_code = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    desc = models.CharField(max_length=255)
    category = models.CharField(max_length=255, choices=CATEGORY_CHOICES)
    units_of_measure = models.CharField(max_length=255, choices=UNIT_CHOICES, blank=True, default='')
    units = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    lab_test_item = models.OneToOneField(
        'self',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reagent_item',
        help_text="Auto-created Lab Test billing item paired to this Lab Reagent"
    )
    vat_rate= models.DecimalField(max_digits=5, decimal_places=2, default=16.0) 
    packed = models.CharField(max_length=255, default=1)
    subpacked = models.CharField(max_length=255, default=1)
    slow_moving_period = models.IntegerField(default=90)

    @property
    def buying_price(self):
        inventory = self.active_inventory_items.first()
        return inventory.purchase_price if inventory else 0

    @property
    def selling_price(self):
        inventory = self.active_inventory_items.first()
        return inventory.sale_price if inventory else 0

    def __str__(self):
        return f"{self.id} - {self.name} - {self.category}"


class Requisition(AbstractBaseModel):
    requisition_number = models.CharField(max_length=50, unique=True, editable=False)
    file = models.FileField(upload_to='requisitions', null=True, blank=True)
    department_approved = models.BooleanField(default=False)
    procurement_approved = models.BooleanField(default=False)
    department_approval_date = models.DateTimeField(null=True, blank=True)
    procurement_approval_date = models.DateTimeField(null=True, blank=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, max_length=255, null=False, blank=False)
    requested_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='req_requested_by')
    approved_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='req_approved_by')

    def save(self, *args, **kwargs):
        '''Generate requisition number'''
        today = timezone.now()
        year = today.year % 100
        month = today.month
        day = today.day
        abbr = self.department.name[:3].upper()
        random_code = random.randint(1000, 9999)

        self.requisition_number = f"{abbr}/{year}/{month:02d}/{day:02d}/{random_code}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.requisition_number

        
class RequisitionItem(AbstractBaseModel):
    quantity_requested = models.IntegerField()
    quantity_approved = models.IntegerField(default=0)  
    ordered = models.BooleanField(default=False)
    requisition = models.ForeignKey(Requisition, on_delete=models.CASCADE, related_name='items')
    preferred_supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"{self.item.name} - Requested: {self.quantity_requested}, Approved: {self.quantity_approved}"


class PurchaseOrder(AbstractBaseModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PARTIAL = 'PARTIAL', 'Partial'
        COMPLETED = 'COMPLETED', 'Completed'
        
    PO_number = models.CharField(unique=True, max_length=255, editable=False)
    file = models.FileField(upload_to='purchase-orders', null=True, blank=True)
    is_dispatched = models.BooleanField(default=False)
    ordered_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='ordered_by')
    approved_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, null=True, related_name='po_approved_by')
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.PENDING)
    requisition = models.ForeignKey(Requisition, on_delete=models.SET_NULL, null=True, blank=True, related_name='requisition')
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='supplier')

    class Meta:
        ordering = ['-date_created']

    def save(self, *args, **kwargs):
        """Generate purchase order number only on creation."""
        if not self.PO_number:  # Only generate if PO_number is empty
            today = timezone.now()
            year = today.year % 100
            month = today.month
            day = today.day
            random_code = random.randint(1000, 9999)
            self.PO_number = f"PO/{year}/{month:02d}/{day:02d}/{random_code}"
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Purchase Order by {self.ordered_by} - PO Number: {self.PO_number} - Status {self.status}"


class PurchaseOrderItem(AbstractBaseModel):
    '''
    On the purchase order pdf, we can create a converter that will
    display the packed and subpacked so that we only order packed
    '''
    quantity_ordered = models.IntegerField(default=0) # not packed or subpacked
    quantity_received = models.IntegerField(default=0)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='po_items')
    requisition_item = models.ForeignKey(RequisitionItem, on_delete=models.CASCADE, null=True, blank=True, related_name='purchase_order_items')

    def clean(self):
        if self.quantity_received > self.quantity_ordered:
            raise ValidationError("Quantity received cannot exceed quantity ordered")

    def __str__(self):
        return f"{self.requisition_item.item.name} - PO_no: {self.purchase_order.PO_number}"  

# TODO: amount should be captured as a sum total of the 
# incoming items associated with this invoice
# update_supplier_invoice_amount() signal will be called
class SupplierInvoice(AbstractBaseModel):
    STATUS=[
        ('pending', 'Pending'),
        ('paid', 'Paid'),
    ]
    invoice_no = models.CharField(max_length=255, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=255, choices=STATUS, default="pending")
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='supplier_invoices')

    class Meta:
        ordering = ['-date_created']

    def __str__(self):    
        return f"{self.invoice_no} - PO: {self.purchase_order.PO_number}"


class GoodsReceiptNote(AbstractBaseModel):
    note = models.TextField(max_length=255, null=True, blank=True)
    grn_number = models.CharField(max_length=50, null=True, blank=True, unique=True)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.pk and not self.grn_number:
            today = datetime.now().strftime('%Y%m%d')
            unique_id = uuid.uuid4().hex[:6].upper()  # Get a short unique ID
            self.grn_number = f'{today}-GRN-{unique_id}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.note} - {self.grn_number} - {self.date_created}"
    

# update_supplier_invoice_amount() signal will be called on create
class IncomingItem(AbstractBaseModel):
    CATEGORY_1_CHOICES = [
        ('Resale', 'resale'),
        ('Internal', 'internal'),
    ]
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.IntegerField()
    category_one = models.CharField(max_length=255, choices=CATEGORY_1_CHOICES, default='Resale') 
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, null=True,)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True)
    lot_no= models.CharField(max_length=255, null=True, blank=True)
    expiry_date= models.DateField(null=True, blank=True)
    supplier_invoice= models.ForeignKey(SupplierInvoice, on_delete=models.SET_NULL, null=True, blank=True)
    goods_receipt_note = models.ForeignKey(GoodsReceiptNote, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.item.name} - {self.date_created}"    


class Inventory(AbstractBaseModel):
    CATEGORY_ONE_CHOICES = [
        ('Resale', 'resale'),
        ('Internal', 'internal'),
    ]
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, default=10)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, default=20)
    quantity_at_hand = models.PositiveIntegerField() # packed*sub_packed
    last_deducted_at = models.DateTimeField(null=True, blank=True)
    re_order_level= models.PositiveIntegerField(default=5)
    category_one = models.CharField(max_length=255, choices=CATEGORY_ONE_CHOICES)
    lot_number= models.CharField(max_length=255, null=True, blank=True)
    expiry_date= models.DateField(null=True, blank=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='department_items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='active_inventory_items')

    def clean(self):
        if self.purchase_price > self.sale_price:
            raise ValidationError("Buying price cannot exceed selling price")

    def __str__(self):
        return f"{self.item.name} - {self.quantity_at_hand} - {self.expiry_date}"
    
    class Meta:
        verbose_name_plural = 'Inventory'


# Any record in the Inventory that has zero value in the 
# quantity_at_hand field should be moved here
class InventoryArchive(AbstractBaseModel):
    CATEGORY_ONE_CHOICES = [
        ('Resale', 'resale'),
        ('Internal', 'internal'),
    ]
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='archived_inventory_items')
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, default=10)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, default=20)
    quantity_at_hand = models.PositiveIntegerField() # packed*sub_packed
    re_order_level= models.PositiveIntegerField(default=5)
    category_one = models.CharField(max_length=255, choices=CATEGORY_ONE_CHOICES)
    lot_number= models.CharField(max_length=255, null=True, blank=True)
    expiry_date= models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.item.name} - {self.id} - {self.date_created}"
    
    class Meta:
        verbose_name_plural = 'Inventory Archive'


class InsuranceItemSalePrice(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    insurance_company = models.ForeignKey(InsuranceCompany, on_delete=models.CASCADE)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2)
    co_pay = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    def __str__(self):
        return f"{self.item.name} - {self.insurance_company.name}"
    
    class Meta:
        unique_together = ('item', 'insurance_company')
        verbose_name = "Insurance Item Sale Price"
        verbose_name_plural = "Insurance Item Sale Prices"
    

class DepartmentInventory(AbstractBaseModel):
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quantity_at_hand = models.PositiveIntegerField()
    lot_number = models.CharField(max_length=100)
    expiry_date = models.DateField()
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    main_inventory = models.ForeignKey(Inventory, on_delete=models.SET_NULL, null=True,
                                    help_text="Main inventory record this was transferred from")

    # class Meta:
    #     unique_together = ('item')    


class QuotationCustomer(models.Model):
    customer = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=255, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    contact_person = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"{self.name} - {self.email} - {self.phone} - {self.address}"


class Quotation(AbstractBaseModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    quotation_number = models.CharField(max_length=50, unique=True, editable=False)
    file = models.FileField(upload_to='quotations', null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='quotation_created_by'
        )
    approved_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='quotation_approved_by'
        )
    customer = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='customer'
        )
    customer2 = models.ForeignKey(QuotationCustomer, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.quotation_number} - {self.date_created}"


class QuotationItem(models.Model):
    quantity = models.IntegerField()    
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    # by default should pick price from Inventory
    quotation_price = models.DecimalField(max_digits=10, decimal_places=2) 

    def __str__(self):
        return f"{self.item.name} - {self.quantity}"


class SupplierPaymentReceipt(AbstractBaseModel):
    """
    Records payments made to suppliers for their invoices.
    Similar to PaymentReceipt but for outgoing payments.
    """
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='payment_receipts')
    payment_mode = models.ForeignKey('billing.PaymentMode', on_delete=models.PROTECT)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference_number = models.CharField(max_length=100)
    payment_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['supplier']),
            models.Index(fields=['payment_date']),
        ]

    def __str__(self):
        currency_label = (getattr(settings, 'EASYMED_CURRENCY_SYMBOL', '') or getattr(settings, 'EASYMED_CURRENCY_CODE', '') or '').strip()
        if currency_label:
            return f"Payment Receipt #{self.id} - {self.supplier.name} - {currency_label} {self.total_amount}"
        return f"Payment Receipt #{self.id} - {self.supplier.name} - {self.total_amount}"


class SupplierPaymentAllocation(models.Model):
    """
    Tracks how a supplier payment is allocated across supplier invoices.
    """
    receipt = models.ForeignKey(SupplierPaymentReceipt, on_delete=models.CASCADE, related_name='allocations')
    supplier_invoice = models.ForeignKey(SupplierInvoice, on_delete=models.CASCADE, related_name='payment_allocations')
    amount_applied = models.DecimalField(max_digits=12, decimal_places=2)
    applied_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['applied_at']),
            models.Index(fields=['supplier_invoice']),
        ]

    def __str__(self):
        return f"Allocation {self.amount_applied} to Invoice {self.supplier_invoice.invoice_no}"







