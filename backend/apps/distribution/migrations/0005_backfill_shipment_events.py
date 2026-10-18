"""Give shipments that existed before ShipmentEvent a starting history (created, shipped, delivered)."""
from django.db import migrations


def backfill(apps, schema_editor):
    Shipment = apps.get_model('distribution', 'Shipment')
    ShipmentEvent = apps.get_model('distribution', 'ShipmentEvent')
    events = []
    for s in Shipment.objects.filter(events__isnull=True).iterator():
        base = {'company_id': s.company_id, 'shipment_id': s.id, 'data': {'backfilled': True}}
        events.append(ShipmentEvent(event_type='CREATED', message='Shipment created', occurred_at=s.created_at, **base))
        if s.shipping_date:
            events.append(ShipmentEvent(event_type='STATUS_CHANGED', to_status='SHIPPED', message='Shipped',
                                        occurred_at=s.shipping_date, **base))
        if s.actual_delivery:
            events.append(ShipmentEvent(event_type='STATUS_CHANGED', to_status='DELIVERED', message='Delivered',
                                        occurred_at=s.actual_delivery, **base))
    ShipmentEvent.objects.bulk_create(events, batch_size=500)


def remove_backfill(apps, schema_editor):
    apps.get_model('distribution', 'ShipmentEvent').objects.filter(data__backfilled=True).delete()


class Migration(migrations.Migration):
    dependencies = [('distribution', '0004_logistics_models')]
    operations = [migrations.RunPython(backfill, remove_backfill)]
