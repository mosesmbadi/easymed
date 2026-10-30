"""
Drop TestKitCounter.

It mirrored reagent stock alongside the inventory quantity, which meant two
counters for one number and guaranteed drift. Reagent availability is now
derived from the stock ledger (see laboratory.utils.reagent_stock).
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0016_stock_ledger'),
        ('laboratory', '0022_lab_consumable_and_specimen_consumable'),
    ]

    operations = [
        migrations.DeleteModel(name='TestKitCounter'),
        migrations.AddField(
            model_name='reagentconsumptionlog',
            name='stock_movement_reference',
            field=models.UUIDField(
                blank=True, null=True,
                help_text='Groups the StockMovement rows this consumption produced'),
        ),
        migrations.AlterField(
            model_name='reagentconsumptionlog',
            name='available_tests_before',
            field=models.IntegerField(help_text='Reagent stock before consumption, from the ledger'),
        ),
        migrations.AlterField(
            model_name='reagentconsumptionlog',
            name='available_tests_after',
            field=models.IntegerField(help_text='Reagent stock after consumption, from the ledger'),
        ),
    ]
