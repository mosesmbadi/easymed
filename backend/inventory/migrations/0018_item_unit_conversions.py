"""
Replace Item.packed / Item.subpacked with a per-item unit conversion table.

`subpacked` was the only one of the pair that ever did anything -- it converted
a pack into base units at goods receipt. `packed` was never read by any code.
Neither could express a third tier (carton of boxes of packets), so both are
replaced by ItemUnit rows, which can.

Existing subpacked values are carried over as a 'Pack' row so nothing silently
loses its pack size, and IncomingItem lines that were entered in packs are
repointed at that row.
"""

from django.db import migrations, models
import django.db.models.deletion


def carry_over_pack_sizes(apps, schema_editor):
    Item = apps.get_model('inventory', 'Item')
    ItemUnit = apps.get_model('inventory', 'ItemUnit')
    IncomingItem = apps.get_model('inventory', 'IncomingItem')

    pack_unit_by_item = {}
    for item in Item.objects.exclude(subpacked__lte=1):
        pack_unit_by_item[item.id] = ItemUnit.objects.create(
            item_id=item.id,
            name='Pack',
            factor_to_base=item.subpacked,
            is_purchase_default=True,
            is_sale_default=False,
        )

    for incoming in IncomingItem.objects.filter(quantity_unit='packs'):
        pack_unit = pack_unit_by_item.get(incoming.item_id)
        if pack_unit is not None:
            IncomingItem.objects.filter(pk=incoming.pk).update(item_unit=pack_unit.id)


def restore_pack_sizes(apps, schema_editor):
    Item = apps.get_model('inventory', 'Item')
    ItemUnit = apps.get_model('inventory', 'ItemUnit')

    for unit in ItemUnit.objects.all():
        Item.objects.filter(pk=unit.item_id).update(subpacked=unit.factor_to_base)


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0017_item_departments'),
    ]

    operations = [
        migrations.CreateModel(
            name='ItemUnit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('name', models.CharField(help_text='What the pack is called: Box, Carton, Strip', max_length=50)),
                ('factor_to_base', models.PositiveIntegerField(help_text='How many base units one of these contains. A box of 12 syringes is 12')),
                ('is_purchase_default', models.BooleanField(default=False, help_text='Pre-selected when receiving goods')),
                ('is_sale_default', models.BooleanField(default=False, help_text='Pre-selected when issuing or dispensing')),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='unit_conversions', to='inventory.item')),
            ],
            options={
                'verbose_name': 'Item unit',
                'ordering': ['factor_to_base'],
            },
        ),
        migrations.AddConstraint(
            model_name='itemunit',
            constraint=models.UniqueConstraint(fields=('item', 'name'), name='uniq_item_unit_name'),
        ),
        migrations.AddConstraint(
            model_name='itemunit',
            constraint=models.CheckConstraint(check=models.Q(('factor_to_base__gte', 1)), name='item_unit_factor_positive'),
        ),
        migrations.AddField(
            model_name='incomingitem',
            name='item_unit',
            field=models.ForeignKey(blank=True, help_text='The pack the goods arrived in. Blank means base units', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='incoming_items', to='inventory.itemunit'),
        ),
        migrations.RunPython(carry_over_pack_sizes, restore_pack_sizes),
        migrations.RemoveField(model_name='incomingitem', name='quantity_unit'),
        migrations.RemoveField(model_name='item', name='packed'),
        migrations.RemoveField(model_name='item', name='subpacked'),
        migrations.AlterField(
            model_name='incomingitem',
            name='quantity',
            field=models.IntegerField(help_text='Number of `item_unit`s, or of base units when it is blank'),
        ),
        migrations.AlterField(
            model_name='incomingitem',
            name='purchase_price',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Cost of ONE of whatever `item_unit` says, or of one base unit when it is blank', max_digits=12, null=True),
        ),
    ]
