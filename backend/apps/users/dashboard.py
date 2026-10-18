# apps/users/dashboard.py
"""
Real figures for the dashboard overview: stats, performance metrics, alerts and setup progress.

Response shapes match frontend/src/types/dashboard.types.ts. A metric's `trend` is 'up' when it
moved in the good direction (so lower delivery time = 'up'), because the UI colours up green.
"""
from datetime import timedelta

from django.db.models import F

from apps.distribution.models import CustomerOrder, Shipment
from apps.inventory.models import InventoryItem, Product, Warehouse
from apps.payments.models import PaymentMethod

WINDOW_DAYS = 30
STALE_ORDER_HOURS = 48
NO_DATA = '—'


def build_stats(company, total_users, days_active):
    return {
        'total_users': total_users,
        'total_products': Product.objects.filter(company=company, is_active=True).count(),
        'pending_orders': CustomerOrder.objects.filter(company=company, status__in=['NEW', 'PROCESSING']).count(),
        'active_shipments': Shipment.objects.filter(company=company).exclude(status='DELIVERED').count(),
        'days_active': days_active,
    }


def _low_stock_items(company):
    return InventoryItem.objects.filter(
        warehouse__company=company,
        product__is_active=True,
        product__reorder_point__gt=0,
        quantity__lte=F('product__reorder_point'),
    )


def _delivered_between(company, start, end):
    return Shipment.objects.filter(
        company=company, status='DELIVERED', actual_delivery__gte=start, actual_delivery__lt=end,
    )


def _on_time_rate(company, start, end):
    """Percent of shipments delivered in the window by their estimated delivery, or None."""
    delivered = _delivered_between(company, start, end).filter(estimated_delivery__isnull=False)
    total = delivered.count()
    if not total:
        return None
    on_time = delivered.filter(actual_delivery__lte=F('estimated_delivery')).count()
    return on_time / total * 100


def _avg_delivery_days(company, start, end):
    """Average days from shipping to delivery for shipments delivered in the window, or None."""
    rows = _delivered_between(company, start, end).filter(
        shipping_date__isnull=False,
    ).values_list('shipping_date', 'actual_delivery')
    durations = [(delivered - shipped).total_seconds() / 86400 for shipped, delivered in rows]
    return sum(durations) / len(durations) if durations else None


def _pct_change(current, previous):
    if not previous:
        return NO_DATA
    return f'{(current - previous) / previous * 100:+.0f}%'


def build_performance_metrics(company, now):
    window = timedelta(days=WINDOW_DAYS)
    cur_start, prev_start = now - window, now - 2 * window

    metrics = []

    on_time = _on_time_rate(company, cur_start, now)
    prev_on_time = _on_time_rate(company, prev_start, cur_start)
    metrics.append({
        'title': 'On-Time Delivery',
        'value': f'{on_time:.1f}%' if on_time is not None else NO_DATA,
        'change': f'{on_time - prev_on_time:+.1f} pts' if on_time is not None and prev_on_time is not None else NO_DATA,
        'trend': 'down' if on_time is not None and prev_on_time is not None and on_time < prev_on_time else 'up',
        'description': f'Shipments delivered by their ETA, last {WINDOW_DAYS} days',
    })

    avg_days = _avg_delivery_days(company, cur_start, now)
    prev_avg_days = _avg_delivery_days(company, prev_start, cur_start)
    metrics.append({
        'title': 'Avg Delivery Time',
        'value': f'{avg_days:.1f} days' if avg_days is not None else NO_DATA,
        'change': _pct_change(avg_days, prev_avg_days) if avg_days is not None else NO_DATA,
        'trend': 'down' if avg_days is not None and prev_avg_days and avg_days > prev_avg_days else 'up',
        'description': f'Shipping to delivery, last {WINDOW_DAYS} days',
    })

    orders = CustomerOrder.objects.filter(company=company)
    order_count = orders.filter(created_at__gte=cur_start).count()
    prev_order_count = orders.filter(created_at__gte=prev_start, created_at__lt=cur_start).count()
    metrics.append({
        'title': 'Orders',
        'value': str(order_count),
        'change': _pct_change(order_count, prev_order_count),
        'trend': 'down' if order_count < prev_order_count else 'up',
        'description': f'New customer orders, last {WINDOW_DAYS} days',
    })

    low_stock = _low_stock_items(company).count()
    metrics.append({
        'title': 'Low-Stock Items',
        'value': str(low_stock),
        'change': NO_DATA,
        'trend': 'down' if low_stock else 'up',
        'description': 'Stock lines at or below their reorder point',
    })

    return metrics


def build_setup_progress(company, total_users):
    steps = [
        ('Create Company', True, 'Company account created successfully'),
        ('Add Team Members', total_users > 1, 'Invite team members to collaborate'),
        ('Set up Inventory',
         Warehouse.objects.filter(company=company).exists() and Product.objects.filter(company=company).exists(),
         'Add your first products and warehouses'),
        ('Create First Order', CustomerOrder.objects.filter(company=company).exists(), 'Process your first order'),
        ('Configure Billing', PaymentMethod.objects.filter(company=company).exists(),
         'Add payment method and billing info'),
    ]
    return {
        'completed_steps': sum(1 for _, done, _ in steps if done),
        'total_steps': len(steps),
        'steps': [
            {'id': i, 'title': title, 'completed': done, 'description': description}
            for i, (title, done, description) in enumerate(steps, start=1)
        ],
    }


def _plural(n, word):
    return f'{n} {word}' if n == 1 else f'{n} {word}s'


def build_alerts(company, now, setup_progress):
    """Alerts that need attention, most severe first. Empty when nothing needs attention."""
    alerts = []

    overdue = Shipment.objects.filter(company=company, status='SHIPPED', estimated_delivery__lt=now)
    overdue_count = overdue.count()
    if overdue_count:
        very_late = overdue.filter(estimated_delivery__lt=now - timedelta(hours=24)).count()
        alerts.append({
            'type': 'critical' if very_late else 'warning',
            'title': 'Delayed Shipments',
            'message': f'{_plural(overdue_count, "shipment")} past the estimated delivery time'
                       + (f', {very_late} by more than 24 hours' if very_late else ''),
            'action': 'View Shipments',
        })

    low_stock = _low_stock_items(company).count()
    if low_stock:
        alerts.append({
            'type': 'warning',
            'title': 'Low Stock',
            'message': f'{_plural(low_stock, "stock line")} at or below the reorder point',
            'action': 'View Inventory',
        })

    stale_orders = CustomerOrder.objects.filter(
        company=company, status='NEW', created_at__lt=now - timedelta(hours=STALE_ORDER_HOURS),
    ).count()
    if stale_orders:
        alerts.append({
            'type': 'warning',
            'title': 'Orders Waiting',
            'message': f'{_plural(stale_orders, "order")} not processed for over {STALE_ORDER_HOURS // 24} days',
            'action': 'View Orders',
        })

    remaining = setup_progress['total_steps'] - setup_progress['completed_steps']
    if remaining:
        alerts.append({
            'type': 'info',
            'title': 'Finish Setup',
            'message': f'{_plural(remaining, "setup step")} left',
            'action': 'Continue Setup',
        })

    timestamp = now.isoformat()
    return [{'id': i, **alert, 'timestamp': timestamp} for i, alert in enumerate(alerts, start=1)]


def build_recent_order_activity(company, since):
    return [
        {
            'type': 'order_created',
            'message': f'Order {order.order_number} received from {order.customer_name}',
            'timestamp': order.created_at.isoformat(),
            'user': {'name': order.customer_name, 'email': order.customer_email},
        }
        for order in CustomerOrder.objects.filter(company=company, created_at__gte=since).order_by('-created_at')[:5]
    ]
