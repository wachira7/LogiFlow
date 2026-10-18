import requests

def geocode_address(address: str) -> tuple[float, float] | None:
    """Returns (lat, lng) or None if geocoding fails."""
    try:
        response = requests.get(
            'https://nominatim.openstreetmap.org/search',
            params={
                'q': address,
                'format': 'json',
                'limit': 1,
                #'countrycodes': 'ke',  # bias to Kenya, remove if needed
            },
            headers={'User-Agent': 'LogiFlow/1.0'},
            timeout=5,
        )
        data = response.json()
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
    except Exception:
        pass
    return None

def mark_shipment_delivered(shipment, delivered_at):
    """Mark a shipment delivered, and its order too once all of the order's shipments are delivered."""
    shipment.status = 'DELIVERED'
    shipment.actual_delivery = delivered_at
    shipment.save()

    order = shipment.order
    if order and not order.shipments.exclude(status='DELIVERED').exists():
        order.status = 'DELIVERED'
        order.save()
