from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('company', '0003_company_facility_type'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='insurancecompany',
            options={'verbose_name': 'Credit account', 'verbose_name_plural': 'Credit accounts'},
        ),
        migrations.AlterField(
            model_name='insurancecompany',
            name='name',
            field=models.CharField(max_length=150),
        ),
        migrations.AddField(
            model_name='insurancecompany',
            name='account_type',
            field=models.CharField(
                choices=[('insurer', 'Insurer'), ('corporate', 'Corporate client'),
                         ('facility', 'Referring facility')],
                default='insurer', max_length=20),
        ),
        migrations.AddField(
            model_name='insurancecompany',
            name='contact_person',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
        migrations.AddField(
            model_name='insurancecompany',
            name='email',
            field=models.EmailField(blank=True, default='', max_length=254),
        ),
        migrations.AddField(
            model_name='insurancecompany',
            name='phone',
            field=models.CharField(blank=True, default='', max_length=30),
        ),
        migrations.AddField(
            model_name='insurancecompany',
            name='address',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
