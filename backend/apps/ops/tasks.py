# apps/ops/tasks.py
from celery import shared_task

from . import services


@shared_task
def raise_delay_exceptions():
    """Open DELAY exceptions for shipments past their ETA (every 10 minutes)."""
    return services.raise_delay_exceptions()
