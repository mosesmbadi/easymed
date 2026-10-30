"""
Link items to the departments that use them.

An item tagged to the 'General' department is shared with every department, so
common stock (gloves, syringes, saline) does not have to be enumerated against
each one.
"""

import django.db.models.deletion
from django.db import migrations, models

SHARED_DEPARTMENT_NAME = 'General'

# Items in these categories clearly belong to one department, so tag them now
# rather than leaving the whole catalogue untagged.
CATEGORY_DEPARTMENTS = {
    'Drug': 'Pharmacy',
    'LabReagent': 'Lab',
    'LabConsumable': 'Lab',
}


def tag_items_with_departments(apps, schema_editor):
    Department = apps.get_model('inventory', 'Department')
    Item = apps.get_model('inventory', 'Item')
    ItemDepartment = apps.get_model('inventory', 'ItemDepartment')

    # 'General' is what makes an item shared, so it must exist.
    Department.objects.get_or_create(
        name=SHARED_DEPARTMENT_NAME, defaults={'is_stock_location': True})

    for category, department_name in CATEGORY_DEPARTMENTS.items():
        department = Department.objects.filter(name__iexact=department_name).first()
        if department is None:
            continue
        for item in Item.objects.filter(category=category):
            ItemDepartment.objects.get_or_create(
                item=item, department=department, defaults={'is_primary': True})


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0016_stock_ledger'),
    ]

    operations = [
        migrations.CreateModel(
            name='ItemDepartment',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('is_primary', models.BooleanField(
                    default=False,
                    help_text='The department that owns this item, used as the default stock location')),
                ('department', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='item_links',
                    to='inventory.department')),
                ('item', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='department_links',
                    to='inventory.item')),
            ],
            options={
                'verbose_name': 'Item department',
                'verbose_name_plural': 'Item departments',
            },
        ),
        migrations.AddIndex(
            model_name='itemdepartment',
            index=models.Index(fields=['department', 'item'], name='inv_itemdept_dept_item_idx'),
        ),
        migrations.AddConstraint(
            model_name='itemdepartment',
            constraint=models.UniqueConstraint(
                fields=('item', 'department'), name='uniq_item_department'),
        ),
        migrations.AddField(
            model_name='item',
            name='departments',
            field=models.ManyToManyField(
                blank=True,
                help_text="Departments that use this item. Tag it 'General' to share it with all of them",
                related_name='items',
                through='inventory.ItemDepartment',
                to='inventory.department'),
        ),
        migrations.RunPython(tag_items_with_departments, migrations.RunPython.noop),
    ]
