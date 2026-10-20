def geocode_address(address: str) -> tuple[float, float] | None:
    """Returns (lat, lng) or None. Kept for older callers; use apps.ops.geo.geocode."""
    from apps.ops.geo import geocode
    return geocode(address)

def mark_shipment_delivered(shipment, delivered_at, actor=None):
    """Mark a shipment delivered, and its order too once all of the order's shipments are delivered."""
    from .events import record_status_change

    previous = shipment.status
    shipment.status = 'DELIVERED'
    shipment.actual_delivery = delivered_at
    shipment.save()
    record_status_change(shipment, previous, actor=actor, message='Delivered', occurred_at=delivered_at)

    order = shipment.order
    if order and not order.shipments.exclude(status='DELIVERED').exists():
        order.status = 'DELIVERED'
        order.save()
