from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Add InvoiceItem.quantity (PositiveIntegerField, default=1).

    Existing rows default to 1 (single-unit billing), preserving the old
    behaviour while enabling multi-unit billing going forward.
    item_amount and actual_total now store unit_price × quantity.
    """

    dependencies = [
        ('billing', '0012_paymentreceipt_sub_account_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoiceitem',
            name='quantity',
            field=models.PositiveIntegerField(default=1),
        ),
    ]
