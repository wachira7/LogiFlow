# apps/platform_admin/health.py
"""
Live system health for platform admins: every figure is measured when asked (no stored or invented numbers).
Configuration checks report only whether something is set up and in which mode, never secret values.
"""
import os
import platform
import shutil
import time
from datetime import timedelta

import django
from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.utils import timezone

PROCESS_STARTED = time.time()
WORST = {'ok': 0, 'warn': 1, 'fail': 2}


def _check(key, label, fn):
    started = time.perf_counter()
    try:
        status, detail = fn()
    except Exception as exc:  # a failing check is itself the result
        status, detail = 'fail', f'{type(exc).__name__}: {str(exc)[:160]}'
    return {'key': key, 'label': label, 'status': status, 'detail': detail,
            'latency_ms': round((time.perf_counter() - started) * 1000, 1)}


def _database():
    t = time.perf_counter()
    with connection.cursor() as cursor:
        cursor.execute('SELECT 1')
        cursor.fetchone()
    ms = (time.perf_counter() - t) * 1000
    return ('ok' if ms < 100 else 'warn'), f'{connection.vendor} answered in {ms:.0f} ms'


def _cache():
    key = f'health:{time.time()}'
    cache.set(key, 'ok', 10)
    ok = cache.get(key) == 'ok'
    cache.delete(key)
    backend = settings.CACHES.get('default', {}).get('BACKEND', '').rsplit('.', 1)[-1]
    return ('ok' if ok else 'fail'), f'{backend} read/write {"works" if ok else "failed"}'


def _workers():
    from logistics_project.celery import app
    with app.connection_for_write() as conn:
        conn.ensure_connection(max_retries=1, timeout=2)  # fail fast if the broker is down
    replies = app.control.ping(timeout=1.0) or []
    if not replies:
        return 'warn', 'No background worker answered (scheduled billing and emails won’t run)'
    return 'ok', f'{len(replies)} worker{"s" if len(replies) != 1 else ""} online'


def _disk():
    usage = shutil.disk_usage(settings.BASE_DIR)
    pct = usage.used / usage.total * 100
    status = 'ok' if pct < 80 else 'warn' if pct < 92 else 'fail'
    return status, f'{pct:.0f}% used, {usage.free / 1e9:.1f} GB free'


def _mode(key_value, test_prefixes=('sk_test', 'pk_test')):
    if not key_value:
        return None
    return 'test' if key_value.startswith(test_prefixes) else 'live'


def _providers():
    """Configured or not, and test or live mode (never the keys themselves)."""
    stripe = _mode(getattr(settings, 'STRIPE_SECRET_KEY', ''))
    mpesa = 'sandbox' if getattr(settings, 'MPESA_ENVIRONMENT', 'sandbox') == 'sandbox' else 'live'
    mpesa_ready = bool(getattr(settings, 'MPESA_CONSUMER_KEY', '') and getattr(settings, 'MPESA_PASSKEY', ''))
    crypto_ready = bool(getattr(settings, 'NOWPAYMENTS_API_KEY', ''))
    crypto = 'sandbox' if getattr(settings, 'NOWPAYMENTS_ENVIRONMENT', 'sandbox') == 'sandbox' else 'live'
    email = os.getenv('EMAIL_PROVIDER') or ('resend' if os.getenv('RESEND_API_KEY') else 'smtp')
    return [
        {'key': 'stripe', 'label': 'Stripe (cards)', 'configured': bool(stripe), 'mode': stripe,
         'webhook': bool(getattr(settings, 'STRIPE_WEBHOOK_SECRET', ''))},
        {'key': 'mpesa', 'label': 'M-Pesa', 'configured': mpesa_ready, 'mode': mpesa if mpesa_ready else None,
         'webhook': bool(getattr(settings, 'MPESA_CALLBACK_TOKEN', ''))},
        {'key': 'crypto', 'label': 'NOWPayments (crypto)', 'configured': crypto_ready, 'mode': crypto if crypto_ready else None,
         'webhook': bool(getattr(settings, 'NOWPAYMENTS_IPN_SECRET', ''))},
        {'key': 'email', 'label': 'Email', 'configured': bool(os.getenv('RESEND_API_KEY') or os.getenv('EMAIL_HOST_PASSWORD')),
         'mode': email, 'webhook': None},
        {'key': 'storage', 'label': 'File storage', 'configured': bool(os.getenv('CLOUDINARY_URL') or os.getenv('CLOUDINARY_CLOUD_NAME')),
         'mode': 'cloudinary' if (os.getenv('CLOUDINARY_URL') or os.getenv('CLOUDINARY_CLOUD_NAME')) else 'local', 'webhook': None},
    ]


def _signals():
    """Things in the data that need a human: failed payments, stuck payments, unpaid subscriptions."""
    from apps.payments.models import PaymentTransaction, UserSubscription
    now = timezone.now()
    return {
        'failed_payments_24h': PaymentTransaction.objects.filter(status='FAILED', updated_at__gte=now - timedelta(hours=24)).count(),
        'stuck_pending_payments': PaymentTransaction.objects.filter(status='PENDING', created_at__lt=now - timedelta(hours=1)).count(),
        'past_due_subscriptions': UserSubscription.objects.filter(status='PAST_DUE').count(),
    }


def system_health():
    checks = [
        _check('database', 'Database', _database),
        _check('cache', 'Cache', _cache),
        _check('workers', 'Background workers', _workers),
        _check('disk', 'Disk', _disk),
    ]
    providers = _providers()
    signals = _signals()
    overall = max((c['status'] for c in checks), key=WORST.get)
    if overall == 'ok' and (signals['stuck_pending_payments'] or any(p['key'] != 'storage' and not p['configured'] for p in providers)):
        overall = 'warn'
    return {
        'overall_status': {'ok': 'HEALTHY', 'warn': 'WARNING', 'fail': 'CRITICAL'}[overall],
        'checks': checks,
        'providers': providers,
        'signals': signals,
        'runtime': {
            'python': platform.python_version(),
            'django': django.get_version(),
            'debug': settings.DEBUG,
            'process_uptime_seconds': int(time.time() - PROCESS_STARTED),
            'release': os.getenv('NF_DEPLOYMENT_SHA') or os.getenv('GIT_SHA') or os.getenv('RELEASE') or None,
        },
        'checked_at': timezone.now().isoformat(),
    }
