# apps/users/dashboard.py
"""
Real figures for the dashboard overview: stats, performance metrics, alerts and setup progress.

Response shapes match frontend/src/types/dashboard.types.ts. A metric's `trend` is 'up' when it
moved in the good direction (so lower delivery time = 'up'), because the UI colours up green.
"""
from datetime import timedelta

from django.db.models import Count, F, Sum
from django.db.models.functions import TruncDate

from apps.distribution.models import CustomerOrder, DeliveryException, DeliveryRoute, LocationPing, Shipment
from apps.inventory.models import InventoryItem, InventoryTransaction, Product, Warehouse
from apps.payments.models import PaymentMethod
from apps.production.models import ProductionMaterial, ProductionOrder
from apps.warehousing.models import WarehouseTransfer

WINDOW_DAYS = 30
STALE_ORDER_HOURS = 48
NO_DATA = '—'


TREND_DAYS = 14


def build_stats(company, total_users, days_active):
    stock = InventoryItem.objects.filter(warehouse__company=company)
    return {
        'total_users': total_users,
        'total_products': Product.objects.filter(company=company, is_active=True).count(),
        'pending_orders': CustomerOrder.objects.filter(company=company, status__in=['NEW', 'PROCESSING']).count(),
        'active_shipments': Shipment.objects.filter(company=company).exclude(status__in=Shipment.TERMINAL_STATUSES).count(),
        'days_active': days_active,
        'stock_units': stock.aggregate(v=Sum('quantity'))['v'] or 0,
        'stock_value': float(stock.aggregate(v=Sum(F('quantity') * F('product__cost_price')))['v'] or 0),
        'low_stock_items': _low_stock_items(company).count(),
        'transfers_in_transit': WarehouseTransfer.objects.filter(company=company, status='IN_TRANSIT').count(),
        'transfers_pending': WarehouseTransfer.objects.filter(company=company, status='PENDING').count(),
        'production_in_progress': ProductionOrder.objects.filter(company=company, status='IN_PROGRESS').count(),
        'production_planned': ProductionOrder.objects.filter(company=company, status='PLANNED').count(),
    }


def build_trend(company, now):
    """Daily counts for the last TREND_DAYS days (oldest first) for the dashboard chart."""
    start = (now - timedelta(days=TREND_DAYS - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    days = [(start + timedelta(days=i)).date() for i in range(TREND_DAYS)]

    def per_day(qs, field, value=None):
        rows = qs.filter(**{f'{field}__gte': start}).annotate(day=TruncDate(field)).values('day')
        rows = rows.annotate(v=Sum(value) if value else Count('id'))
        return {r['day']: r['v'] or 0 for r in rows}

    orders = per_day(CustomerOrder.objects.filter(company=company), 'created_at')
    produced = per_day(ProductionOrder.objects.filter(company=company, status='COMPLETED'), 'end_date', 'quantity')
    movements = per_day(InventoryTransaction.objects.filter(inventory_item__warehouse__company=company), 'timestamp')
    delivered = per_day(Shipment.objects.filter(company=company, status='DELIVERED'), 'actual_delivery')
    return [
        {'date': d.isoformat(), 'orders': orders.get(d, 0), 'units_produced': produced.get(d, 0),
         'stock_movements': movements.get(d, 0), 'deliveries': delivered.get(d, 0)}
        for d in days
    ]


_TXN_LABEL = {
    'RECEIPT': 'received', 'SHIPMENT': 'shipped', 'ADJUSTMENT': 'adjusted', 'TRANSFER': 'transferred',
    'RETURN': 'returned', 'PRODUCTION': 'used in production',
}


def build_operations_activity(company, since):
    """Recent stock movements, transfers and production runs, newest first, each with a link."""
    items = []
    txns = (InventoryTransaction.objects.filter(inventory_item__warehouse__company=company, timestamp__gte=since)
            .select_related('inventory_item__product', 'inventory_item__warehouse', 'performed_by')
            .order_by('-timestamp')[:8])
    for t in txns:
        line = t.inventory_item
        sign = '+' if t.quantity > 0 else '−'
        verb = _TXN_LABEL.get(t.transaction_type, t.transaction_type.lower())
        if t.transaction_type == 'PRODUCTION' and t.quantity > 0:
            verb = 'returned from production'
        who = t.performed_by.get_full_name() or t.performed_by.email if t.performed_by else 'System'
        items.append({
            'type': 'stock_movement',
            'message': f'{line.product.name} {sign}{abs(t.quantity)} {verb} at {line.warehouse.name}'
                       + (f' ({t.reference})' if t.reference else ''),
            'timestamp': t.timestamp.isoformat(),
            'user': {'name': who, 'email': t.performed_by.email if t.performed_by else ''},
            'href': f'/inventory/transactions?search={t.reference}' if t.reference else '/inventory/transactions',
        })
    for order in ProductionOrder.objects.filter(company=company, status='COMPLETED', end_date__gte=since).select_related('product', 'created_by')[:5]:
        items.append({
            'type': 'production_completed',
            'message': f'{order.order_number} finished: {order.quantity} × {order.product.name}',
            'timestamp': order.end_date.isoformat(),
            'user': {'name': order.created_by.get_full_name() if order.created_by else 'System', 'email': order.created_by.email if order.created_by else ''},
            'href': f'/production/orders/{order.id}',
        })
    for tr in WarehouseTransfer.objects.filter(company=company, status='COMPLETED', completed_at__gte=since).select_related('destination_warehouse', 'initiated_by')[:5]:
        items.append({
            'type': 'transfer_completed',
            'message': f'Transfer {tr.transfer_number} received at {tr.destination_warehouse.name}',
            'timestamp': tr.completed_at.isoformat(),
            'user': {'name': tr.initiated_by.get_full_name() if tr.initiated_by else 'System', 'email': tr.initiated_by.email if tr.initiated_by else ''},
            'href': f'/warehousing/transfers/{tr.id}',
        })
    return items


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


LIVE_MINUTES = 15


def build_ops_today(company, now):
    """Operations at a glance: today's deliveries, exceptions, routes on the road and who's live on the map."""
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    shipments = Shipment.objects.filter(company=company)
    delivered = shipments.filter(status='DELIVERED', actual_delivery__gte=start)
    with_eta = delivered.filter(estimated_delivery__isnull=False)
    exceptions = DeliveryException.objects.filter(company=company, status__in=DeliveryException.OPEN_STATUSES)
    routes = list(DeliveryRoute.objects.filter(company=company, status='IN_PROGRESS').select_related('driver', 'fleet_vehicle')
                  .annotate(total=Count('route_stops', distinct=True)).order_by('start_time')[:6])
    done = dict(DeliveryRoute.objects.filter(pk__in=[r.pk for r in routes], route_stops__status__in=('COMPLETED', 'FAILED'))
                .values_list('pk').annotate(n=Count('route_stops')))

    # Latest position per driver who reported in the last few minutes
    units, seen = [], set()
    for p in (LocationPing.objects.filter(company=company, recorded_at__gte=now - timedelta(minutes=LIVE_MINUTES))
              .select_related('driver', 'vehicle').order_by('-recorded_at')[:500]):
        key = p.driver_id or f'v{p.vehicle_id}'
        if key in seen:
            continue
        seen.add(key)
        units.append({'id': str(key), 'label': p.vehicle.registration if p.vehicle_id else (p.driver.get_full_name() if p.driver_id else 'Unit'),
                      'latitude': float(p.latitude), 'longitude': float(p.longitude), 'heading': p.heading, 'recorded_at': p.recorded_at.isoformat()})
    return {
        'in_flight': shipments.filter(status__in=('PENDING', 'PICKED', 'PACKED', 'SHIPPED')).count(),
        'out_for_delivery': shipments.filter(status='SHIPPED').count(),
        'late': shipments.filter(status='SHIPPED', estimated_delivery__lt=now).count(),
        'delivered_today': delivered.count(),
        'on_time_today': round(with_eta.filter(actual_delivery__lte=F('estimated_delivery')).count() / with_eta.count() * 100)
        if with_eta.exists() else None,
        'open_exceptions': exceptions.count(),
        'urgent_exceptions': exceptions.filter(severity__in=('HIGH', 'CRITICAL')).count(),
        'unassigned_exceptions': exceptions.filter(owner__isnull=True).count(),
        'routes_running': len(routes),
        'routes': [{'id': str(r.id), 'name': r.route_name, 'driver': r.driver.get_full_name() if r.driver_id else None,
                    'vehicle': r.fleet_vehicle.registration if r.fleet_vehicle_id else (r.vehicle_id or None),
                    'done': done.get(r.pk, 0), 'total': r.total, 'started_at': r.start_time.isoformat() if r.start_time else None}
                   for r in routes],
        'live_units': units,
    }


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
            'action': 'Open Ops Board',
            'href': '/ops',
        })

    open_exceptions = DeliveryException.objects.filter(company=company, status__in=DeliveryException.OPEN_STATUSES)
    urgent = open_exceptions.filter(severity__in=('HIGH', 'CRITICAL')).count()
    unassigned = open_exceptions.filter(owner__isnull=True).count()
    if urgent:
        alerts.append({
            'type': 'critical',
            'title': 'Urgent Exceptions',
            'message': f'{_plural(urgent, "high or critical exception")} open',
            'action': 'Handle Exceptions',
            'href': '/ops/exceptions',
        })
    elif unassigned:
        alerts.append({
            'type': 'warning',
            'title': 'Exceptions Without an Owner',
            'message': f'{_plural(unassigned, "exception")} nobody has picked up yet',
            'action': 'Assign Owners',
            'href': '/ops/exceptions',
        })

    low_stock = _low_stock_items(company).count()
    if low_stock:
        alerts.append({
            'type': 'warning',
            'title': 'Low Stock',
            'message': f'{_plural(low_stock, "stock line")} at or below the reorder point',
            'action': 'View Stock',
            'href': '/inventory/inventory-items',
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
            'href': '/distribution/orders',
        })

    overdue_runs = ProductionOrder.objects.filter(company=company, status='IN_PROGRESS', end_date__lt=now).count()
    if overdue_runs:
        alerts.append({
            'type': 'warning',
            'title': 'Production Running Late',
            'message': f'{_plural(overdue_runs, "production order")} past the target end date',
            'action': 'View Production',
            'href': '/production/orders?status=IN_PROGRESS',
        })

    blocked = _blocked_production_orders(company)
    if blocked:
        alerts.append({
            'type': 'warning',
            'title': 'Materials Short',
            'message': f'{_plural(blocked, "planned production order")} can’t start until materials are restocked',
            'action': 'View Materials',
            'href': '/production/materials',
        })

    waiting_transfers = WarehouseTransfer.objects.filter(
        company=company, status='PENDING', initiated_at__lt=now - timedelta(hours=24),
    ).count()
    if waiting_transfers:
        alerts.append({
            'type': 'info',
            'title': 'Transfers Awaiting Approval',
            'message': f'{_plural(waiting_transfers, "transfer")} pending for over a day',
            'action': 'Review Transfers',
            'href': '/warehousing/transfers?status=PENDING',
        })

    remaining = setup_progress['total_steps'] - setup_progress['completed_steps']
    if remaining:
        alerts.append({
            'type': 'info',
            'title': 'Finish Setup',
            'message': f'{_plural(remaining, "setup step")} left',
            'action': 'Continue Setup',
            'href': '#setup',
        })

    timestamp = now.isoformat()
    return [{'id': i, **alert, 'timestamp': timestamp} for i, alert in enumerate(alerts, start=1)]


def _blocked_production_orders(company):
    """Planned orders with at least one material whose warehouse holds less than needed."""
    stock = {(i.product_id, i.warehouse_id): i.quantity for i in InventoryItem.objects.filter(warehouse__company=company)}
    blocked = set()
    for m in ProductionMaterial.objects.filter(production_order__company=company, production_order__status='PLANNED',
                                               production_order__materials_consumed=False):
        if stock.get((m.product_id, m.warehouse_id), 0) < m.quantity:
            blocked.add(m.production_order_id)
    return len(blocked)


def build_recent_order_activity(company, since):
    return [
        {
            'type': 'order_created',
            'message': f'Order {order.order_number} received from {order.customer_name}',
            'timestamp': order.created_at.isoformat(),
            'user': {'name': order.customer_name, 'email': order.customer_email},
            'href': f'/distribution/orders/{order.id}',
        }
        for order in CustomerOrder.objects.filter(company=company, created_at__gte=since).order_by('-created_at')[:5]
    ]
