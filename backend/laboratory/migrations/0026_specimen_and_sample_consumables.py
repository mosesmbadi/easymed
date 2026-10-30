"""
Give the lab back its two-sided view of what a test costs.

Accompaniments were folded onto the billable item in 0024, which said "this
Lab Test item uses a syringe". That reads well at a pharmacy till and badly in
a lab: the syringe is spent drawing the sample, once, however many panels are
ordered off it -- and a retest off an archived sample spends none at all.

So collection consumables go back onto the specimen, reagents stay on the
panel, and what a particular draw actually used is recorded against the sample
itself.
"""

import django.db.models.deletion
from django.db import migrations, models


LAB_CATEGORIES = ('Lab Test', 'LabReagent', 'LabConsumable')


def forwards(apps, schema_editor):
    """Move every lab item's accompaniments back onto the specimen it is drawn into."""
    ItemConsumable = apps.get_model('inventory', 'ItemConsumable')
    LabTestPanel = apps.get_model('laboratory', 'LabTestPanel')
    SpecimenConsumable = apps.get_model('laboratory', 'SpecimenConsumable')

    lab_links = ItemConsumable.objects.filter(item__category__in=LAB_CATEGORIES)

    for panel in LabTestPanel.objects.filter(
            specimen_id__isnull=False, item_id__isnull=False):
        for link in lab_links.filter(item_id=panel.item_id):
            SpecimenConsumable.objects.update_or_create(
                specimen_id=panel.specimen_id,
                item_id=link.consumable_id,
                defaults={
                    'quantity_per_collection': link.quantity_per_use,
                    'is_required': link.is_required,
                },
            )

    # Left behind, they would be a second claim on the same syringe -- inert
    # today because the service ignores lab items, but a trap for the next
    # person reading the table.
    lab_links.delete()


def backwards(apps, schema_editor):
    """Put them back on each Lab Test item that draws the specimen."""
    ItemConsumable = apps.get_model('inventory', 'ItemConsumable')
    LabTestPanel = apps.get_model('laboratory', 'LabTestPanel')
    SpecimenConsumable = apps.get_model('laboratory', 'SpecimenConsumable')

    for link in SpecimenConsumable.objects.all():
        panels = LabTestPanel.objects.filter(
            specimen_id=link.specimen_id, item_id__isnull=False)
        for panel in panels:
            if panel.item_id == link.item_id:
                continue
            ItemConsumable.objects.update_or_create(
                item_id=panel.item_id,
                consumable_id=link.item_id,
                defaults={
                    'quantity_per_use': link.quantity_per_collection,
                    'is_required': link.is_required,
                },
            )


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0022_department_head_alter_item_category_one_and_more'),
        ('laboratory', '0025_delete_specimenconsumable'),
    ]

    operations = [
        migrations.CreateModel(
            name='SpecimenConsumable',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity_per_collection', models.PositiveIntegerField(default=1, help_text='Base units deducted each time a sample of this specimen is collected')),
                ('is_required', models.BooleanField(default=True, help_text='Required items warn loudly when short; optional ones only note it')),
                ('item', models.ForeignKey(help_text='An internal consumable held in stock: syringe, tube, gloves', limit_choices_to={'category_one': 'Internal'}, on_delete=django.db.models.deletion.PROTECT, related_name='specimen_consumable_links', to='inventory.item')),
                ('specimen', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='consumables', to='laboratory.specimen')),
            ],
            options={
                'verbose_name': 'Specimen Consumable',
                'verbose_name_plural': 'Specimen Consumables',
                'ordering': ['specimen', 'item'],
                'unique_together': {('specimen', 'item')},
            },
        ),
        migrations.CreateModel(
            name='PatientSampleConsumable',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.PositiveIntegerField(help_text='Base units actually issued')),
                ('quantity_required', models.PositiveIntegerField(default=0, help_text='What the specimen called for, which a short shelf may not have covered')),
                ('stock_movement_reference', models.UUIDField(blank=True, help_text='Groups the StockMovement rows this collection produced', null=True)),
                ('recorded_on', models.DateTimeField(auto_now_add=True)),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='sample_collection_uses', to='inventory.item')),
                ('patient_sample', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='consumables_used', to='laboratory.patientsample')),
            ],
            options={
                'verbose_name': 'Patient Sample Consumable',
                'verbose_name_plural': 'Patient Sample Consumables',
                'ordering': ['item'],
                'unique_together': {('patient_sample', 'item')},
            },
        ),
        migrations.RunPython(forwards, backwards),
    ]
