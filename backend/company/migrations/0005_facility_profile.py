from django.db import migrations, models

import company.models


SWITCHABLE = ['reception', 'triage', 'doctor', 'inpatient', 'radiology']


def modules_from_facility_type(apps, schema_editor):
    """A standalone lab saved before this keeps its modules switched off."""
    Company = apps.get_model('company', 'Company')
    for company in Company.objects.all():
        company.enabled_modules = [] if company.facility_type == 'standalone_lab' else SWITCHABLE
        company.save(update_fields=['enabled_modules'])


class Migration(migrations.Migration):

    dependencies = [
        ('company', '0004_credit_accounts'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='company',
            options={'verbose_name': 'facility profile', 'verbose_name_plural': 'facility profile'},
        ),
        migrations.AlterField(
            model_name='company',
            name='facility_type',
            field=models.CharField(
                choices=[('hospital', 'Hospital'), ('standalone_lab', 'Standalone Lab'), ('custom', 'Custom')],
                default='hospital', max_length=30,
                help_text="A preset for the modules below: Hospital has them all, Standalone Lab "
                          "none of them. Choose Custom to pick them yourself, e.g. a lab that also "
                          "does imaging."),
        ),
        migrations.AddField(
            model_name='company',
            name='enabled_modules',
            field=models.JSONField(
                blank=True, default=company.models.all_modules,
                help_text="Switchable modules this facility has. Set from the facility type "
                          "unless that is Custom."),
        ),
        migrations.AddField(
            model_name='company',
            name='kra_pin',
            field=models.CharField(
                blank=True, default='', max_length=20,
                help_text="The facility's KRA PIN, printed on invoices and sent to eTIMS."),
        ),
        migrations.RunPython(modules_from_facility_type, migrations.RunPython.noop),
    ]
