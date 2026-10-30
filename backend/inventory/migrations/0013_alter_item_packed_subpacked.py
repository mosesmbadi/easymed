from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Change Item.packed and Item.subpacked from CharField to PositiveIntegerField.

    All existing string values default to '1', which maps cleanly to integer 1.
    The DB cast (VARCHAR -> INTEGER) is safe because only digit strings are stored.
    """

    dependencies = [
        ('inventory', '0012_merge_20260317_0106'),
    ]

    operations = [
        migrations.AlterField(
            model_name='item',
            name='packed',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AlterField(
            model_name='item',
            name='subpacked',
            field=models.PositiveIntegerField(default=1),
        ),
    ]
