import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('patient', '0012_widen_patient_number'),
        ('company', '0005_facility_profile'),
    ]

    operations = [
        migrations.AddField(
            model_name='patient',
            name='date_of_birth_estimated',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='patient',
            name='referred_from',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='referred_patients', to='company.insurancecompany'),
        ),
        migrations.AddField(
            model_name='patient',
            name='external_id',
            field=models.CharField(blank=True, default='', max_length=60),
        ),
    ]
