# apps/ops/signals.py
"""Push live updates to the company's open tabs whenever operations data changes."""
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.distribution.models import DeliveryException, DeliveryRoute, ShipmentEvent, Vehicle
from apps.inventory.models import InventoryTransaction
from realtime.broadcast import publish


@receiver(post_save, sender=ShipmentEvent)
def shipment_event(sender, instance, created, **kwargs):
    if not created:
        return
    s = instance.shipment
    publish(instance.company_id, 'shipment.event', {
        'id': instance.id, 'type': instance.event_type, 'message': instance.message,
        'from_status': instance.from_status, 'to_status': instance.to_status, 'occurred_at': instance.occurred_at,
        'actor': instance.actor.get_full_name() if instance.actor_id else None,
        'shipment': {'id': s.id, 'number': s.shipment_number, 'status': s.status},
    })


@receiver(post_save, sender=DeliveryException)
def exception_changed(sender, instance, created, **kwargs):
    publish(instance.company_id, 'exception.updated', {
        'id': instance.id, 'created': created, 'title': instance.title, 'severity': instance.severity, 'status': instance.status,
        'exception_type': instance.exception_type, 'type_label': instance.get_exception_type_display(),
        'shipment_id': instance.shipment_id, 'route_id': instance.route_id, 'owner_id': instance.owner_id,
    })


@receiver(post_save, sender=Vehicle)
def vehicle_changed(sender, instance, **kwargs):
    publish(instance.company_id, 'fleet.vehicle', {'id': instance.id, 'registration': instance.registration, 'status': instance.status})


@receiver(post_save, sender=DeliveryRoute)
def route_changed(sender, instance, **kwargs):
    publish(instance.company_id, 'route.updated', {'id': instance.id, 'name': instance.route_name, 'status': instance.status,
                                                    'driver_id': instance.driver_id})


@receiver(post_save, sender=InventoryTransaction)
def stock_moved(sender, instance, created, **kwargs):
    if not created:
        return
    item = instance.inventory_item
    publish(item.warehouse.company_id, 'inventory.movement', {
        'id': instance.id, 'type': instance.transaction_type, 'quantity': instance.quantity, 'balance_after': instance.balance_after,
        'product_id': item.product_id, 'warehouse_id': item.warehouse_id, 'inventory_item_id': item.id,
    })
