from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Add IncomingItem.quantity_unit to clarify whether quantity is in packs or base units.

    Default is 'units' to preserve existing data behaviour (all legacy rows treated
    as base-unit quantities, which is what the old signal assumed).
    """

    dependencies = [
        ('inventory', '0013_alter_item_packed_subpacked'),
    ]

    operations = [
        migrations.AddField(
            model_name='incomingitem',
            name='quantity_unit',
            field=models.CharField(
                max_length=10,
                choices=[('packs', 'Packs'), ('units', 'Units')],
                default='units',
            ),
        ),
    ]
