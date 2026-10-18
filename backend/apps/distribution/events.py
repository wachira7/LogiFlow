# apps/distribution/events.py
"""Helpers that append ShipmentEvent rows; call them wherever a shipment changes."""
from django.utils import timezone

from .models import ShipmentEvent


def _user(actor):
    # Anonymous users (e.g. public endpoints) are recorded as no actor
    return actor if getattr(actor, 'is_authenticated', False) else None


def record_event(shipment, event_type, *, actor=None, message='', from_status='', to_status='', data=None,
                 occurred_at=None):
    return ShipmentEvent.objects.create(
        company_id=shipment.company_id,
        shipment=shipment,
        event_type=event_type,
        actor=_user(actor),
        message=message,
        from_status=from_status,
        to_status=to_status,
        data=data or {},
        occurred_at=occurred_at or timezone.now(),
    )


def record_status_change(shipment, from_status, *, actor=None, message='', data=None, occurred_at=None):
    """Record a status change, skipping no-op transitions."""
    if from_status == shipment.status:
        return None
    return record_event(
        shipment, 'STATUS_CHANGED', actor=actor, message=message or f'Status changed to {shipment.get_status_display()}',
        from_status=from_status, to_status=shipment.status, data=data, occurred_at=occurred_at,
    )
