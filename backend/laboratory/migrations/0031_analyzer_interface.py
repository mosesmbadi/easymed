import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('laboratory', '0030_protect_user_on_lab_test_request'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='labequipment',
            name='sender_id',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='labequipment',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.CreateModel(
            name='AnalyzerTestMapping',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('analyzer_code', models.CharField(max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('equipment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='test_mappings', to='laboratory.labequipment')),
                ('test_panel', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='analyzer_mappings', to='laboratory.labtestpanel')),
            ],
            options={
                'ordering': ['analyzer_code'],
            },
        ),
        migrations.AddConstraint(
            model_name='analyzertestmapping',
            constraint=models.UniqueConstraint(fields=('equipment', 'analyzer_code'), name='unique_analyzer_code_per_equipment'),
        ),
        migrations.CreateModel(
            name='AnalyzerMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sender', models.CharField(blank=True, default='', max_length=100)),
                ('sample_code', models.CharField(blank=True, db_index=True, default='', max_length=100)),
                ('patient_name', models.CharField(blank=True, default='', max_length=255)),
                ('raw_message', models.TextField(blank=True, default='')),
                ('received_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('equipment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='messages', to='laboratory.labequipment')),
            ],
            options={
                'ordering': ['-received_at'],
            },
        ),
        migrations.CreateModel(
            name='AnalyzerResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('analyzer_code', models.CharField(max_length=50)),
                ('value', models.CharField(blank=True, default='', max_length=255)),
                ('unit', models.CharField(blank=True, default='', max_length=50)),
                ('flag', models.CharField(blank=True, default='', max_length=20)),
                ('reference_range', models.CharField(blank=True, default='', max_length=50)),
                ('status', models.CharField(choices=[('posted', 'Posted'), ('no_sample', 'No sample code'), ('sample_not_found', 'Sample not found'), ('unmapped', 'Code not mapped'), ('not_requested', 'Test not requested'), ('already_approved', 'Result already approved'), ('invalid', 'Invalid value'), ('ignored', 'Ignored')], db_index=True, max_length=20)),
                ('detail', models.CharField(blank=True, default='', max_length=255)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('lab_test_request_panel', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='analyzer_results', to='laboratory.labtestrequestpanel')),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='results', to='laboratory.analyzermessage')),
                ('resolved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='resolved_analyzer_results', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-message__received_at', 'id'],
            },
        ),
    ]
