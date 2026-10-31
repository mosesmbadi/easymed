import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0015_invoiceitem_price_snapshot_and_payer_split'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='EtimsSubmission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('sent', 'Accepted by KRA'), ('failed', 'Failed')], default='pending', max_length=10)),
                ('attempts', models.PositiveIntegerField(default=0)),
                ('receipt_number', models.CharField(blank=True, default='', max_length=50)),
                ('receipt_signature', models.CharField(blank=True, default='', max_length=100)),
                ('internal_data', models.CharField(blank=True, default='', max_length=200)),
                ('qr_url', models.URLField(blank=True, default='', max_length=500)),
                ('error', models.TextField(blank=True, default='')),
                ('request_payload', models.JSONField(blank=True, null=True)),
                ('response_payload', models.JSONField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('invoice', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='etims', to='billing.invoice')),
            ],
        ),
        migrations.CreateModel(
            name='MpesaPaymentRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('phone', models.CharField(max_length=15)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('status', models.CharField(choices=[('pending', 'Waiting for the customer'), ('paid', 'Paid'), ('failed', 'Failed'), ('cancelled', 'Cancelled by the customer')], default='pending', max_length=10)),
                ('merchant_request_id', models.CharField(blank=True, default='', max_length=100)),
                ('checkout_request_id', models.CharField(blank=True, db_index=True, default='', max_length=100)),
                ('mpesa_receipt_number', models.CharField(blank=True, default='', max_length=30)),
                ('result_description', models.CharField(blank=True, default='', max_length=255)),
                ('callback_payload', models.JSONField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('invoice', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mpesa_requests', to='billing.invoice')),
                ('receipt', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='billing.paymentreceipt')),
                ('requested_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
