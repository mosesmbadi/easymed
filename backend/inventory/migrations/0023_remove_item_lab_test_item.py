"""
A reagent no longer gets a billing item of its own.

Each LabReagent used to spawn a paired 'Lab Test' item, from when a reagent
was the test. The Test Panel is the product now and carries its own billing
item, so the paired items were orphans: sellable at the till with no panel
behind them. They are left in place here -- a panel may since have been
pointed at one -- and only the link is dropped.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0022_department_head_alter_item_category_one_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='item',
            name='lab_test_item',
        ),
    ]
