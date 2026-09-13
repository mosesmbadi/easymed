"""
One panel, one billing item.

`LabTestPanel.item` was a plain FK, so nothing stopped two panels pointing at
the same catalogue entry. That is not a harmless duplication:

  - the panel's sale price is stored against the item, so pricing a Urea at 200
    silently repriced every other panel sharing that item;
  - billing raises one invoice line per panel, so a patient ordered both would
    be charged twice for the same catalogue entry with no way to tell the lines
    apart afterwards.

Panels already sharing an item are given their own copy, carrying the price
across so nothing is left unpriced, before the constraint goes on.
"""

from django.db import migrations, models
import django.db.models.deletion


def split_shared_items(apps, schema_editor):
    """Give every panel after the first its own billing item."""
    LabTestPanel = apps.get_model('laboratory', 'LabTestPanel')
    Item = apps.get_model('inventory', 'Item')
    ItemPrice = apps.get_model('inventory', 'ItemPrice')

    seen = set()
    for panel in LabTestPanel.objects.select_related('item').order_by('id'):
        if panel.item_id is None:
            continue
        if panel.item_id not in seen:
            seen.add(panel.item_id)
            continue

        original = panel.item

        # Item is unique on (name, category, units_of_measure), so the copy is
        # named for the panel that needs it. The panel id keeps it unique when
        # two panels share both an item and a name.
        name = panel.name or original.name
        if Item.objects.filter(
            name=name, category=original.category,
            units_of_measure=original.units_of_measure,
        ).exists():
            name = f"{name} ({panel.id})"

        copy = Item.objects.create(
            item_code=f"{original.item_code}-P{panel.id}"[:255],
            name=name,
            desc=original.desc,
            category=original.category,
            category_one=original.category_one,
            units_of_measure=original.units_of_measure,
            units_id=original.units_id,
            vat_rate=original.vat_rate,
            slow_moving_period=original.slow_moving_period,
            is_stock_tracked=original.is_stock_tracked,
            default_re_order_level=original.default_re_order_level,
        )

        # Carry the price over, or the panel comes out of this unpriced and
        # bills at zero.
        for price in ItemPrice.objects.filter(item=original):
            ItemPrice.objects.create(
                item=copy,
                sale_price=price.sale_price,
                effective_from=price.effective_from,
                effective_to=price.effective_to,
                created_by_id=price.created_by_id,
            )

        LabTestPanel.objects.filter(pk=panel.pk).update(item=copy)
        seen.add(copy.id)


def noop(apps, schema_editor):
    """
    Nothing to undo.

    Merging the copies back would have to guess which price was the real one,
    and the duplicates it would restore were the defect.
    """


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0022_department_head_alter_item_category_one_and_more'),
        ('laboratory', '0026_specimen_and_sample_consumables'),
    ]

    operations = [
        migrations.RunPython(split_shared_items, noop),
        migrations.AlterField(
            model_name='labtestpanel',
            name='item',
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='lab_test_panel',
                to='inventory.item',
            ),
        ),
    ]
