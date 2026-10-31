import django.db.models.deletion
import django.utils.timezone
import django.core.validators
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('laboratory', '0028_labtestrequest_referral'),
        ('company', '0005_facility_profile'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SampleConsignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reference', models.CharField(editable=False, max_length=30, unique=True)),
                ('received_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('courier', models.CharField(blank=True, default='', max_length=150)),
                ('request_form', models.FileField(blank=True, max_length=254, null=True, upload_to='Lab Test Requests/referred', validators=[django.core.validators.FileExtensionValidator(allowed_extensions=['pdf', 'png', 'jpg', 'jpeg'])])),
                ('note', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('facility', models.ForeignKey(help_text="The referring facility's credit account.", on_delete=django.db.models.deletion.PROTECT, related_name='consignments', to='company.insurancecompany')),
                ('received_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-received_at']},
        ),
        migrations.AddField(
            model_name='labtestrequest',
            name='consignment',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='requests', to='laboratory.sampleconsignment'),
        ),
        migrations.AddField(
            model_name='labtestrequest',
            name='external_reference',
            field=models.CharField(blank=True, default='', max_length=60),
        ),
        migrations.AddField(
            model_name='patientsample',
            name='collected_externally',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='patientsample',
            name='collected_by',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
        migrations.AddField(
            model_name='patientsample',
            name='received_on',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='patientsample',
            name='condition',
            field=models.CharField(blank=True, choices=[('acceptable', 'Acceptable'), ('haemolysed', 'Haemolysed'), ('clotted', 'Clotted'), ('lipaemic', 'Lipaemic'), ('insufficient', 'Insufficient volume'), ('leaked', 'Leaked or broken'), ('unlabelled', 'Unlabelled or mislabelled'), ('wrong_container', 'Wrong container'), ('delayed', 'Delayed in transit')], default='', max_length=20),
        ),
        migrations.AddField(
            model_name='patientsample',
            name='rejected',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='patientsample',
            name='rejection_reason',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='labtestrequestpanel',
            name='approved_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_results', to=settings.AUTH_USER_MODEL),
        ),
    ]
