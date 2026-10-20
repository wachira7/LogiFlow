import secrets

from django.db import migrations, models

import apps.distribution.models


def backfill(apps, schema_editor):
    Shipment = apps.get_model('distribution', 'Shipment')
    for shipment in Shipment.objects.filter(public_token__isnull=True).only('pk'):
        shipment.public_token = secrets.token_urlsafe(16)
        shipment.save(update_fields=['public_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('distribution', '0007_shipment_stock_deducted'),
    ]

    operations = [
        migrations.AddField(
            model_name='shipment',
            name='public_token',
            field=models.CharField(editable=False, max_length=32, null=True),
        ),
        migrations.RunPython(backfill, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='shipment',
            name='public_token',
            field=models.CharField(default=apps.distribution.models.new_public_token, editable=False, max_length=32, unique=True),
        ),
    ]
