from django.db import migrations, models

def migrate_payment_categories(apps, schema_editor):
    PaymentMode = apps.get_model('billing', 'PaymentMode')
    # Update 'mpesa' to 'mobile_money'
    PaymentMode.objects.filter(payment_category='mpesa').update(payment_category='mobile_money')
    PaymentMode.objects.filter(payment_mode__iexact='mpesa').update(payment_mode='Mobile Money')
    
    # Update 'cheque' to 'bank_transfer'
    PaymentMode.objects.filter(payment_category='cheque').update(payment_category='bank_transfer')
    PaymentMode.objects.filter(payment_mode__iexact='cheque').update(payment_mode='Bank Transfer')

def revert_payment_categories(apps, schema_editor):
    PaymentMode = apps.get_model('billing', 'PaymentMode')
    # Revert
    PaymentMode.objects.filter(payment_category='mobile_money').update(payment_category='mpesa')
    PaymentMode.objects.filter(payment_mode__iexact='mobile money').update(payment_mode='mpesa')
    
    PaymentMode.objects.filter(payment_category='bank_transfer').update(payment_category='cheque')
    PaymentMode.objects.filter(payment_mode__iexact='bank transfer').update(payment_mode='cheque')

class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0006_add_is_default_to_payment_mode'),
    ]

    operations = [
        migrations.AlterField(
            model_name='paymentmode',
            name='payment_category',
            field=models.CharField(choices=[('cash', 'Cash'), ('insurance', 'Insurance'), ('mobile_money', 'Mobile Money'), ('bank_transfer', 'Bank Transfer'), ('direct_to_bank', 'DIRECT_TO_BANK')], default='cash', max_length=20),
        ),
        migrations.RunPython(migrate_payment_categories, revert_payment_categories),
    ]
