# apps/ops/geo.py
"""
Geocoding and travel-time estimates behind one small adapter, so the provider can change
without touching callers.

Defaults are free and open source: Nominatim (OpenStreetMap) for geocoding and straight-line
distance at an average speed for ETAs. For production traffic, point GEO_PROVIDER /
ROUTING_PROVIDER at a hosted or self-hosted service (e.g. OSRM) via settings.
"""
import hashlib
import logging
import math
import time

import requests
from django.conf import settings
from django.core.cache import cache

log = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6371.0
_GEOCODE_TTL = 60 * 60 * 24 * 30  # addresses rarely move
_MISS_TTL = 60 * 60 * 6           # don't hammer the provider for addresses it can't find


def _setting(name, default):
    return getattr(settings, name, default)


def haversine_km(a, b):
    """Great-circle distance between two (lat, lng) points in km."""
    lat1, lng1 = map(math.radians, map(float, a))
    lat2, lng2 = map(math.radians, map(float, b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(h))


def _nominatim(address):
    # Nominatim's usage policy: at most one request per second and an identifying User-Agent
    with cache.lock('geo:nominatim', timeout=10) if hasattr(cache, 'lock') else _NoLock():
        wait = 1.1 - (time.monotonic() - _NOMINATIM_LAST[0])
        if wait > 0:
            time.sleep(wait)
        try:
            r = requests.get(
                _setting('NOMINATIM_URL', 'https://nominatim.openstreetmap.org/search'),
                params={'q': address, 'format': 'json', 'limit': 1, **({'countrycodes': c} if (c := _setting('GEO_COUNTRY_CODES', '')) else {})},
                headers={'User-Agent': f"LogiFlow/1.0 ({_setting('GEO_CONTACT_EMAIL', 'ops@logiflow.app')})"},
                timeout=5,
            )
            r.raise_for_status()
            data = r.json()
        finally:
            _NOMINATIM_LAST[0] = time.monotonic()
    return (float(data[0]['lat']), float(data[0]['lon'])) if data else None


class _NoLock:
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


_NOMINATIM_LAST = [0.0]
_PROVIDERS = {'nominatim': _nominatim}


def geocode(address):
    """(lat, lng) for an address, or None. Cached; never raises."""
    address = (address or '').strip()
    provider = _setting('GEO_PROVIDER', 'nominatim')
    if not address or provider == 'none' or provider not in _PROVIDERS:
        return None
    key = 'geo:' + hashlib.sha1(f'{provider}:{address.lower()}'.encode()).hexdigest()
    hit = cache.get(key)
    if hit is not None:
        return tuple(hit) if hit else None
    try:
        coords = _PROVIDERS[provider](address)
    except Exception as exc:  # network trouble must never break a request
        log.warning('Geocoding failed for %r: %s', address[:80], exc)
        return None
    cache.set(key, list(coords) if coords else [], _GEOCODE_TTL if coords else _MISS_TTL)
    return coords


def _osrm_minutes(a, b):
    base = _setting('OSRM_URL', '').rstrip('/')
    r = requests.get(f'{base}/route/v1/driving/{float(a[1])},{float(a[0])};{float(b[1])},{float(b[0])}',
                     params={'overview': 'false'}, timeout=4)
    r.raise_for_status()
    routes = r.json().get('routes') or []
    return routes[0]['duration'] / 60 if routes else None


def travel_minutes(a, b):
    """Estimated driving minutes from a to b ((lat, lng) pairs), or None if a point is missing."""
    if not a or not b or None in (*a, *b):
        return None
    if _setting('ROUTING_PROVIDER', 'straight_line') == 'osrm' and _setting('OSRM_URL', ''):
        try:
            minutes = _osrm_minutes(a, b)
            if minutes is not None:
                return round(minutes)
        except Exception as exc:
            log.warning('OSRM routing failed: %s', exc)
    # Roads are longer than a straight line; 1.3 is a common detour factor for towns
    km = haversine_km(a, b) * 1.3
    speed = float(_setting('OPS_AVERAGE_SPEED_KMH', 30)) or 30
    return round(km / speed * 60)
