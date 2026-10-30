"""
Replace the mutable-quantity inventory model with an append-only stock ledger.

Out: Inventory, InventoryArchive, DepartmentInventory -- a single mutable
     quantity column, a lossy archive of it, and an unused duplicate.
In:  StockLot (batch identity), StockMovement (the ledger), StockBalance
     (derived cache), StockPolicy, StockReservation, StockTake/StockTakeLine,
     and ItemPrice for the sale price that used to live on the stock row.
"""

import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models
from django.utils import timezone

SERVICE_CATEGORIES = ('Lab Test', 'General Appointment', 'Specialized Appointment')


def backfill_ledger(apps, schema_editor):
    """
    Carry whatever stock exists today into the ledger as opening balances, so
    nothing is silently lost when the old Inventory table goes away.

    Each Inventory row becomes:
      * a StockLot (item + lot number + expiry),
      * one OPENING_BALANCE movement for its quantity,
      * a StockBalance carrying its purchase price as the unit cost,
      * a StockPolicy carrying its re-order level,
      * an ItemPrice carrying its sale price.
    """
    Inventory = apps.get_model('inventory', 'Inventory')
    Item = apps.get_model('inventory', 'Item')
    ItemPrice = apps.get_model('inventory', 'ItemPrice')
    StockLot = apps.get_model('inventory', 'StockLot')
    StockMovement = apps.get_model('inventory', 'StockMovement')
    StockBalance = apps.get_model('inventory', 'StockBalance')
    StockPolicy = apps.get_model('inventory', 'StockPolicy')

    # Services are billable but hold no stock; the old design gave them fake
    # 9999-unit rows purely so billing could find a price.
    Item.objects.filter(category__in=SERVICE_CATEGORIES).update(is_stock_tracked=False)

    today = timezone.localdate()
    now = timezone.now()

    for row in Inventory.objects.select_related('item', 'department').iterator():
        item = row.item
        if item is None or row.department_id is None:
            continue

        is_service = item.category in SERVICE_CATEGORIES

        # Sale price moves to the effective-dated price list for every item,
        # services included.
        if row.sale_price is not None and not ItemPrice.objects.filter(item=item).exists():
            ItemPrice.objects.create(
                item=item, sale_price=row.sale_price, effective_from=today)

        if is_service:
            # Nothing to carry: a service never held real stock.
            continue

        lot_number = (row.lot_number or '').strip()
        lot = StockLot.objects.filter(
            item=item, lot_number=lot_number, expiry_date=row.expiry_date).first()
        if lot is None:
            lot = StockLot.objects.create(
                item=item, lot_number=lot_number, expiry_date=row.expiry_date)

        unit_cost = row.purchase_price or 0
        quantity = row.quantity_at_hand or 0

        balance, _ = StockBalance.objects.get_or_create(
            item=item, lot=lot, department_id=row.department_id,
            defaults={'quantity': 0, 'unit_cost': unit_cost},
        )

        if quantity:
            balance.quantity += quantity
            balance.unit_cost = unit_cost
            balance.last_movement_at = now
            balance.last_receipt_at = now
            balance.save()

            StockMovement.objects.create(
                reference=uuid.uuid4(),
                movement_type='OPENING_BALANCE',
                item=item,
                lot=lot,
                department_id=row.department_id,
                quantity=quantity,
                unit_cost=unit_cost,
                balance_after=balance.quantity,
                occurred_at=row.date_created or now,
                reason='Opening balance carried over from the legacy inventory table',
                source_type='SYSTEM',
                idempotency_key=f'legacy-inventory:{row.pk}',
            )

        if row.re_order_level is not None:
            StockPolicy.objects.get_or_create(
                item=item, department_id=row.department_id,
                defaults={'re_order_level': row.re_order_level},
            )



class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('inventory', '0015_lab_consumable_and_specimen_consumable'),
    ]

    operations = [
        # -------------------------------------------------------------------
        # Catalogue changes
        # -------------------------------------------------------------------
        migrations.AddField(
            model_name='department',
            name='is_stock_location',
            field=models.BooleanField(
                default=True, help_text='Whether stock can be held at this department'),
        ),
        migrations.AddField(
            model_name='item',
            name='category_one',
            field=models.CharField(
                choices=[('Resale', 'Resale'), ('Internal', 'Internal')],
                default='Resale',
                help_text='Whether the item is bought for resale or for internal consumption',
                max_length=20),
        ),
        migrations.AddField(
            model_name='item',
            name='is_stock_tracked',
            field=models.BooleanField(
                default=True,
                help_text='Services (lab tests, appointments) are billable but hold no stock'),
        ),
        migrations.AddField(
            model_name='item',
            name='default_re_order_level',
            field=models.PositiveIntegerField(
                default=5,
                help_text='Fallback re-order level when no per-department StockPolicy exists'),
        ),
        migrations.AlterField(
            model_name='supplierinvoice',
            name='amount',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=12),
        ),

        # -------------------------------------------------------------------
        # Price list
        # -------------------------------------------------------------------
        migrations.CreateModel(
            name='ItemPrice',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('sale_price', models.DecimalField(decimal_places=2, max_digits=12)),
                ('effective_from', models.DateField(default=django.utils.timezone.localdate)),
                ('effective_to', models.DateField(blank=True, null=True)),
                ('created_by', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    to=settings.AUTH_USER_MODEL)),
                ('item', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='prices',
                    to='inventory.item')),
            ],
            options={
                'ordering': ['-effective_from', '-id'],
            },
        ),
        migrations.AddIndex(
            model_name='itemprice',
            index=models.Index(fields=['item', 'effective_from'], name='inv_itemprice_item_eff_idx'),
        ),

        # -------------------------------------------------------------------
        # Goods received line becomes an explicitly-posted document
        # -------------------------------------------------------------------
        migrations.RemoveField(model_name='incomingitem', name='category_one'),
        migrations.AddField(
            model_name='incomingitem',
            name='department',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.PROTECT,
                related_name='incoming_items', to='inventory.department',
                help_text="Location the goods are received into. Defaults to the requisition's department"),
        ),
        migrations.AddField(
            model_name='incomingitem',
            name='posted_at',
            field=models.DateTimeField(
                blank=True, null=True,
                help_text='Set when the line has been posted to the stock ledger'),
        ),
        migrations.AddField(
            model_name='incomingitem',
            name='received_by',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='incomingitem',
            name='purchase_price',
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True,
                help_text='Cost of ONE unit of `quantity_unit` (one pack, or one base unit)'),
        ),
        migrations.AlterField(
            model_name='incomingitem',
            name='sale_price',
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True,
                help_text='Optional. When set, opens a new cash price for the item'),
        ),
        migrations.AlterField(
            model_name='incomingitem',
            name='item',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT, to='inventory.item'),
        ),
        migrations.AlterField(
            model_name='incomingitem',
            name='supplier',
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.PROTECT, to='inventory.supplier'),
        ),
        migrations.AlterModelOptions(
            name='incomingitem',
            options={'ordering': ['-date_created']},
        ),

        # -------------------------------------------------------------------
        # The ledger
        # -------------------------------------------------------------------
        migrations.CreateModel(
            name='StockLot',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('lot_number', models.CharField(
                    blank=True, default='', max_length=100,
                    help_text='Supplier batch number. Empty string means untracked/no lot')),
                ('expiry_date', models.DateField(blank=True, null=True)),
                ('item', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT, related_name='lots',
                    to='inventory.item')),
                ('supplier', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    to='inventory.supplier')),
            ],
            options={
                'ordering': ['expiry_date', 'id'],
            },
        ),
        migrations.AddIndex(
            model_name='stocklot',
            index=models.Index(fields=['item', 'expiry_date'], name='inv_stocklot_item_exp_idx'),
        ),
        migrations.AddConstraint(
            model_name='stocklot',
            constraint=models.UniqueConstraint(
                condition=models.Q(('expiry_date__isnull', False)),
                fields=('item', 'lot_number', 'expiry_date'),
                name='uniq_stock_lot_dated'),
        ),
        migrations.AddConstraint(
            model_name='stocklot',
            constraint=models.UniqueConstraint(
                condition=models.Q(('expiry_date__isnull', True)),
                fields=('item', 'lot_number'),
                name='uniq_stock_lot_undated'),
        ),

        migrations.CreateModel(
            name='StockMovement',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('reference', models.UUIDField(db_index=True, default=uuid.uuid4, editable=False)),
                ('movement_type', models.CharField(choices=[
                    ('OPENING_BALANCE', 'Opening balance'),
                    ('RECEIPT', 'Goods received'),
                    ('RETURN_TO_SUPPLIER', 'Return to supplier'),
                    ('SALE', 'Sale / dispense to patient'),
                    ('CONSUMPTION', 'Internal consumption'),
                    ('TRANSFER_OUT', 'Transfer out'),
                    ('TRANSFER_IN', 'Transfer in'),
                    ('ADJUSTMENT', 'Stock take adjustment'),
                    ('WASTAGE', 'Wastage / breakage'),
                    ('EXPIRY_WRITE_OFF', 'Expiry write-off'),
                    ('RETURN_FROM_ISSUE', 'Return from ward/patient'),
                    ('REVERSAL', 'Reversal of an earlier movement'),
                ], max_length=30)),
                ('quantity', models.IntegerField(
                    help_text='Signed, in base units. Negative = stock leaving')),
                ('unit_cost', models.DecimalField(
                    decimal_places=4, default=0, max_digits=14,
                    help_text='Cost per base unit applied by this movement')),
                ('balance_after', models.IntegerField(
                    default=0,
                    help_text='Running balance of this item/lot/department after the movement')),
                ('occurred_at', models.DateTimeField(
                    db_index=True, default=django.utils.timezone.now)),
                ('posted_at', models.DateTimeField(auto_now_add=True)),
                ('reason', models.CharField(blank=True, default='', max_length=255)),
                ('source_type', models.CharField(choices=[
                    ('MANUAL', 'Manual entry'),
                    ('GOODS_RECEIPT', 'Goods receipt note'),
                    ('INVOICE_ITEM', 'Invoice item'),
                    ('LAB_TEST', 'Lab test run'),
                    ('SAMPLE_COLLECTION', 'Sample collection'),
                    ('STOCK_TAKE', 'Stock take'),
                    ('TRANSFER', 'Stock transfer'),
                    ('SYSTEM', 'System'),
                ], default='MANUAL', max_length=30)),
                ('source_id', models.PositiveIntegerField(blank=True, null=True)),
                ('source_reference', models.CharField(
                    blank=True, default='', max_length=100,
                    help_text='Human-readable document number, e.g. the GRN or invoice number')),
                ('idempotency_key', models.CharField(
                    blank=True, max_length=120, null=True, unique=True)),
                ('department', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT, related_name='stock_movements',
                    to='inventory.department')),
                ('goods_receipt_note', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='stock_movements', to='inventory.goodsreceiptnote')),
                ('incoming_item', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='stock_movements', to='inventory.incomingitem')),
                ('item', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT, related_name='stock_movements',
                    to='inventory.item')),
                ('lot', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT, related_name='movements',
                    to='inventory.stocklot')),
                ('performed_by', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    to=settings.AUTH_USER_MODEL)),
                ('reverses', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='reversals', to='inventory.stockmovement')),
            ],
            options={
                'ordering': ['-posted_at', '-id'],
            },
        ),
        migrations.AddIndex(
            model_name='stockmovement',
            index=models.Index(
                fields=['item', 'department', 'occurred_at'], name='inv_move_item_dept_at_idx'),
        ),
        migrations.AddIndex(
            model_name='stockmovement',
            index=models.Index(fields=['lot', 'occurred_at'], name='inv_move_lot_at_idx'),
        ),
        migrations.AddIndex(
            model_name='stockmovement',
            index=models.Index(fields=['movement_type', 'occurred_at'], name='inv_move_type_at_idx'),
        ),
        migrations.AddIndex(
            model_name='stockmovement',
            index=models.Index(fields=['source_type', 'source_id'], name='inv_move_source_idx'),
        ),
        migrations.AddConstraint(
            model_name='stockmovement',
            constraint=models.CheckConstraint(
                check=models.Q(('quantity', 0), _negated=True),
                name='stock_movement_quantity_nonzero'),
        ),

        migrations.CreateModel(
            name='StockBalance',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('quantity', models.IntegerField(default=0)),
                ('unit_cost', models.DecimalField(
                    decimal_places=4, default=0, max_digits=14,
                    help_text='Weighted-average cost per base unit for this lot at this location')),
                ('last_movement_at', models.DateTimeField(blank=True, null=True)),
                ('last_receipt_at', models.DateTimeField(blank=True, null=True)),
                ('last_issue_at', models.DateTimeField(blank=True, null=True)),
                ('department', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT, related_name='stock_balances',
                    to='inventory.department')),
                ('item', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT, related_name='balances',
                    to='inventory.item')),
                ('lot', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT, related_name='balances',
                    to='inventory.stocklot')),
            ],
            options={
                'verbose_name': 'Stock balance',
                'verbose_name_plural': 'Stock balances',
            },
        ),
        migrations.AddIndex(
            model_name='stockbalance',
            index=models.Index(fields=['item', 'department'], name='inv_bal_item_dept_idx'),
        ),
        migrations.AddIndex(
            model_name='stockbalance',
            index=models.Index(fields=['department', 'quantity'], name='inv_bal_dept_qty_idx'),
        ),
        migrations.AddConstraint(
            model_name='stockbalance',
            constraint=models.UniqueConstraint(
                fields=('item', 'lot', 'department'), name='uniq_stock_balance'),
        ),

        migrations.CreateModel(
            name='StockPolicy',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('re_order_level', models.PositiveIntegerField(default=5)),
                ('reorder_quantity', models.PositiveIntegerField(
                    default=0, help_text='Suggested quantity to order, in base units')),
                ('max_level', models.PositiveIntegerField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('department', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='stock_policies',
                    to='inventory.department')),
                ('item', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='stock_policies',
                    to='inventory.item')),
            ],
            options={
                'verbose_name_plural': 'Stock policies',
            },
        ),
        migrations.AddConstraint(
            model_name='stockpolicy',
            constraint=models.UniqueConstraint(fields=('item', 'department'), name='uniq_stock_policy'),
        ),

        migrations.CreateModel(
            name='StockReservation',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('reference', models.UUIDField(db_index=True, default=uuid.uuid4, editable=False)),
                ('quantity', models.PositiveIntegerField()),
                ('status', models.CharField(choices=[
                    ('ACTIVE', 'Active'), ('CONSUMED', 'Consumed'),
                    ('RELEASED', 'Released'), ('EXPIRED', 'Expired'),
                ], default='ACTIVE', max_length=20)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('reason', models.CharField(blank=True, default='', max_length=255)),
                ('source_type', models.CharField(choices=[
                    ('MANUAL', 'Manual entry'),
                    ('GOODS_RECEIPT', 'Goods receipt note'),
                    ('INVOICE_ITEM', 'Invoice item'),
                    ('LAB_TEST', 'Lab test run'),
                    ('SAMPLE_COLLECTION', 'Sample collection'),
                    ('STOCK_TAKE', 'Stock take'),
                    ('TRANSFER', 'Stock transfer'),
                    ('SYSTEM', 'System'),
                ], default='MANUAL', max_length=30)),
                ('source_id', models.PositiveIntegerField(blank=True, null=True)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    to=settings.AUTH_USER_MODEL)),
                ('department', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='stock_reservations',
                    to='inventory.department')),
                ('item', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='reservations',
                    to='inventory.item')),
                ('lot', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='reservations', to='inventory.stocklot')),
            ],
        ),
        migrations.AddIndex(
            model_name='stockreservation',
            index=models.Index(
                fields=['item', 'department', 'status'], name='inv_resv_item_dept_st_idx'),
        ),
        migrations.AddIndex(
            model_name='stockreservation',
            index=models.Index(fields=['status', 'expires_at'], name='inv_resv_status_exp_idx'),
        ),

        migrations.CreateModel(
            name='StockTake',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('reference_number', models.CharField(editable=False, max_length=50, unique=True)),
                ('status', models.CharField(choices=[
                    ('DRAFT', 'Draft'), ('POSTED', 'Posted'), ('CANCELLED', 'Cancelled'),
                ], default='DRAFT', max_length=20)),
                ('note', models.TextField(blank=True, default='')),
                ('posted_at', models.DateTimeField(blank=True, null=True)),
                ('counted_by', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='stock_takes_counted', to=settings.AUTH_USER_MODEL)),
                ('department', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT, related_name='stock_takes',
                    to='inventory.department')),
                ('posted_by', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='stock_takes_posted', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-date_created'],
            },
        ),
        migrations.CreateModel(
            name='StockTakeLine',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('system_quantity', models.IntegerField(
                    default=0, help_text='Ledger balance captured when the line was created')),
                ('counted_quantity', models.IntegerField(default=0)),
                ('note', models.CharField(blank=True, default='', max_length=255)),
                ('lot', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT, related_name='stock_take_lines',
                    to='inventory.stocklot')),
                ('movement', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='stock_take_lines', to='inventory.stockmovement')),
                ('stock_take', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='lines',
                    to='inventory.stocktake')),
            ],
        ),
        migrations.AddConstraint(
            model_name='stocktakeline',
            constraint=models.UniqueConstraint(
                fields=('stock_take', 'lot'), name='uniq_stock_take_line'),
        ),

        # -------------------------------------------------------------------
        # Carry existing stock and prices across, then drop the old models
        # -------------------------------------------------------------------
        migrations.RunPython(backfill_ledger, migrations.RunPython.noop),
        migrations.DeleteModel(name='DepartmentInventory'),
        migrations.DeleteModel(name='InventoryArchive'),
        migrations.DeleteModel(name='Inventory'),
    ]
