import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0016_etims_and_mpesa'),
    ]

    operations = [
        migrations.AlterField(
            model_name='invoice',
            name='patient',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, to='patient.patient'),
        ),
        migrations.AlterField(
            model_name='paymentreceipt',
            name='patient',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='patient.patient'),
        ),
    ]
