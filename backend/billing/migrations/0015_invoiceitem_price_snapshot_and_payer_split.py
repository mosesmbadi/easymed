"""
Freeze the price on the line, and split it explicitly between the two payers.

Two problems, one migration.

`item_amount` was recomputed from the live price list on every save, so an
invoice raised last month restated itself the next time anything touched the
row -- which is the exact thing the effective-dated price list exists to
prevent. `unit_price` holds what the line was actually sold at.

`actual_total` had three writers with two conventions. The one that won
computed `item_amount - co_pay` against an `item_amount` that already held only
the insurer's portion, so every insurance line went out at the insurer price
LESS the patient's co-pay. `patient_amount` now records the patient's share
outright instead of leaving every consumer to reconstruct it by subtraction.

Existing rows are rebuilt to the new convention. Leaving them would be worse
than rewriting them: the payment allocator and the insurance receivables screen
both read `actual_total`, so a database holding both conventions reports
balances that are wrong for some invoices and right for others, with nothing to
tell them apart.
"""

from django.db import migrations, models


def rebuild_amounts(apps, schema_editor):
    """
    Restate every line under the new convention.

    Historic lines are priced from what they were billed at where that can be
    recovered -- the insurance price row, or the line's own stored amount --
    and never from today's cash price list, which would be inventing a number.
    """
    InvoiceItem = apps.get_model('billing', 'InvoiceItem')
    InsuranceItemSalePrice = apps.get_model('inventory', 'InsuranceItemSalePrice')

    for line in InvoiceItem.objects.select_related('payment_mode', 'item').iterator():
        qty = line.quantity or 1

        insured = (
            line.payment_mode_id
            and line.payment_mode.payment_category == 'insurance'
            and line.payment_mode.insurance_id
        )
        ins_price = None
        if insured:
            ins_price = InsuranceItemSalePrice.objects.filter(
                item_id=line.item_id,
                insurance_company_id=line.payment_mode.insurance_id,
            ).first()

        if ins_price:
            insurer_unit = ins_price.sale_price or 0
            patient_unit = ins_price.co_pay or 0
            line.unit_price = insurer_unit + patient_unit
            line.item_amount = line.unit_price * qty
            line.patient_amount = patient_unit * qty
            line.actual_total = insurer_unit * qty
        else:
            # Cash, or insurance with nothing configured. The stored
            # `item_amount` already was the whole line for these, so keep it and
            # back the unit price out of it rather than re-pricing.
            total = line.item_amount or 0
            line.unit_price = (total / qty) if qty else total
            line.patient_amount = total
            line.actual_total = total

        line.save(update_fields=[
            'unit_price', 'item_amount', 'patient_amount', 'actual_total'])


def noop(apps, schema_editor):
    """
    Nothing to undo in the data.

    The old convention cannot be reconstructed without also restoring the bug
    that produced it, and the column drops below take the new fields with them.
    """


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0014_seed_cash_payment_mode'),
        ('inventory', '0022_department_head_alter_item_category_one_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoiceitem',
            name='unit_price',
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True,
                help_text='Price of ONE base unit, frozen at the moment the line was billed'),
        ),
        migrations.AddField(
            model_name='invoiceitem',
            name='patient_amount',
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=10,
                help_text=("The patient's own share of this line: the co-pay, "
                           "or the whole thing on a cash line")),
        ),
        migrations.RunPython(rebuild_amounts, noop),
    ]
