from django.db import migrations, models


class Migration(migrations.Migration):
    """
    When a patient was registered. Patients already on file are left blank:
    their registration day isn't known, and filling in the day this runs would
    list every one of them as registered today.
    """

    dependencies = [
        ('patient', '0014_keep_records_when_user_removed'),
    ]

    operations = [
        migrations.AddField(
            model_name='patient',
            name='registered_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
    ]
