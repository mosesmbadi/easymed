from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Patient numbers are the company prefix plus a running number (ESMED-1042).
    At eight characters the hundredth patient, ESMED-100, could not be saved.
    """

    dependencies = [
        ('patient', '0011_triagesettings'),
    ]

    operations = [
        migrations.AlterField(
            model_name='patient',
            name='unique_id',
            field=models.CharField(max_length=30, unique=True),
        ),
        migrations.AlterField(
            model_name='attendanceprocess',
            name='patient_number',
            field=models.CharField(default=999, editable=False, max_length=30),
        ),
    ]
