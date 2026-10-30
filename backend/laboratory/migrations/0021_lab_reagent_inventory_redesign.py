"""
Lab reagent & inventory redesign migration.

Changes:
1. Rename TestPanelReagent.tests_consumed_per_run → units_consumed_per_run
   and change from IntegerField to PositiveIntegerField.
2. Rename LabReagent.item_number → item and change from FK to OneToOneField.
3. Remove TestKit model.
4. Remove TestKitCounter.lab_test_kit FK and TestKitCounter.counter field.
5. Make TestKitCounter.reagent_item non-nullable OneToOneField.
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('laboratory', '0020_remove_labtestpanel_unit'),
        ('inventory', '0014_incomingitem_quantity_unit'),
    ]

    operations = [
        # 1. Rename tests_consumed_per_run → units_consumed_per_run
        migrations.RenameField(
            model_name='testpanelreagent',
            old_name='tests_consumed_per_run',
            new_name='units_consumed_per_run',
        ),
        migrations.AlterField(
            model_name='testpanelreagent',
            name='units_consumed_per_run',
            field=models.PositiveIntegerField(
                default=1,
                help_text='Base inventory units consumed from this reagent per test run',
            ),
        ),

        # 2. Rename LabReagent.item_number → item (OneToOneField)
        migrations.RenameField(
            model_name='labreagent',
            old_name='item_number',
            new_name='item',
        ),
        migrations.AlterField(
            model_name='labreagent',
            name='item',
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='lab_reagent_metadata',
                to='inventory.item',
            ),
        ),

        # 3. Remove legacy fields from TestKitCounter before deleting TestKit
        migrations.RemoveField(
            model_name='testkitcounter',
            name='lab_test_kit',
        ),
        migrations.RemoveField(
            model_name='testkitcounter',
            name='counter',
        ),

        # 4. Make TestKitCounter.reagent_item non-nullable OneToOneField
        migrations.AlterField(
            model_name='testkitcounter',
            name='reagent_item',
            field=models.OneToOneField(
                limit_choices_to={'category': 'LabReagent'},
                on_delete=django.db.models.deletion.CASCADE,
                related_name='test_counter',
                to='inventory.item',
            ),
        ),

        # 5. Delete TestKit model
        migrations.DeleteModel(
            name='TestKit',
        ),
    ]
