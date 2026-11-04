from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('laboratory', '0032_nested_report_profiles'),
    ]

    operations = [
        migrations.AddField(
            model_name='labtestpanel',
            name='report_group',
            field=models.PositiveSmallIntegerField(default=0, help_text='Panels sharing a number print together, with a gap before the next number'),
        ),
    ]
