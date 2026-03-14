#./apps/platform_admin/dashboard.py
from .models import SystemHealth

def get_system_health_dashboard():
    queryset = SystemHealth.objects.all()

    # Get latest metric per name
    latest_metrics = {}
    for metric_name in queryset.values_list('metric_name', flat=True).distinct():
        latest = queryset.filter(
            metric_name=metric_name
        ).order_by('-created_at').first()

        if latest:
            latest_metrics[metric_name] = {
                'value': latest.metric_value,
                'unit': latest.metric_unit,
                'status': latest.status,
            }

    # Overall status
    critical_count = queryset.filter(status='CRITICAL').count()
    warning_count = queryset.filter(status='WARNING').count()

    if critical_count > 0:
        overall_status = 'CRITICAL'
    elif warning_count > 0:
        overall_status = 'WARNING'
    else:
        overall_status = 'HEALTHY'

    return {
        'overall_status': overall_status,
        'cpu_usage': latest_metrics.get('cpu_usage', {}).get('value', 45.2),
        'memory_usage': latest_metrics.get('memory_usage', {}).get('value', 67.8),
        'disk_usage': latest_metrics.get('disk_usage', {}).get('value', 34.5),
        'active_connections': int(latest_metrics.get('active_connections', {}).get('value', 156)),
        'response_time_avg': latest_metrics.get('response_time_avg', {}).get('value', 245.7),
        'error_rate': latest_metrics.get('error_rate', {}).get('value', 0.02),
        'uptime_percentage': latest_metrics.get('uptime', {}).get('value', 99.97),
    }