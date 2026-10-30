from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('laboratory', '0027_one_billing_item_per_panel'),
    ]

    operations = [
        migrations.AddField(
            model_name='labtestrequest',
            name='referring_doctor',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AddField(
            model_name='labtestrequest',
            name='referring_facility',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
    ]
