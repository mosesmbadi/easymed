from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('company', '0002_company_patient_id_prefix'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='facility_type',
            field=models.CharField(
                choices=[('hospital', 'Hospital'), ('standalone_lab', 'Standalone Lab')],
                default='hospital',
                help_text='Hospital runs the full patient journey; Standalone Lab hides reception check-in, triage, doctor, inpatient and radiology.',
                max_length=30),
        ),
    ]
