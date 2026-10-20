# apps/demo/tasks.py
from celery import shared_task

from . import services


@shared_task
def cleanup_expired_demos():
    """Delete demo companies past their lifetime (hourly)."""
    return services.cleanup_expired()


@shared_task
def simulate_demo_fleets():
    """Move demo vans along their routes (every minute) so the live map is alive."""
    return services.simulate_fleets()
