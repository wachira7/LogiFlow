# backend/logistics_project/celery.py
"""
Celery configuration for LogiFlow.
Handles async tasks and scheduled jobs.
"""

import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'logistics_project.settings')

app = Celery('logistics_project')

# Load config from Django settings with CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()


# ============================================================================
# CELERY BEAT SCHEDULE - Recurring Tasks
# ============================================================================

app.conf.beat_schedule = {
    # Live demo: delete expired sandboxes hourly; keep demo vans moving every minute
    'cleanup-expired-demos': {
        'task': 'apps.demo.tasks.cleanup_expired_demos',
        'schedule': crontab(minute=7),
    },
    'simulate-demo-fleets': {
        'task': 'apps.demo.tasks.simulate_demo_fleets',
        'schedule': crontab(),
    },

    # Open DELAY exceptions for shipments past their ETA
    'raise-delay-exceptions': {
        'task': 'apps.ops.tasks.raise_delay_exceptions',
        'schedule': crontab(minute='*/10'),
    },

    # Check for trial expirations daily at midnight
    'process-trial-expiration': {
        'task': 'apps.payments.tasks.process_trial_expiration',
        'schedule': crontab(hour=0, minute=0),  # Daily at midnight
    },
    
    # Process recurring billing daily at midnight
    'process-recurring-billing': {
        'task': 'apps.payments.tasks.process_recurring_billing',
        'schedule': crontab(hour=0, minute=0),  # Daily at midnight
    },
    
    # Expire past due subscriptions daily at 1 AM
    'expire-past-due-subscriptions': {
        'task': 'apps.payments.tasks.expire_past_due_subscriptions',
        'schedule': crontab(hour=1, minute=0),  # Daily at 1 AM
    },
    
    # Send trial ending reminders (3 days before)
    'send-trial-ending-reminder-3-days': {
        'task': 'apps.payments.tasks.send_trial_ending_reminder',
        'schedule': crontab(hour=9, minute=0),  # Daily at 9 AM
        'kwargs': {'days_before': 3}
    },
    
    # Send trial ending reminders (1 day before)
    'send-trial-ending-reminder-1-day': {
        'task': 'apps.payments.tasks.send_trial_ending_reminder',
        'schedule': crontab(hour=9, minute=0),  # Daily at 9 AM
        'kwargs': {'days_before': 1}
    },
}


# ============================================================================
# CELERY CONFIGURATION
# ============================================================================

app.conf.update(
    # Timezone
    timezone='UTC',
    enable_utc=True,
    
    # Task settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    
    # Results backend
    result_backend='django-db',  # Store results in Django database
    cache_backend='django-cache',
    
    # Task execution
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    
    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    
    # Result expiration
    result_expires=3600,  # 1 hour
)


@app.task(bind=True)
def debug_task(self):
    """Debug task to test Celery is working."""
    print(f'Request: {self.request!r}')
    return 'Celery is working!'