import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0023_remove_item_lab_test_item'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='requisition',
            name='requested_by',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='req_requested_by', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='purchaseorder',
            name='ordered_by',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='ordered_by', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='purchaseorder',
            name='approved_by',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name='po_approved_by', to=settings.AUTH_USER_MODEL),
        ),
    ]
