# realtime/middleware.py
"""Only accept sockets from the frontend's origins (it lives on another domain than the API)."""
from urllib.parse import urlparse

from channels.security.websocket import OriginValidator
from django.conf import settings


def allowed_origins():
    origins = {o.strip() for o in getattr(settings, 'CORS_ALLOWED_ORIGINS', []) if o.strip()}
    hosts = set()
    for o in origins:
        parsed = urlparse(o)
        hosts.add(f'{parsed.scheme}://{parsed.netloc}' if parsed.scheme else o)
    return list(hosts) or ['http://localhost:3000']


def FrontendOriginValidator(app):
    if getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False):
        return OriginValidator(app, ['*'])
    return OriginValidator(app, allowed_origins())
