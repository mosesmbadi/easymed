import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0018_discounts_and_credit_notes'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AccountTransfer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('transfer_date', models.DateField()),
                ('note', models.CharField(blank=True, default='', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('from_account', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='transfers_out', to='billing.subaccount')),
                ('reversal_of', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='reversed_by', to='billing.accounttransfer')),
                ('to_account', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='transfers_in', to='billing.subaccount')),
            ],
            options={
                'ordering': ['-transfer_date', '-id'],
            },
        ),
        migrations.AddConstraint(
            model_name='accounttransfer',
            constraint=models.CheckConstraint(check=models.Q(('amount__gt', 0)), name='account_transfer_amount_positive'),
        ),
        migrations.AddConstraint(
            model_name='accounttransfer',
            constraint=models.CheckConstraint(check=models.Q(('from_account', models.F('to_account')), _negated=True), name='account_transfer_between_different_accounts'),
        ),
    ]
