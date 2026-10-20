# realtime/broadcast.py
"""
Publish live events to everyone in a company (or one user). Safe to call from anywhere:
it waits for the surrounding transaction to commit, and never raises into the caller.
"""
import logging

from asgiref.sync import async_to_sync
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction
from django.utils import timezone
import json

log = logging.getLogger(__name__)


def company_group(company_id):
    return f'company.{company_id}'


def user_group(user_id):
    return f'user.{user_id}'


def _send(group, event, data):
    from channels.layers import get_channel_layer

    layer = get_channel_layer()
    if layer is None:
        return
    try:
        # round-trip through JSON so UUIDs, decimals and datetimes arrive as plain values
        payload = json.loads(json.dumps(data, cls=DjangoJSONEncoder))
        async_to_sync(layer.group_send)(group, {'type': 'realtime.event', 'event': event, 'data': payload, 'at': timezone.now().isoformat()})
    except Exception as exc:  # realtime is best-effort; the request must still succeed
        log.warning('Realtime publish %s failed: %s', event, exc)


def publish(company_id, event, data, *, user_id=None):
    if not getattr(settings, 'REALTIME_ENABLED', True) or not company_id:
        return
    group = user_group(user_id) if user_id else company_group(company_id)
    transaction.on_commit(lambda: _send(group, event, data))
