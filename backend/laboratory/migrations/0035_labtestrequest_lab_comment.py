from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('laboratory', '0034_labtestprofile_orders_as_whole'),
    ]

    operations = [
        migrations.AddField(
            model_name='labtestrequest',
            name='lab_comment',
            field=models.TextField(blank=True, default=''),
        ),
    ]
