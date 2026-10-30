"""
Carry the ordering unit through the procurement chain.

A requisition line now records the pack it is being ordered in, so "6 boxes of
12" stays 6 boxes all the way to goods receipt, where it converts once into the
72 base units the ledger counts. Purchase order lines read the unit back off
their requisition line rather than copying it, so the two cannot disagree.

Also makes Item.units_of_measure required. A quantity with no unit is exactly
what made pack handling guesswork, so unitless items get one before the
constraint goes on.
"""

from django.db import migrations, models
import django.db.models.deletion


def backfill_base_units(apps, schema_editor):
    Item = apps.get_model('inventory', 'Item')

    # Services are counted in whatever one of them is; goods fall back to the
    # neutral 'units' rather than inventing a measure we cannot know.
    service_units = {
        'Lab Test': 'test',
        'General Appointment': 'session',
        'Specialized Appointment': 'session',
    }
    for category, unit in service_units.items():
        Item.objects.filter(category=category, units_of_measure='').update(units_of_measure=unit)

    Item.objects.filter(units_of_measure='').update(units_of_measure='units')


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0018_item_unit_conversions'),
    ]

    operations = [
        migrations.AddField(
            model_name='requisitionitem',
            name='item_unit',
            field=models.ForeignKey(blank=True, help_text="The pack being ordered. Blank means the item's base unit", null=True, on_delete=django.db.models.deletion.PROTECT, related_name='requisition_items', to='inventory.itemunit'),
        ),
        migrations.AlterField(
            model_name='requisitionitem',
            name='unit_cost',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Agreed price for ONE `item_unit`', max_digits=10, null=True),
        ),
        migrations.RunPython(backfill_base_units, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='item',
            name='units_of_measure',
            field=models.CharField(help_text='Base unit stock is counted in: tablets, rolls, tests, ml', max_length=255),
        ),
        migrations.AddConstraint(
            model_name='item',
            constraint=models.CheckConstraint(check=models.Q(('units_of_measure', ''), _negated=True), name='item_base_unit_required'),
        ),
    ]
