# apps/ops/services.py
"""
Operations logic shared by the ops endpoints, distribution hooks and background tasks:
exceptions, vehicle assignment, driver location, proof of delivery and public tracking.
"""
import base64
import binascii
import logging
import uuid
from datetime import timedelta

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

from apps.distribution.events import record_event
from apps.distribution.models import DeliveryException, DeliveryRoute, LocationPing, ProofOfDelivery, RouteStop, Shipment, Vehicle

from . import geo

LIVE_PING_MINUTES = 15          # a position older than this isn't "live"
DELAY_GRACE = timedelta(minutes=30)
MAX_IMAGE_BYTES = 5 * 1024 * 1024
SHIPMENT_STEPS = ['PENDING', 'PICKED', 'PACKED', 'SHIPPED', 'DELIVERED']
log = logging.getLogger(__name__)


class OpsError(Exception):
    """An operation that isn't allowed; the message is shown to the user."""


# ── exceptions ──────────────────────────────────────────────────────────────

def raise_exception(company, *, exception_type, title, user=None, shipment=None, route=None, route_stop=None,
                    severity='MEDIUM', description='', owner=None, recommended_action=''):
    exc = DeliveryException.objects.create(
        company=company, shipment=shipment, route=route or (route_stop.route if route_stop else None), route_stop=route_stop,
        exception_type=exception_type, severity=severity, title=title[:255], description=description,
        recommended_action=recommended_action, owner=owner, reported_by=user if getattr(user, 'is_authenticated', False) else None,
    )
    if shipment:
        record_event(shipment, 'EXCEPTION_RAISED', actor=user, message=f'{exc.get_exception_type_display()}: {exc.title}',
                     data={'exception_id': str(exc.id), 'severity': severity})
    return exc


def set_exception_status(exc, status, user, notes=''):
    allowed = {
        'ACKNOWLEDGED': ('OPEN',),
        'RESOLVED': ('OPEN', 'ACKNOWLEDGED'),
        'DISMISSED': ('OPEN', 'ACKNOWLEDGED'),
        'OPEN': ('RESOLVED', 'DISMISSED'),
    }
    if exc.status not in allowed[status]:
        raise OpsError(f'This exception is {exc.get_status_display().lower()}, so it can’t be {status.lower()}.')
    exc.status = status
    if status in ('RESOLVED', 'DISMISSED'):
        exc.resolved_by, exc.resolved_at, exc.resolution_notes = user, timezone.now(), notes
    elif status == 'OPEN':
        exc.resolved_by, exc.resolved_at = None, None
    elif status == 'ACKNOWLEDGED' and exc.owner_id is None:
        exc.owner = user  # whoever picks it up owns it
    exc.save()
    if exc.shipment_id and status in ('RESOLVED', 'DISMISSED'):
        record_event(exc.shipment, 'EXCEPTION_RESOLVED', actor=user,
                     message=f'{exc.title} {"resolved" if status == "RESOLVED" else "dismissed"}' + (f': {notes}' if notes else ''),
                     data={'exception_id': str(exc.id)})
    return exc


def raise_delay_exceptions(company=None, now=None):
    """Open a DELAY exception for each shipment past its ETA that doesn't have one. Idempotent."""
    now = now or timezone.now()
    late = Shipment.objects.filter(status='SHIPPED', estimated_delivery__lt=now - DELAY_GRACE)
    if company is not None:
        late = late.filter(company=company)
    late = late.exclude(exceptions__exception_type='DELAY', exceptions__status__in=DeliveryException.OPEN_STATUSES)
    created = 0
    for shipment in late.select_related('company'):
        hours = (now - shipment.estimated_delivery).total_seconds() / 3600
        raise_exception(
            shipment.company, shipment=shipment, exception_type='DELAY', severity='HIGH' if hours >= 24 else 'MEDIUM',
            title=f'{shipment.shipment_number} is past its delivery time',
            description=f'Expected {shipment.estimated_delivery:%d %b %H:%M}; still on the road.',
            recommended_action='Call the driver or carrier for a new ETA and update the customer.',
        )
        created += 1
    return created


# ── fleet ───────────────────────────────────────────────────────────────────

def last_ping(**filters):
    return LocationPing.objects.filter(**filters).order_by('-recorded_at').first()


def ping_payload(ping):
    if not ping:
        return None
    age = (timezone.now() - ping.recorded_at).total_seconds() / 60
    return {'latitude': float(ping.latitude), 'longitude': float(ping.longitude), 'speed_kmh': ping.speed_kmh,
            'heading': ping.heading, 'accuracy_m': ping.accuracy_m, 'recorded_at': ping.recorded_at, 'live': age <= LIVE_PING_MINUTES}


def route_progress(route):
    if not route:
        return None
    stops = list(route.route_stops.order_by('stop_number'))
    nxt = next((s for s in stops if s.status in ('PENDING', 'ARRIVED')), None)
    return {
        'id': str(route.id), 'name': route.route_name, 'status': route.status,
        'done': sum(s.status in ('COMPLETED', 'FAILED') for s in stops), 'total': len(stops),
        'next_stop': {'id': str(nxt.id), 'number': nxt.stop_number, 'address': nxt.address, 'status': nxt.status,
                      'latitude': float(nxt.latitude) if nxt.latitude is not None else None,
                      'longitude': float(nxt.longitude) if nxt.longitude is not None else None} if nxt else None,
    }


def active_route_for(driver=None, vehicle=None):
    qs = DeliveryRoute.objects.filter(status='IN_PROGRESS').order_by('-start_time')
    if vehicle is not None:
        route = qs.filter(fleet_vehicle=vehicle).first()
        if route:
            return route
    return qs.filter(driver=driver).first() if driver is not None else None


def record_pings(user, rows):
    """Store GPS positions from a driver's device. Attaches the driver's running route and its vehicle."""
    route = active_route_for(driver=user)
    vehicle = (route.fleet_vehicle if route and route.fleet_vehicle_id else None) or Vehicle.objects.filter(
        company=user.company, default_driver=user).exclude(status='INACTIVE').first()
    now = timezone.now()
    pings = [LocationPing(
        company=user.company, driver=user, route=route, vehicle=vehicle,
        latitude=round(r['latitude'], 6), longitude=round(r['longitude'], 6), accuracy_m=r.get('accuracy_m'),
        speed_kmh=r.get('speed_kmh'), heading=r.get('heading'), recorded_at=min(r.get('recorded_at') or now, now),
    ) for r in rows]
    LocationPing.objects.bulk_create(pings)
    return pings, route, vehicle


def set_vehicle_status_for_route(route):
    """Vehicles on a running route are in use; they free up when it ends."""
    vehicle = route.fleet_vehicle
    if not vehicle or vehicle.status in ('MAINTENANCE', 'INACTIVE'):
        return
    busy = route.status == 'IN_PROGRESS' or DeliveryRoute.objects.filter(fleet_vehicle=vehicle, status='IN_PROGRESS').exclude(pk=route.pk).exists()
    status = 'IN_USE' if busy else 'AVAILABLE'
    if vehicle.status != status:
        vehicle.status = status
        vehicle.save(update_fields=['status', 'updated_at'])


# ── proof of delivery ───────────────────────────────────────────────────────

def _image(value, name):
    """Accept an uploaded image file or a data URL (what a signature pad produces)."""
    if not value:
        return None
    if isinstance(value, str):
        if not value.startswith('data:image/'):
            raise OpsError('The signature must be an image.')
        header, _, encoded = value.partition(',')
        ext = header.split('/')[1].split(';')[0] or 'png'
        try:
            raw = base64.b64decode(encoded, validate=True)
        except (binascii.Error, ValueError):
            raise OpsError('The signature image couldn’t be read.')
        if len(raw) > MAX_IMAGE_BYTES:
            raise OpsError('Images must be under 5 MB.')
        return ContentFile(raw, name=f'{name}-{uuid.uuid4().hex[:8]}.{ext[:4]}')
    if getattr(value, 'size', 0) > MAX_IMAGE_BYTES:
        raise OpsError('Images must be under 5 MB.')
    if not (getattr(value, 'content_type', '') or '').startswith('image/'):
        raise OpsError('Photos must be images.')
    return value


def capture_proof(shipment, user, *, recipient_name='', signature=None, photo=None, latitude=None, longitude=None,
                  notes='', stop=None):
    if shipment.status not in ('SHIPPED', 'DELIVERED') and not (stop and stop.status == 'ARRIVED'):
        raise OpsError('Proof of delivery is captured when the shipment is out for delivery or delivered.')
    if not (recipient_name.strip() or signature or photo):
        raise OpsError('Add who received it, a signature or a photo.')
    proof = ProofOfDelivery(shipment=shipment, route_stop=stop, recipient_name=recipient_name.strip()[:255], notes=notes,
                            latitude=latitude, longitude=longitude, captured_by=user)
    sig, pic = _image(signature, 'signature'), _image(photo, 'photo')
    with transaction.atomic():
        try:
            if sig:
                proof.signature.save(sig.name, sig, save=False)
            if pic:
                proof.photo.save(getattr(pic, 'name', 'photo.jpg'), pic, save=False)
        except Exception as exc:  # storage outage or misconfiguration: tell the driver, keep the details in the log
            log.exception('Saving proof-of-delivery image failed: %s', exc)
            raise OpsError('The signature or photo couldn’t be saved. Check your connection and try again.')
        proof.save()
        record_event(shipment, 'PROOF_OF_DELIVERY', actor=user,
                     message='Proof of delivery captured' + (f': received by {proof.recipient_name}' if proof.recipient_name else ''),
                     data={'proof_id': str(proof.id)})
    return proof


def proof_payload(proof, request=None):
    def url(f):
        if not f:
            return None
        try:
            u = f.url
        except Exception:
            return None
        return request.build_absolute_uri(u) if request and u.startswith('/') else u
    return {'id': str(proof.id), 'recipient_name': proof.recipient_name, 'signature_url': url(proof.signature),
            'photo_url': url(proof.photo), 'latitude': float(proof.latitude) if proof.latitude is not None else None,
            'longitude': float(proof.longitude) if proof.longitude is not None else None, 'notes': proof.notes,
            'captured_by': proof.captured_by.get_full_name() if proof.captured_by else None, 'captured_at': proof.captured_at,
            'stop_id': str(proof.route_stop_id) if proof.route_stop_id else None}


# ── public tracking ─────────────────────────────────────────────────────────

def _area(address):
    """Only the last part of an address (town or area) is shown publicly."""
    parts = [p.strip() for p in (address or '').replace('\n', ',').split(',') if p.strip()]
    return ', '.join(parts[-2:]) if len(parts) > 1 else (parts[0] if parts else '')


PUBLIC_EVENT_TEXT = {
    'CREATED': 'Order received',
    'STOP_ARRIVED': 'The driver has arrived',
    'STOP_FAILED': 'We couldn’t complete the delivery. We’ll be in touch to rearrange it.',
    'PROOF_OF_DELIVERY': 'Signed for',
}
PUBLIC_STATUS_TEXT = {
    'PICKED': 'Your items are being picked', 'PACKED': 'Packed and ready to go', 'SHIPPED': 'On its way',
    'DELIVERED': 'Delivered', 'FAILED': 'Delivery attempt failed', 'RETURNED': 'Returned to the sender', 'CANCELLED': 'Cancelled',
}


def public_tracking(shipment, request=None):
    company = shipment.company
    stop = shipment.route_stops.select_related('route', 'route__fleet_vehicle').exclude(route__status='CANCELLED').order_by('-created_at').first()
    live = None
    if shipment.status == 'SHIPPED' and stop and stop.route.status == 'IN_PROGRESS' and stop.status in ('PENDING', 'ARRIVED'):
        ping = last_ping(route=stop.route) or (last_ping(driver_id=stop.route.driver_id) if stop.route.driver_id else None)
        p = ping_payload(ping)
        if p and p['live']:
            before = stop.route.route_stops.filter(stop_number__lt=stop.stop_number, status__in=('PENDING', 'ARRIVED')).count()
            target = (stop.latitude, stop.longitude) if stop.latitude is not None else (
                (shipment.destination_latitude, shipment.destination_longitude) if shipment.destination_latitude is not None else None)
            minutes = geo.travel_minutes((p['latitude'], p['longitude']), target) if target else None
            # every stop before yours adds roughly ten minutes
            live = {'latitude': round(p['latitude'], 3), 'longitude': round(p['longitude'], 3), 'recorded_at': p['recorded_at'],
                    'stops_before_you': before, 'eta_minutes': (minutes + before * 10) if minutes is not None else None,
                    'arrived': stop.status == 'ARRIVED'}
    reached = SHIPMENT_STEPS.index(shipment.status) if shipment.status in SHIPMENT_STEPS else -1
    proof = shipment.proofs.order_by('-captured_at').first()
    logo = None
    if company.logo:
        try:
            logo = company.logo.url
        except Exception:
            logo = None
    events = []
    for e in shipment.events.filter(event_type__in=PUBLIC_EVENT_TEXT.keys() | {'STATUS_CHANGED'}).order_by('-occurred_at')[:30]:
        # fixed wording only: internal messages can carry staff notes
        text = PUBLIC_STATUS_TEXT.get(e.to_status) if e.event_type == 'STATUS_CHANGED' else PUBLIC_EVENT_TEXT[e.event_type]
        if text and not (events and events[-1]['message'] == text):
            events.append({'type': e.event_type, 'message': text, 'occurred_at': e.occurred_at})
    return {
        'shipment_number': shipment.shipment_number,
        'status': shipment.status,
        'status_label': shipment.get_status_display(),
        'steps': [{'key': k, 'label': lbl, 'done': reached >= i} for i, (k, lbl) in enumerate(
            [('PENDING', 'Order received'), ('PICKED', 'Picked'), ('PACKED', 'Packed'), ('SHIPPED', 'On the way'), ('DELIVERED', 'Delivered')])],
        'carrier': shipment.carrier,
        'tracking_number': shipment.tracking_number,
        'estimated_delivery': shipment.estimated_delivery,
        'actual_delivery': shipment.actual_delivery,
        'is_delayed': shipment.is_delayed,
        'destination_area': _area(shipment.destination_address or (shipment.order.shipping_address if shipment.order_id else '')),
        'recipient_first_name': (shipment.recipient_name or (shipment.order.customer_name if shipment.order_id else '') or '').split(' ')[0],
        'company': {'name': company.name, 'logo_url': logo, 'phone': company.phone},
        'live': live,
        'proof': {'recipient_name': proof.recipient_name, 'captured_at': proof.captured_at} if proof else None,
        'events': events[:20],
    }
