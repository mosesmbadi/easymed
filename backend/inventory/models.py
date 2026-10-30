import random
import uuid
from datetime import datetime

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q, Sum
from django.utils import timezone

from customuser.models import CustomUser
from company.models import InsuranceCompany

'''
Units of measure
----------------
Every item is stocked in ONE base unit -- the smallest thing you can issue.
Every quantity persisted by the stock ledger is expressed in that base unit.

Anything bigger you buy or sell in is an `ItemUnit` row carrying the number of
base units it contains:

    syringe (base)                    ->  no row needed, factor 1
    1 box of 12 syringes              ->  ItemUnit(name='Box', factor_to_base=12)
    1 carton of 10 boxes              ->  ItemUnit(name='Carton', factor_to_base=120)

Receiving 3 boxes puts 36 syringes in the ledger and costs them at
`purchase_price / 12` each. Conversion happens at the edges -- goods receipt
and issue -- so nothing downstream has to know a box exists.

Stock model
-----------
Stock is NOT a mutable number. It is the running total of an append-only
ledger (`StockMovement`). `StockBalance` is a derived cache of that ledger,
maintained inside the same transaction as every movement and rebuildable at
any time with `manage.py rebuild_stock_balances`.

Nothing outside `inventory.services.stock` may write a movement or a balance.
'''


class AbstractBaseModel(models.Model):
    date_created = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True


# Items tagged to this department are shared: every department can use them.
SHARED_DEPARTMENT_NAME = 'General'


class Department(AbstractBaseModel):
    '''
    A department doubles as a stock location. Strict naming should be employed
    as the frontend inventory query depends on it. Choices can be
    Lab
    Pharmacy
    General
    Main
    '''
    name = models.CharField(max_length=100, unique=True)
    is_stock_location = models.BooleanField(
        default=True,
        help_text="Whether stock can be held at this department"
    )
    head = models.ForeignKey(
        'customuser.CustomUser', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='departments_headed',
        help_text="Departmental head. May receive stock inwards for this department"
    )

    @property
    def is_shared(self):
        '''The General department stands for "usable by everyone".'''
        return self.name.strip().lower() == SHARED_DEPARTMENT_NAME.lower()

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
    The catalogue entry. An Item carries no stock and no price of its own --
    stock lives in the ledger, prices live in ItemPrice / InsuranceItemSalePrice.
    '''
    CATEGORY_CHOICES = [
        ('SurgicalEquipment', 'Surgical Equipment'),
        ('LabReagent', 'Lab Reagent'),  # lab Test Kit
        ('LabConsumable', 'Lab Consumable'),
        ('Drug', 'Drug'),
        ('Furniture', 'Furniture'),
        ('Lab Test', 'Lab Test'),
        ('General Appointment', 'General Appointment'),
        ('Specialized Appointment', 'Specialized Appointment'),
        ('general', 'General'),
    ]

    # Categories that represent a service rather than something you can hold.
    # These are billable but never stock-tracked, which is why the system no
    # longer needs fake "9999 units in stock" rows to make billing work.
    SERVICE_CATEGORIES = frozenset({
        'Lab Test',
        'General Appointment',
        'Specialized Appointment',
    })

    # Raw materials, not products. A reagent or a tube is consumed making
    # something sellable -- the lab sells the panel built out of them, and the
    # panel is where that price is set -- so a price here prices nothing
    # anybody ever buys.
    UNPRICED_CATEGORIES = frozenset({
        'LabReagent',
        'LabConsumable',
    })

    # The lab declares what it uses up per finished product: reagents on the
    # Test Panel, collection consumables on the Specimen. An item-level
    # accompaniment on a lab item would take the same syringe twice.
    LAB_CATEGORIES = frozenset({
        'Lab Test',
        'LabReagent',
        'LabConsumable',
    })

    # 'Internal' is the consumable side of the catalogue: syringes, swabs,
    # sample containers -- things the hospital uses up rather than sells.
    CATEGORY_ONE_CHOICES = [
        ('Resale', 'Resale'),
        ('Internal', 'Internal (Consumable)'),
    ]

    item_code = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    desc = models.CharField(max_length=255)
    category = models.CharField(max_length=255, choices=CATEGORY_CHOICES)
    category_one = models.CharField(
        max_length=20, choices=CATEGORY_ONE_CHOICES, default='Resale',
        help_text="Whether the item is bought for resale or for internal consumption"
    )
    # The base unit every quantity of this item is counted in. Required: a
    # quantity with no unit is the thing that makes pack conversions guesswork.
    units_of_measure = models.CharField(
        max_length=255,
        help_text="Base unit stock is counted in: tablets, rolls, tests, ml")
    units = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=16.0)
    slow_moving_period = models.IntegerField(default=90)
    is_stock_tracked = models.BooleanField(
        default=True,
        help_text="Services (lab tests, appointments) are billable but hold no stock"
    )
    default_re_order_level = models.PositiveIntegerField(
        default=5,
        help_text="Fallback re-order level when no per-department StockPolicy exists"
    )
    departments = models.ManyToManyField(
        Department,
        through='ItemDepartment',
        related_name='items',
        blank=True,
        help_text="Departments that use this item. Tag it 'General' to share it with all of them",
    )

    class Meta:
        unique_together = ('name', 'category', 'units_of_measure')
        constraints = [
            models.CheckConstraint(
                check=~Q(units_of_measure=''), name='item_base_unit_required'),
        ]

    def save(self, *args, **kwargs):
        # A service can never be stock tracked, regardless of what was posted.
        if self.category in self.SERVICE_CATEGORIES:
            self.is_stock_tracked = False
        elif self.pk and not self.is_stock_tracked:
            # ...but that has to be undoable, or an item filed as a service by
            # mistake stays permanently unable to hold stock even after its
            # category is corrected.
            was_a_service = type(self).objects.filter(
                pk=self.pk, category__in=self.SERVICE_CATEGORIES).exists()
            if was_a_service:
                self.is_stock_tracked = True
        super().save(*args, **kwargs)

    @property
    def current_sale_price(self):
        '''Cash sale price from the price list, or 0 when unpriced.'''
        price = ItemPrice.current_for(self)
        return price.sale_price if price else 0

    @property
    def current_cost(self):
        '''
        Weighted-average cost per base unit across all stock on hand.
        Returns 0 when nothing is in stock.
        '''
        rows = StockBalance.objects.filter(item=self, quantity__gt=0).values_list('quantity', 'unit_cost')
        total_qty = 0
        total_value = 0
        for qty, cost in rows:
            total_qty += qty
            total_value += qty * (cost or 0)
        if not total_qty:
            return 0
        return total_value / total_qty

    @property
    def last_purchase_cost(self):
        '''
        What we last paid for one base unit, from the most recent goods
        receipt. Returns 0 when the item has never been bought.
        '''
        line = IncomingItem.objects.filter(
            item=self, purchase_price__isnull=False
        ).order_by('-date_created').first()
        return line.unit_cost if line else 0

    @property
    def quantity_at_hand(self):
        '''Total base units on hand across every lot and every location.'''
        return StockBalance.objects.filter(item=self).aggregate(
            total=Sum('quantity')
        )['total'] or 0

    def is_available_to(self, department):
        '''
        True when this item belongs to `department`, or is shared (tagged
        General), or has not been tagged at all yet.
        '''
        if department is None:
            return True
        links = self.department_links.select_related('department')
        if not links.exists():
            # Untagged items stay usable everywhere rather than disappearing
            # from every department the moment this feature ships.
            return True
        return any(
            link.department_id == department.id or link.department.is_shared
            for link in links
        )

    @property
    def is_consumable(self):
        '''An item held for internal use rather than resale.'''
        return self.category_one == 'Internal'

    @property
    def is_sellable(self):
        '''
        Whether this item can carry a cash sale price of its own.

        Internal consumables and lab raw materials cannot: they are what a
        sale is made of, not the thing sold. A Lab Test item is sellable, but
        its price is set on the Test Panel that defines it, not here.
        '''
        return self.category not in self.UNPRICED_CATEGORIES and not self.is_consumable

    @property
    def supports_accompaniments(self):
        '''
        Whether accompaniments may be declared against this item.

        Only outside the lab. A test's syringe belongs to the specimen it is
        drawn into and its reagents belong to its panel, so declaring either
        here would double the deduction.
        '''
        return self.category not in self.LAB_CATEGORIES

    def consumable_requirements(self, quantity=1):
        '''
        What gets used up alongside `quantity` base units of this item.

        Returns the links, not just the items, because the caller needs both
        how many are needed and whether a shortfall should block.
        '''
        if not self.supports_accompaniments:
            return []
        return [
            (link, link.quantity_per_use * quantity)
            for link in self.consumable_links.select_related('consumable')
        ]

    # Backwards-compatible aliases used by the serializers / front-end.
    @property
    def buying_price(self):
        return self.current_cost

    @property
    def selling_price(self):
        return self.current_sale_price

    def __str__(self):
        return f"{self.id} - {self.name} - {self.category}"


class ItemConsumable(AbstractBaseModel):
    '''
    An accompaniment: what is used up whenever the parent item is sold,
    dispensed or run.

    Tetracycline injection needs a syringe and a swab. A urea test needs a
    syringe, a swab and a sample container. Panadol tablets need nothing, so
    they simply have no rows here -- absence is the normal case, which is why
    this is a table rather than a column.
    '''
    item = models.ForeignKey(
        Item, on_delete=models.CASCADE, related_name='consumable_links',
        help_text="The sellable or billable item")
    consumable = models.ForeignKey(
        Item, on_delete=models.PROTECT, related_name='consumed_by_links',
        limit_choices_to={'category_one': 'Internal'},
        help_text="The accompaniment used up alongside it")
    quantity_per_use = models.PositiveIntegerField(
        default=1,
        help_text="Base units of the consumable used per ONE base unit of the parent item")
    is_required = models.BooleanField(
        default=True,
        help_text="Required accompaniments block billing when out of stock; optional ones only warn")

    class Meta:
        unique_together = ('item', 'consumable')
        ordering = ['item', 'consumable']
        verbose_name = "Item Consumable"
        verbose_name_plural = "Item Consumables"

    def clean(self):
        if self.item_id and self.consumable_id and self.item_id == self.consumable_id:
            raise ValidationError({'consumable': "An item cannot be its own accompaniment."})
        if self.item_id and not self.item.supports_accompaniments:
            raise ValidationError(
                {'item': f"{self.item.name} is a lab item. Lab reagents belong on the "
                         f"Test Panel and collection consumables on the Specimen."})
        if self.consumable_id and not self.consumable.is_stock_tracked:
            raise ValidationError(
                {'consumable': f"{self.consumable.name} is a service and holds no stock, "
                               f"so it cannot be an accompaniment."})
        if self.quantity_per_use is not None and self.quantity_per_use < 1:
            raise ValidationError({'quantity_per_use': "An accompaniment must be used at least once."})

    def __str__(self):
        return f"{self.item.name} needs {self.quantity_per_use} x {self.consumable.name}"


def unit_name_forms(word):
    '''
    The forms a unit name might be written in, for comparing one name against
    another.

    English plurals do not reduce with a single rule -- 'boxes' loses 'es' but
    'syringes' only loses 's' -- so rather than guess which applies, return
    every candidate and let the caller look for any overlap.
    '''
    normalised = (word or '').strip().lower()
    if not normalised:
        return set()
    forms = {normalised}
    for suffix in ('es', 's'):
        if normalised.endswith(suffix) and len(normalised) > len(suffix):
            forms.add(normalised[:-len(suffix)])
    return forms


def unit_name_collides(pack_name, base_unit):
    '''A pack may not be called what the base unit is already called.'''
    return bool(unit_name_forms(pack_name) & unit_name_forms(base_unit))


UNIT_NAME_COLLISION_MESSAGE = (
    "A pack cannot be called '{pack}' when the base unit is already '{base}' -- "
    "it would read as '1 {pack} = {factor} {base}'. Name the base unit for what "
    "it actually counts (tests, ml, tablets) and keep '{pack}' for the container."
)


class ItemUnit(AbstractBaseModel):
    '''
    A pack size an item can be bought or sold in, expressed in base units.

    The base unit itself is never a row here -- it is implicit, factor 1. Rows
    are the bigger containers: a box of 12, a carton of 120. Nesting is handled
    the way Sage and every other ledger-based system handles it, by referring
    every level back to the base unit rather than to the level above it, so a
    carton is 120 and not "10 boxes".
    '''
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='unit_conversions')
    name = models.CharField(max_length=50, help_text="What the pack is called: Box, Carton, Strip")
    factor_to_base = models.PositiveIntegerField(
        help_text="How many base units one of these contains. A box of 12 syringes is 12")
    is_purchase_default = models.BooleanField(
        default=False, help_text="Pre-selected when receiving goods")
    is_sale_default = models.BooleanField(
        default=False, help_text="Pre-selected when issuing or dispensing")

    class Meta:
        ordering = ['factor_to_base']
        verbose_name = 'Item unit'
        constraints = [
            models.UniqueConstraint(fields=['item', 'name'], name='uniq_item_unit_name'),
            models.CheckConstraint(
                check=Q(factor_to_base__gte=1), name='item_unit_factor_positive'),
        ]

    def clean(self):
        if self.factor_to_base == 1:
            raise ValidationError(
                {'factor_to_base': "A factor of 1 is the base unit, which needs no row."}
            )
        # Without this, "1 Kit (500 kits)" is a reachable, and meaningless,
        # thing for the dashboard to print.
        if self.item_id and unit_name_collides(self.name, self.item.units_of_measure):
            raise ValidationError({'name': UNIT_NAME_COLLISION_MESSAGE.format(
                pack=self.name,
                base=self.item.units_of_measure,
                factor=self.factor_to_base,
            )})

    def to_base(self, quantity):
        return quantity * self.factor_to_base

    def __str__(self):
        return f"{self.item.name}: 1 {self.name} = {self.factor_to_base}"


class ItemDepartment(AbstractBaseModel):
    '''
    Which departments use an item.

    Kept as its own table rather than a single FK on Item, because plenty of
    items are used by more than one department (gloves, syringes, saline). An
    item tagged to the General department is shared with every department, so
    there is no need to enumerate them.
    '''
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='department_links')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='item_links')
    is_primary = models.BooleanField(
        default=False,
        help_text="The department that owns this item, used as the default stock location"
    )

    class Meta:
        verbose_name = 'Item department'
        verbose_name_plural = 'Item departments'
        constraints = [
            models.UniqueConstraint(fields=['item', 'department'], name='uniq_item_department'),
        ]
        indexes = [models.Index(fields=['department', 'item'], name='inv_itemdept_dept_item_idx')]

    def __str__(self):
        return f"{self.item.name} @ {self.department.name}"


class ItemPrice(AbstractBaseModel):
    '''
    Cash price list. Prices are effective-dated so a price change never
    rewrites history -- an invoice raised last month keeps last month's price.
    '''
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='prices')
    sale_price = models.DecimalField(max_digits=12, decimal_places=2)
    effective_from = models.DateField(default=timezone.localdate)
    effective_to = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-effective_from', '-id']
        indexes = [models.Index(fields=['item', 'effective_from'], name='inv_itemprice_item_eff_idx')]

    @classmethod
    def current_for(cls, item, on=None):
        on = on or timezone.localdate()
        return cls.objects.filter(
            item=item,
            effective_from__lte=on,
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=on)
        ).order_by('-effective_from', '-id').first()

    def clean(self):
        if self.effective_to and self.effective_to < self.effective_from:
            raise ValidationError("effective_to cannot be before effective_from")

    def __str__(self):
        return f"{self.item.name} @ {self.sale_price} from {self.effective_from}"


class InsuranceItemSalePrice(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    insurance_company = models.ForeignKey(InsuranceCompany, on_delete=models.CASCADE)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2)
    co_pay = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        unique_together = ('item', 'insurance_company')
        verbose_name = "Insurance Item Sale Price"
        verbose_name_plural = "Insurance Item Sale Prices"

    def __str__(self):
        return f"{self.item.name} - {self.insurance_company.name}"


class Requisition(AbstractBaseModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        DEPARTMENT_APPROVED = 'DEPARTMENT_APPROVED', 'Department approved'
        PROCUREMENT_APPROVED = 'PROCUREMENT_APPROVED', 'Procurement approved'
        PARTIALLY_ORDERED = 'PARTIALLY_ORDERED', 'Partially ordered'
        ORDERED = 'ORDERED', 'Ordered'
        REJECTED = 'REJECTED', 'Rejected'
        CANCELLED = 'CANCELLED', 'Cancelled'

    # The two ways a requisition stops without being ordered. Rejected is the
    # approver saying no; cancelled is the requesting side withdrawing it.
    CLOSED_CHOICES = [
        (Status.REJECTED, 'Rejected'),
        (Status.CANCELLED, 'Cancelled'),
    ]

    requisition_number = models.CharField(max_length=50, unique=True, editable=False)
    file = models.FileField(upload_to='requisitions', null=True, blank=True)
    department_approved = models.BooleanField(default=False)
    procurement_approved = models.BooleanField(default=False)
    status = models.CharField(
        max_length=30, choices=Status.choices, default=Status.PENDING,
        help_text=(
            "Where the requisition has reached. Derived from the approval flags, "
            "how many of its lines have been ordered, and whether it was closed "
            "-- never set directly, so it cannot drift from them."
        ))
    # Ending a requisition is a decision, not something the other fields imply,
    # so it is recorded here and the status is read back off it.
    closed_as = models.CharField(
        max_length=30, choices=CLOSED_CHOICES, null=True, blank=True,
        help_text="Set when the requisition is rejected or cancelled; blank while it is live")
    closed_reason = models.CharField(
        max_length=255, blank=True, default='',
        help_text="Why it was rejected or cancelled")
    closed_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='req_closed_by')
    closed_at = models.DateTimeField(null=True, blank=True)
    department_approval_date = models.DateTimeField(null=True, blank=True)
    procurement_approval_date = models.DateTimeField(null=True, blank=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, max_length=255, null=False, blank=False)
    requested_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='req_requested_by')
    approved_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='req_approved_by')

    @property
    def is_closed(self):
        return bool(self.closed_as)

    def close(self, closed_as, reason='', by=None):
        '''
        End the requisition without ordering it.

        Refused once any line has been ordered: a purchase order is a
        commitment to a supplier, and quietly cancelling the requisition
        underneath it would leave that commitment unexplained.
        '''
        if closed_as not in {self.Status.REJECTED, self.Status.CANCELLED}:
            raise ValidationError(
                {'closed_as': f"'{closed_as}' is not a way to close a requisition."})
        if self.is_closed:
            raise ValidationError(
                {'closed_as': f"{self.requisition_number} is already "
                              f"{self.get_closed_as_display().lower()}."})
        if self.items.filter(ordered=True).exists():
            raise ValidationError(
                {'closed_as': "Lines on this requisition have already been ordered. "
                              "Cancel the purchase order instead."})

        self.closed_as = closed_as
        self.closed_reason = reason or ''
        self.closed_by = by
        self.closed_at = timezone.now()
        self.save()
        return self

    def reopen(self):
        '''Undo a rejection or cancellation, returning it to where it had got to.'''
        if not self.is_closed:
            raise ValidationError(
                {'closed_as': f"{self.requisition_number} is not closed."})
        self.closed_as = None
        self.closed_reason = ''
        self.closed_by = None
        self.closed_at = None
        self.save()
        return self

    def derive_status(self):
        '''
        Work the status out from the facts that already exist, so there is one
        source of truth rather than a column someone has to remember to update.
        '''
        # Being closed outranks everything else: it is the one part of the
        # lifecycle nothing else records.
        if self.closed_as:
            return self.closed_as
        if not self.department_approved:
            return self.Status.PENDING
        if not self.procurement_approved:
            return self.Status.DEPARTMENT_APPROVED

        # Procurement has signed off; how far has ordering actually got? Only
        # lines with an approved quantity can be ordered, so only they count.
        approved_lines = [line for line in self.items.all() if line.quantity_approved > 0]
        if not approved_lines:
            return self.Status.PROCUREMENT_APPROVED

        ordered = sum(1 for line in approved_lines if line.ordered)
        if ordered == 0:
            return self.Status.PROCUREMENT_APPROVED
        if ordered == len(approved_lines):
            return self.Status.ORDERED
        return self.Status.PARTIALLY_ORDERED

    def refresh_status(self):
        '''Recompute and persist the status, writing only when it changed.'''
        current = self.derive_status()
        if current != self.status:
            self.status = current
            # A queryset update rather than save(): deleting a requisition
            # cascades to its items, which fires this from their post_delete,
            # by which point the parent row is gone. update() is a no-op on a
            # row that no longer exists; save() would raise.
            type(self).objects.filter(pk=self.pk).update(status=current)
        return current

    def save(self, *args, **kwargs):
        '''Generate the requisition number once, on creation only.'''
        if not self.requisition_number:
            today = timezone.now()
            abbr = self.department.name[:3].upper()
            random_code = random.randint(1000, 9999)
            self.requisition_number = (
                f"{abbr}/{today.year % 100}/{today.month:02d}/{today.day:02d}/{random_code}"
            )
        # Items can only be counted once the row exists; a brand new
        # requisition has none, and its default of PENDING is already right.
        if self.pk:
            self.status = self.derive_status()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.requisition_number


class RequisitionItem(AbstractBaseModel):
    '''
    A line on a requisition.

    Quantities and `unit_cost` are expressed in `item_unit` -- ordering six
    boxes of twelve is quantity 6, not 72. The whole procurement chain keeps
    that unit: the purchase order reads it back off this line, and conversion
    to base units happens once, when the goods are received.
    '''
    quantity_requested = models.IntegerField()
    quantity_approved = models.IntegerField(default=0)
    ordered = models.BooleanField(default=False)
    requisition = models.ForeignKey(Requisition, on_delete=models.CASCADE, related_name='items')
    preferred_supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    item_unit = models.ForeignKey(
        ItemUnit, on_delete=models.PROTECT, null=True, blank=True,
        related_name='requisition_items',
        help_text="The pack being ordered. Blank means the item's base unit"
    )
    unit_cost = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Agreed price for ONE `item_unit`")

    def clean(self):
        if self.item_unit_id and self.item_unit.item_id != self.item_id:
            raise ValidationError(
                {'item_unit': f"{self.item_unit.name} is a pack size for a different item."}
            )

    @property
    def conversion_factor(self):
        return self.item_unit.factor_to_base if self.item_unit_id else 1

    @property
    def unit_label(self):
        return self.item_unit.name if self.item_unit_id else (self.item.units_of_measure or 'units')

    @property
    def effective_unit_cost(self):
        '''
        Cost of ONE of whatever is being ordered.

        An agreed price on the line is already per pack. Both fallbacks are
        per base unit, so they scale up: a box of twelve costs twelve times
        what one costs. Weighted-average stock cost comes first; an item that
        is out of stock -- or has never been stocked -- still prices off what
        we last paid for it, rather than printing a requisition worth zero.
        '''
        if self.unit_cost is not None:
            return self.unit_cost
        base_cost = self.item.current_cost or self.item.last_purchase_cost or 0
        return base_cost * self.conversion_factor

    @property
    def approved_line_cost(self):
        '''What the approved quantity costs. Both sides are per ordering unit.'''
        return self.effective_unit_cost * (self.quantity_approved or 0)

    @property
    def base_quantity_requested(self):
        return self.quantity_requested * self.conversion_factor

    @property
    def base_quantity_approved(self):
        return self.quantity_approved * self.conversion_factor

    def save(self, *args, **kwargs):
        if not self.id and (self.quantity_approved is None or self.quantity_approved == 0):
            self.quantity_approved = self.quantity_requested
        super().save(*args, **kwargs)

    def __str__(self):
        return (f"{self.item.name} - Requested: {self.quantity_requested} {self.unit_label}, "
                f"Approved: {self.quantity_approved}")


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
        if not self.PO_number:
            today = timezone.now()
            random_code = random.randint(1000, 9999)
            self.PO_number = f"PO/{today.year % 100}/{today.month:02d}/{today.day:02d}/{random_code}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Purchase Order by {self.ordered_by} - PO Number: {self.PO_number} - Status {self.status}"


class PurchaseOrderItem(AbstractBaseModel):
    '''
    Quantities are in the unit the requisition line was raised in, which is
    also the unit the supplier is quoting -- order six boxes, receive six
    boxes. The unit is read back off the requisition line rather than copied,
    so the two can never disagree.
    '''
    quantity_ordered = models.IntegerField(default=0)
    quantity_received = models.IntegerField(default=0)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='po_items')
    requisition_item = models.ForeignKey(RequisitionItem, on_delete=models.CASCADE, null=True, blank=True, related_name='purchase_order_items')

    @property
    def item_unit(self):
        return self.requisition_item.item_unit if self.requisition_item_id else None

    @property
    def conversion_factor(self):
        return self.requisition_item.conversion_factor if self.requisition_item_id else 1

    @property
    def unit_label(self):
        return self.requisition_item.unit_label if self.requisition_item_id else 'units'

    @property
    def base_quantity_ordered(self):
        return self.quantity_ordered * self.conversion_factor

    @property
    def base_quantity_received(self):
        return self.quantity_received * self.conversion_factor

    def clean(self):
        # Both sides are in the same unit, so this compares like with like.
        if self.quantity_received > self.quantity_ordered:
            raise ValidationError("Quantity received cannot exceed quantity ordered")

    def __str__(self):
        return f"{self.requisition_item.item.name} - PO_no: {self.purchase_order.PO_number}"


class SupplierInvoice(AbstractBaseModel):
    STATUS = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
    ]
    invoice_no = models.CharField(max_length=255, unique=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(max_length=255, choices=STATUS, default="pending")
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='supplier_invoices')

    class Meta:
        ordering = ['-date_created']

    def recalculate_amount(self, save=True):
        '''Sum of the line totals of every receipt line billed on this invoice.'''
        total = sum((line.line_total for line in self.incomingitem_set.all()), 0)
        self.amount = total
        if save and self.pk:
            SupplierInvoice.objects.filter(pk=self.pk).update(amount=total)
        return total

    def __str__(self):
        return f"{self.invoice_no} - PO: {self.purchase_order.PO_number}"


class GoodsReceiptNote(AbstractBaseModel):
    note = models.TextField(max_length=255, null=True, blank=True)
    grn_number = models.CharField(max_length=50, null=True, blank=True, unique=True)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.pk and not self.grn_number:
            today = datetime.now().strftime('%Y%m%d')
            unique_id = uuid.uuid4().hex[:6].upper()
            self.grn_number = f'{today}-GRN-{unique_id}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.note} - {self.grn_number} - {self.date_created}"


class IncomingItem(AbstractBaseModel):
    '''
    A goods-received line. Creating one does not itself change stock -- posting
    it does, via `inventory.services.stock.receive_incoming_item`, which writes
    a RECEIPT movement and stamps `posted_at` so a double submission is a no-op.
    '''
    purchase_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Cost of ONE of whatever `item_unit` says, or of one base unit when it is blank"
    )
    sale_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Optional. When set, opens a new cash price for the item"
    )
    quantity = models.IntegerField(help_text="Number of `item_unit`s, or of base units when it is blank")
    item_unit = models.ForeignKey(
        'ItemUnit', on_delete=models.PROTECT, null=True, blank=True,
        related_name='incoming_items',
        help_text="The pack the goods arrived in. Blank means base units"
    )
    item = models.ForeignKey(Item, on_delete=models.PROTECT)
    department = models.ForeignKey(
        Department, on_delete=models.PROTECT, null=True, blank=True,
        related_name='incoming_items',
        help_text="Location the goods are received into. Defaults to the requisition's department"
    )
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, null=True)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True)
    lot_no = models.CharField(max_length=255, null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    supplier_invoice = models.ForeignKey(SupplierInvoice, on_delete=models.SET_NULL, null=True, blank=True)
    goods_receipt_note = models.ForeignKey(GoodsReceiptNote, on_delete=models.SET_NULL, null=True, blank=True)
    posted_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Set when the line has been posted to the stock ledger"
    )
    received_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-date_created']

    @property
    def conversion_factor(self):
        return self.item_unit.factor_to_base if self.item_unit_id else 1

    @property
    def base_units(self):
        '''`quantity` converted to base units.'''
        return self.quantity * self.conversion_factor

    @property
    def unit_cost(self):
        '''Purchase price expressed per BASE unit.'''
        if self.purchase_price is None:
            return 0
        return self.purchase_price / self.conversion_factor

    @property
    def line_total(self):
        '''What the supplier charges for this line, in the unit they quoted.'''
        if self.purchase_price is None:
            return 0
        return self.purchase_price * self.quantity

    @property
    def is_posted(self):
        return self.posted_at is not None

    def __str__(self):
        return f"{self.item.name} - {self.date_created}"


# ---------------------------------------------------------------------------
# Stock ledger
# ---------------------------------------------------------------------------

class StockLot(AbstractBaseModel):
    '''
    The physical identity of a batch: which item, which lot number, which
    expiry. A lot is never revalued and never deleted -- cost belongs to the
    movements and balances that reference it.
    '''
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name='lots')
    lot_number = models.CharField(
        max_length=100, blank=True, default='',
        help_text="Supplier batch number. Empty string means untracked/no lot"
    )
    expiry_date = models.DateField(null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['expiry_date', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['item', 'lot_number', 'expiry_date'],
                condition=Q(expiry_date__isnull=False),
                name='uniq_stock_lot_dated',
            ),
            # Postgres treats NULLs as distinct, so undated lots need their own
            # partial constraint or duplicates slip through.
            models.UniqueConstraint(
                fields=['item', 'lot_number'],
                condition=Q(expiry_date__isnull=True),
                name='uniq_stock_lot_undated',
            ),
        ]
        indexes = [models.Index(fields=['item', 'expiry_date'], name='inv_stocklot_item_exp_idx')]

    @property
    def is_expired(self):
        return bool(self.expiry_date and self.expiry_date < timezone.localdate())

    def __str__(self):
        label = self.lot_number or 'no-lot'
        return f"{self.item.name} [{label}] exp {self.expiry_date or '-'}"


class StockMovement(AbstractBaseModel):
    '''
    THE LEDGER. Append-only: rows are never updated and never deleted. A
    mistake is corrected with a contra entry (see services.stock.reverse).
    '''

    class Type(models.TextChoices):
        OPENING_BALANCE = 'OPENING_BALANCE', 'Opening balance'
        RECEIPT = 'RECEIPT', 'Goods received'
        RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER', 'Return to supplier'
        SALE = 'SALE', 'Sale / dispense to patient'
        CONSUMPTION = 'CONSUMPTION', 'Internal consumption'
        TRANSFER_OUT = 'TRANSFER_OUT', 'Transfer out'
        TRANSFER_IN = 'TRANSFER_IN', 'Transfer in'
        ADJUSTMENT = 'ADJUSTMENT', 'Stock take adjustment'
        WASTAGE = 'WASTAGE', 'Wastage / breakage'
        EXPIRY_WRITE_OFF = 'EXPIRY_WRITE_OFF', 'Expiry write-off'
        RETURN_FROM_ISSUE = 'RETURN_FROM_ISSUE', 'Return from ward/patient'
        REVERSAL = 'REVERSAL', 'Reversal of an earlier movement'

    # Types whose quantity must be positive / negative. ADJUSTMENT and REVERSAL
    # are the only ones allowed to go either way.
    INFLOW_TYPES = frozenset({
        Type.OPENING_BALANCE, Type.RECEIPT, Type.TRANSFER_IN, Type.RETURN_FROM_ISSUE,
    })
    OUTFLOW_TYPES = frozenset({
        Type.SALE, Type.CONSUMPTION, Type.TRANSFER_OUT, Type.WASTAGE,
        Type.EXPIRY_WRITE_OFF, Type.RETURN_TO_SUPPLIER,
    })

    class Source(models.TextChoices):
        MANUAL = 'MANUAL', 'Manual entry'
        GOODS_RECEIPT = 'GOODS_RECEIPT', 'Goods receipt note'
        INVOICE_ITEM = 'INVOICE_ITEM', 'Invoice item'
        LAB_TEST = 'LAB_TEST', 'Lab test run'
        SAMPLE_COLLECTION = 'SAMPLE_COLLECTION', 'Sample collection'
        STOCK_TAKE = 'STOCK_TAKE', 'Stock take'
        TRANSFER = 'TRANSFER', 'Stock transfer'
        SYSTEM = 'SYSTEM', 'System'

    # Groups the legs of a single logical transaction (e.g. both sides of a
    # transfer, or every lot touched by one FEFO issue).
    reference = models.UUIDField(default=uuid.uuid4, db_index=True, editable=False)
    movement_type = models.CharField(max_length=30, choices=Type.choices)
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name='stock_movements')
    lot = models.ForeignKey(StockLot, on_delete=models.PROTECT, related_name='movements')
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='stock_movements')

    quantity = models.IntegerField(help_text="Signed, in base units. Negative = stock leaving")
    unit_cost = models.DecimalField(
        max_digits=14, decimal_places=4, default=0,
        help_text="Cost per base unit applied by this movement"
    )
    balance_after = models.IntegerField(
        default=0,
        help_text="Running balance of this item/lot/department after the movement"
    )

    occurred_at = models.DateTimeField(default=timezone.now, db_index=True)
    posted_at = models.DateTimeField(auto_now_add=True)
    performed_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    reason = models.CharField(max_length=255, blank=True, default='')

    # Source document. Kept as a (type, id, reference) triple rather than a FK
    # per app so `inventory` does not have to import billing/laboratory.
    source_type = models.CharField(max_length=30, choices=Source.choices, default=Source.MANUAL)
    source_id = models.PositiveIntegerField(null=True, blank=True)
    source_reference = models.CharField(
        max_length=100, blank=True, default='',
        help_text="Human-readable document number, e.g. the GRN or invoice number"
    )

    # In-app source documents, kept as real FKs for integrity.
    goods_receipt_note = models.ForeignKey(
        GoodsReceiptNote, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_movements')
    incoming_item = models.ForeignKey(
        IncomingItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_movements')

    reverses = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='reversals')
    idempotency_key = models.CharField(max_length=120, null=True, blank=True, unique=True)

    class Meta:
        ordering = ['-posted_at', '-id']
        indexes = [
            models.Index(fields=['item', 'department', 'occurred_at'], name='inv_move_item_dept_at_idx'),
            models.Index(fields=['lot', 'occurred_at'], name='inv_move_lot_at_idx'),
            models.Index(fields=['movement_type', 'occurred_at'], name='inv_move_type_at_idx'),
            models.Index(fields=['source_type', 'source_id'], name='inv_move_source_idx'),
        ]
        constraints = [
            models.CheckConstraint(check=~Q(quantity=0), name='stock_movement_quantity_nonzero'),
        ]

    @property
    def total_cost(self):
        return self.quantity * self.unit_cost

    def save(self, *args, **kwargs):
        if self.pk and not self._state.adding:
            raise ValidationError(
                f"StockMovement is append-only. Post a reversal instead of editing movement #{self.pk}."
            )
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError(
            f"StockMovement is append-only. Post a reversal instead of deleting movement #{self.pk}."
        )

    def __str__(self):
        return f"{self.movement_type} {self.quantity:+d} {self.item.name} @ {self.department.name}"


class StockBalance(AbstractBaseModel):
    '''
    Derived cache of the ledger, one row per item / lot / location. Written
    only by inventory.services.stock, always under a row lock, always in the
    same transaction as the movement that changed it.

    `quantity` is deliberately signed: a negative balance is drift we want to
    see and alert on, not an IntegrityError that hides the cause.
    '''
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name='balances')
    lot = models.ForeignKey(StockLot, on_delete=models.PROTECT, related_name='balances')
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='stock_balances')

    quantity = models.IntegerField(default=0)
    unit_cost = models.DecimalField(
        max_digits=14, decimal_places=4, default=0,
        help_text="Weighted-average cost per base unit for this lot at this location"
    )
    last_movement_at = models.DateTimeField(null=True, blank=True)
    last_receipt_at = models.DateTimeField(null=True, blank=True)
    last_issue_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Stock balance'
        verbose_name_plural = 'Stock balances'
        constraints = [
            models.UniqueConstraint(fields=['item', 'lot', 'department'], name='uniq_stock_balance'),
        ]
        indexes = [
            models.Index(fields=['item', 'department'], name='inv_bal_item_dept_idx'),
            models.Index(fields=['department', 'quantity'], name='inv_bal_dept_qty_idx'),
        ]

    @property
    def total_value(self):
        return self.quantity * self.unit_cost

    @property
    def quantity_at_hand(self):
        '''Alias kept so report templates and the dashboard read the same name.'''
        return self.quantity

    @property
    def expiry_date(self):
        return self.lot.expiry_date

    @property
    def lot_number(self):
        return self.lot.lot_number

    @property
    def is_expired(self):
        return self.lot.is_expired

    def __str__(self):
        return f"{self.item.name} @ {self.department.name} [{self.lot.lot_number or 'no-lot'}] = {self.quantity}"


class StockPolicy(AbstractBaseModel):
    '''
    Per item, per location replenishment rule. A re-order level belongs to an
    item at a location, never to an individual lot.
    '''
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='stock_policies')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='stock_policies')
    re_order_level = models.PositiveIntegerField(default=5)
    reorder_quantity = models.PositiveIntegerField(default=0, help_text="Suggested quantity to order, in base units")
    max_level = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Stock policies'
        constraints = [
            models.UniqueConstraint(fields=['item', 'department'], name='uniq_stock_policy'),
        ]

    def __str__(self):
        return f"{self.item.name} @ {self.department.name} re-order at {self.re_order_level}"


class StockReservation(AbstractBaseModel):
    '''
    Soft allocation held between the moment stock is promised (prescribed,
    test ordered) and the moment it is issued. Available stock is the balance
    minus every ACTIVE reservation.
    '''
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        CONSUMED = 'CONSUMED', 'Consumed'
        RELEASED = 'RELEASED', 'Released'
        EXPIRED = 'EXPIRED', 'Expired'

    reference = models.UUIDField(default=uuid.uuid4, db_index=True, editable=False)
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='reservations')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='stock_reservations')
    lot = models.ForeignKey(StockLot, on_delete=models.SET_NULL, null=True, blank=True, related_name='reservations')
    quantity = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    expires_at = models.DateTimeField(null=True, blank=True)
    reason = models.CharField(max_length=255, blank=True, default='')
    source_type = models.CharField(
        max_length=30, choices=StockMovement.Source.choices, default=StockMovement.Source.MANUAL)
    source_id = models.PositiveIntegerField(null=True, blank=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['item', 'department', 'status'], name='inv_resv_item_dept_st_idx'),
            models.Index(fields=['status', 'expires_at'], name='inv_resv_status_exp_idx'),
        ]

    @property
    def is_live(self):
        if self.status != self.Status.ACTIVE:
            return False
        return not (self.expires_at and self.expires_at < timezone.now())

    def __str__(self):
        return f"{self.quantity} x {self.item.name} reserved @ {self.department.name} ({self.status})"


class StockTake(AbstractBaseModel):
    '''
    A physical count. Posting one writes ADJUSTMENT movements for the variance
    on each line -- the count never overwrites a balance directly.
    '''
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        POSTED = 'POSTED', 'Posted'
        CANCELLED = 'CANCELLED', 'Cancelled'

    reference_number = models.CharField(max_length=50, unique=True, editable=False)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='stock_takes')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    note = models.TextField(blank=True, default='')
    counted_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_takes_counted')
    posted_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_takes_posted')
    posted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date_created']

    def save(self, *args, **kwargs):
        if not self.reference_number:
            today = datetime.now().strftime('%Y%m%d')
            self.reference_number = f"ST-{today}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference_number} - {self.department.name} ({self.status})"


class StockTakeLine(models.Model):
    stock_take = models.ForeignKey(StockTake, on_delete=models.CASCADE, related_name='lines')
    lot = models.ForeignKey(StockLot, on_delete=models.PROTECT, related_name='stock_take_lines')
    system_quantity = models.IntegerField(default=0, help_text="Ledger balance captured when the line was created")
    counted_quantity = models.IntegerField(default=0)
    note = models.CharField(max_length=255, blank=True, default='')
    movement = models.ForeignKey(
        StockMovement, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_take_lines')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['stock_take', 'lot'], name='uniq_stock_take_line'),
        ]

    @property
    def variance(self):
        return self.counted_quantity - self.system_quantity

    def __str__(self):
        return f"{self.lot} counted {self.counted_quantity} (system {self.system_quantity})"


# ---------------------------------------------------------------------------
# Quotations & supplier payments
# ---------------------------------------------------------------------------

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
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='quotation_created_by')
    approved_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='quotation_approved_by')
    customer = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='customer')
    customer2 = models.ForeignKey(QuotationCustomer, on_delete=models.SET_NULL, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.quotation_number:
            today = datetime.now().strftime('%Y%m%d')
            self.quotation_number = f"QT-{today}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quotation_number} - {self.date_created}"


class QuotationItem(models.Model):
    quantity = models.IntegerField()
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    quotation_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.item.name} - {self.quantity}"


class SupplierPaymentReceipt(AbstractBaseModel):
    """
    Records payments made to suppliers for their invoices.
    Similar to PaymentReceipt but for outgoing payments.
    """
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='payment_receipts')
    sub_account = models.ForeignKey(
        'billing.SubAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='supplier_receipts')
    payment_mode = models.ForeignKey('billing.PaymentMode', on_delete=models.PROTECT, null=True, blank=True)
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
        currency_label = (
            getattr(settings, 'EASYMED_CURRENCY_SYMBOL', '')
            or getattr(settings, 'EASYMED_CURRENCY_CODE', '')
            or ''
        ).strip()
        if currency_label:
            return f"Payment Receipt #{self.id} - {self.supplier.official_name} - {currency_label} {self.total_amount}"
        return f"Payment Receipt #{self.id} - {self.supplier.official_name} - {self.total_amount}"


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
