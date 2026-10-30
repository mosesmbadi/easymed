"""
Fold the lab-only accompaniment table into the general one.

SpecimenConsumable said "a blood draw uses a syringe". ItemConsumable says
"this billable item uses a syringe", which is the same fact told from the side
the till can act on -- and it covers injectable drugs, which a specimen table
never could.

Each old row is copied onto every Lab Test item whose panel draws that
specimen. Where two panels share a specimen they each get their own link,
because each test billed is its own draw as far as stock is concerned.
"""

from django.db import migrations


def forwards(apps, schema_editor):
    SpecimenConsumable = apps.get_model('laboratory', 'SpecimenConsumable')
    LabTestPanel = apps.get_model('laboratory', 'LabTestPanel')
    ItemConsumable = apps.get_model('inventory', 'ItemConsumable')

    for link in SpecimenConsumable.objects.select_related('item').all():
        panels = LabTestPanel.objects.filter(
            specimen_id=link.specimen_id, item_id__isnull=False)
        for panel in panels:
            if panel.item_id == link.item_id:
                # A test that is its own consumable is a data error, not a link.
                continue
            ItemConsumable.objects.update_or_create(
                item_id=panel.item_id,
                consumable_id=link.item_id,
                defaults={
                    'quantity_per_use': link.quantity_per_collection,
                    'is_required': True,
                },
            )


def backwards(apps, schema_editor):
    """
    Put the specimen rows back from whatever links now exist on the panels.

    Lossy by nature: accompaniments added directly to a drug have no specimen
    to go back to, so they are simply left behind.
    """
    SpecimenConsumable = apps.get_model('laboratory', 'SpecimenConsumable')
    LabTestPanel = apps.get_model('laboratory', 'LabTestPanel')
    ItemConsumable = apps.get_model('inventory', 'ItemConsumable')

    for panel in LabTestPanel.objects.filter(
            specimen_id__isnull=False, item_id__isnull=False):
        for link in ItemConsumable.objects.filter(item_id=panel.item_id):
            SpecimenConsumable.objects.update_or_create(
                specimen_id=panel.specimen_id,
                item_id=link.consumable_id,
                defaults={'quantity_per_collection': link.quantity_per_use},
            )


class Migration(migrations.Migration):

    dependencies = [
        ('laboratory', '0023_drop_test_kit_counter'),
        ('inventory', '0022_department_head_alter_item_category_one_and_more'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
