import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('laboratory', '0029_referred_samples'),
        ('patient', '0013_referred_and_estimated_age'),
    ]

    operations = [
        migrations.CreateModel(
            name='OutboundMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('channel', models.CharField(choices=[('sms', 'SMS'), ('whatsapp', 'WhatsApp'), ('email', 'Email')], max_length=10)),
                ('recipient', models.CharField(max_length=254)),
                ('subject', models.CharField(blank=True, default='', max_length=200)),
                ('body', models.TextField()),
                ('dedupe_key', models.CharField(max_length=200, unique=True)),
                ('status', models.CharField(choices=[('queued', 'Queued'), ('sent', 'Sent'), ('failed', 'Failed'), ('skipped', 'Not sent: channel not set up')], default='queued', max_length=10)),
                ('attempts', models.PositiveIntegerField(default=0)),
                ('provider_reference', models.CharField(blank=True, default='', max_length=200)),
                ('error', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('lab_results', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='laboratory.processtestrequest')),
                ('patient', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='patient.patient')),
            ],
            options={'ordering': ['-created_at'], 'indexes': [models.Index(fields=['status'], name='outbound_message_status_idx')]},
        ),
    ]
