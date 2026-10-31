from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('customuser', '0006_customuser_can_manage_inventory'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='registration_number',
            field=models.CharField(blank=True, default='', help_text='Professional registration number, e.g. KMLTTB for lab staff.', max_length=50),
        ),
    ]
