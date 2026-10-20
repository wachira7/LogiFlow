# apps/demo/services.py
"""
"Try the live demo": every visitor gets a private, pre-filled company that's deleted after a day.
Demo users have no usable password; they're signed in with tokens when the demo starts.
"""
import logging
import math
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.tenants.models import Company, CompanySetting
from apps.users.models import User

from .seed import Seeder

log = logging.getLogger(__name__)
DEMO_EMAIL_DOMAIN = 'demo.logiflow.invalid'  # reserved TLD: nothing can ever be delivered to it


class DemoUnavailable(Exception):
    pass


def lifetime():
    return timedelta(hours=getattr(settings, 'DEMO_LIFETIME_HOURS', 24))


def _user(company, tag, first, last, **flags):
    handle = f'{tag}-{secrets.token_hex(5)}'
    u = User(email=f'{handle}@{DEMO_EMAIL_DOMAIN}', username=handle, first_name=first, last_name=last, company=company, **flags)
    u.set_unusable_password()
    u.save()
    return u


def start_demo():
    """Create and fill a demo company; returns its owner (signed in by the caller)."""
    if Company.objects.filter(is_demo=True).count() >= getattr(settings, 'DEMO_MAX_ACTIVE', 300):
        raise DemoUnavailable('The demo is very busy right now. Please try again in a few minutes.')
    suffix = secrets.token_hex(3)
    with transaction.atomic():
        company = Company.objects.create(
            name='Savannah Logistics (demo)', slug=f'demo-{suffix}', email=f'hello-{suffix}@{DEMO_EMAIL_DOMAIN}',
            phone='+254700000000', address='Enterprise Rd, Industrial Area, Nairobi', industry='Distribution', company_size='11-50',
            timezone='Africa/Nairobi', onboarding_completed=True, is_demo=True, demo_expires_at=timezone.now() + lifetime(),
        )
        CompanySetting.objects.update_or_create(company=company, defaults={'currency': 'KES', 'timezone': 'Africa/Nairobi', 'date_format': 'DD/MM/YYYY'})
        owner = _user(company, 'demo', 'Jordan', 'Kamau', is_company_owner=True, phone_number='+254711000101')
        driver = _user(company, 'driver', 'Brian', 'Otieno', is_driver=True, phone_number='+254711000202')
        Seeder(company, owner, driver).run()
    return owner


def counterpart(user, role):
    """The other demo persona in the same company: 'driver' or 'owner'."""
    if not (user.company_id and user.company.is_demo):
        return None
    qs = User.objects.filter(company=user.company, is_active=True)
    return (qs.filter(is_driver=True) if role == 'driver' else qs.filter(is_company_owner=True)).first()


def delete_demo_company(company):
    """Remove a demo company and everything in it (stock history first: it's protected from cascading deletes)."""
    if not company.is_demo:
        raise ValueError('Refusing to delete a real company.')
    from apps.distribution.models import ProofOfDelivery
    from apps.inventory.models import InventoryTransaction

    with transaction.atomic():
        for proof in ProofOfDelivery.objects.filter(shipment__company=company):
            for f in (proof.signature, proof.photo):
                if f:
                    try:
                        f.delete(save=False)  # don't leave demo images behind in storage
                    except Exception as exc:
                        log.warning('Could not delete demo file %s: %s', f.name, exc)
        InventoryTransaction.objects.filter(inventory_item__warehouse__company=company).delete()
        User.objects.filter(company=company).delete()
        company.delete()


def cleanup_expired(now=None):
    now = now or timezone.now()
    done = 0
    for company in Company.objects.filter(is_demo=True, demo_expires_at__lt=now):
        try:
            delete_demo_company(company)
            done += 1
        except Exception:
            log.exception('Deleting demo company %s failed', company.slug)
    return done


def simulate_fleets(step_m=350):
    """Keep demo vans moving along their running route so the live map has something to show."""
    from apps.distribution.models import DeliveryRoute, LocationPing
    from apps.ops.geo import haversine_km
    from apps.ops.services import record_pings

    moved = 0
    for route in DeliveryRoute.objects.filter(company__is_demo=True, status='IN_PROGRESS', driver__isnull=False).select_related('driver'):
        last = LocationPing.objects.filter(route=route).order_by('-recorded_at').first()
        stops = [s for s in route.route_stops.order_by('stop_number') if s.latitude is not None]
        if not last or not stops:
            continue
        pending = [s for s in stops if s.status in ('PENDING', 'ARRIVED')] or stops
        here = (float(last.latitude), float(last.longitude))
        # Head for the nearest-numbered pending stop; once there, carry on to the next one (looping)
        target = pending[0]
        if haversine_km(here, (float(target.latitude), float(target.longitude))) * 1000 < step_m:
            i = stops.index(target)
            target = stops[(i + 1) % len(stops)]
        goal = (float(target.latitude), float(target.longitude))
        dist_m = haversine_km(here, goal) * 1000
        f = min(1.0, step_m / dist_m) if dist_m else 1.0
        nxt = (here[0] + (goal[0] - here[0]) * f, here[1] + (goal[1] - here[1]) * f)
        heading = (math.degrees(math.atan2(goal[1] - here[1], goal[0] - here[0])) + 360) % 360
        record_pings(route.driver, [{'latitude': nxt[0], 'longitude': nxt[1], 'speed_kmh': 28.0, 'heading': heading,
                                     'recorded_at': timezone.now()}])
        moved += 1
    return moved

