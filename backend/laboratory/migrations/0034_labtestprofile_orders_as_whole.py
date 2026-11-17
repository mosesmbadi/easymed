from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('laboratory', '0033_labtestpanel_report_group'),
    ]

    operations = [
        # Off for every existing profile: nothing changes until a lab locks one.
        migrations.AddField(
            model_name='labtestprofile',
            name='orders_as_whole',
            field=models.BooleanField(default=False, help_text='Every panel under this profile, sub profiles included, is ordered whenever it is requested; none can be left off.'),
        ),
    ]
