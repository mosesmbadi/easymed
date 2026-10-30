"""
Seed the Cash payment mode.

`is_default` has existed since 0006 and `InvoiceItemSerializer` already falls
back to `PaymentMode.objects.filter(is_default=True)` -- but nothing ever
created that row. Insurance companies auto-create their own payment mode on
save; cash had no equivalent, so the fallback always found nothing and lines
were billed with no payment mode at all.
"""

from django.db import migrations


CASH_MODE = 'Cash'


def seed_cash_payment_mode(apps, schema_editor):
    PaymentMode = apps.get_model('billing', 'PaymentMode')

    cash = PaymentMode.objects.filter(
        payment_category='cash', payment_mode__iexact=CASH_MODE
    ).first()

    if cash is None:
        # Adopt a pre-existing cash mode rather than creating a second one.
        cash = PaymentMode.objects.filter(payment_category='cash', insurance__isnull=True).first()

    if cash is None:
        cash = PaymentMode.objects.create(
            payment_mode=CASH_MODE,
            payment_category='cash',
            is_default=True,
        )
    else:
        cash.payment_mode = CASH_MODE
        cash.payment_category = 'cash'
        cash.is_default = True
        cash.save()

    # Exactly one default.
    PaymentMode.objects.filter(is_default=True).exclude(pk=cash.pk).update(is_default=False)

    # Lines saved before this point have no payment mode; bill them as cash.
    InvoiceItem = apps.get_model('billing', 'InvoiceItem')
    InvoiceItem.objects.filter(payment_mode__isnull=True).update(payment_mode=cash)


def unseed_cash_payment_mode(apps, schema_editor):
    PaymentMode = apps.get_model('billing', 'PaymentMode')
    PaymentMode.objects.filter(
        payment_category='cash', payment_mode=CASH_MODE, insurance__isnull=True
    ).update(is_default=False)


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0013_invoiceitem_quantity'),
    ]

    operations = [
        migrations.RunPython(seed_cash_payment_mode, unseed_cash_payment_mode),
    ]
