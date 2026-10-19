# apps/analytics/reports.py
"""
Analytics for one company over a period, computed in the database. Every headline figure comes with
the same figure for the previous period of equal length, so the UI can show the change honestly
(None when there is nothing to compare against).
"""
from datetime import timedelta

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone

from apps.distribution.models import CustomerOrder, Shipment
from apps.inventory.models import InventoryItem, InventoryTransaction, Product, Warehouse
from apps.production.models import ProductionMaterial, ProductionOrder
from apps.warehousing.models import TransferItem, WarehouseTransfer

PERIODS = (7, 30, 90)
MONEY = DecimalField(max_digits=14, decimal_places=2)


def _num(v):
    return float(v or 0)


def _change(current, previous):
    """Percent change, or None when the previous period had nothing."""
    if not previous:
        return None
    return round((current - previous) / previous * 100, 1)


def _metric(current, previous):
    return {'value': current, 'previous': previous, 'change': _change(current, previous)}


def _daily(qs, field, start, days, value=None):
    rows = (qs.filter(**{f'{field}__gte': start}).annotate(day=TruncDate(field)).values('day')
            .annotate(v=Sum(value) if value is not None else Count('id')))
    found = {r['day']: _num(r['v']) for r in rows}
    return [found.get((start + timedelta(days=i)).date(), 0) for i in range(days)]


def build_report(company, days):
    now = timezone.now()
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    prev_start = start - timedelta(days=days)

    def window(qs, field):
        return qs.filter(**{f'{field}__gte': start}), qs.filter(**{f'{field}__gte': prev_start, f'{field}__lt': start})

    # --- distribution ---------------------------------------------------------
    orders = CustomerOrder.objects.filter(company=company)
    cur_orders, prev_orders = window(orders, 'created_at')
    revenue_q = Coalesce(Sum('total_amount'), 0, output_field=MONEY)
    cur_revenue = _num(cur_orders.exclude(status='CANCELLED').aggregate(v=revenue_q)['v'])
    prev_revenue = _num(prev_orders.exclude(status='CANCELLED').aggregate(v=revenue_q)['v'])

    shipments = Shipment.objects.filter(company=company)
    delivered = shipments.filter(status='DELIVERED', actual_delivery__isnull=False)
    cur_delivered, prev_delivered = window(delivered, 'actual_delivery')

    def on_time(qs):
        qs = qs.filter(estimated_delivery__isnull=False)
        total = qs.count()
        return round(qs.filter(actual_delivery__lte=F('estimated_delivery')).count() / total * 100, 1) if total else None

    def avg_days(qs):
        rows = qs.filter(shipping_date__isnull=False).values_list('shipping_date', 'actual_delivery')
        spans = [(d - s).total_seconds() / 86400 for s, d in rows]
        return round(sum(spans) / len(spans), 1) if spans else None

    top_customers = list(
        cur_orders.exclude(status='CANCELLED').values('customer_name')
        .annotate(orders=Count('id'), revenue=revenue_q).order_by('-revenue')[:5]
    )
    distribution = {
        'orders': _metric(cur_orders.count(), prev_orders.count()),
        'revenue': _metric(cur_revenue, prev_revenue),
        'deliveries': _metric(cur_delivered.count(), prev_delivered.count()),
        'on_time_rate': {'value': on_time(cur_delivered), 'previous': on_time(prev_delivered)},
        'avg_delivery_days': {'value': avg_days(cur_delivered), 'previous': avg_days(prev_delivered)},
        'orders_by_status': {r['status']: r['n'] for r in cur_orders.values('status').annotate(n=Count('id'))},
        'open_shipments': shipments.exclude(status__in=Shipment.TERMINAL_STATUSES).count(),
        'top_customers': [{'name': c['customer_name'], 'orders': c['orders'], 'revenue': _num(c['revenue'])} for c in top_customers],
    }

    # --- inventory ------------------------------------------------------------
    lines = InventoryItem.objects.filter(warehouse__company=company)
    value_expr = ExpressionWrapper(F('quantity') * F('product__cost_price'), output_field=MONEY)
    txns = InventoryTransaction.objects.filter(inventory_item__warehouse__company=company)
    cur_txns, prev_txns = window(txns, 'timestamp')
    low = lines.filter(product__is_active=True, product__reorder_point__gt=0, quantity__lte=F('product__reorder_point'))
    by_warehouse = (Warehouse.objects.filter(company=company)
                    .annotate(units=Coalesce(Sum('inventory_items__quantity'), 0),
                              value=Coalesce(Sum(F('inventory_items__quantity') * F('inventory_items__product__cost_price'),
                                                 output_field=MONEY), 0, output_field=MONEY))
                    .order_by('-value'))
    top_value = (lines.values('product__name', 'product__sku').annotate(units=Sum('quantity'), value=Sum(value_expr))
                 .order_by('-value')[:8])
    inventory = {
        'stock_value': _num(lines.aggregate(v=Sum(value_expr))['v']),
        'stock_units': lines.aggregate(v=Coalesce(Sum('quantity'), 0))['v'],
        'products': Product.objects.filter(company=company, is_active=True).count(),
        'low_stock': low.count(),
        'movements': _metric(cur_txns.count(), prev_txns.count()),
        'units_in': cur_txns.filter(quantity__gt=0).aggregate(v=Coalesce(Sum('quantity'), 0))['v'],
        'units_out': -cur_txns.filter(quantity__lt=0).aggregate(v=Coalesce(Sum('quantity'), 0))['v'],
        'movements_by_type': {r['transaction_type']: r['n'] for r in cur_txns.values('transaction_type').annotate(n=Count('id'))},
        'by_warehouse': [{'name': w.name, 'units': w.units, 'value': _num(w.value)} for w in by_warehouse],
        'top_products_by_value': [{'name': p['product__name'], 'sku': p['product__sku'], 'units': p['units'], 'value': _num(p['value'])} for p in top_value],
        'low_stock_items': [
            {'name': i.product.name, 'sku': i.product.sku, 'warehouse': i.warehouse.name,
             'quantity': i.quantity, 'reorder_point': i.product.reorder_point}
            for i in low.select_related('product', 'warehouse').order_by('quantity')[:8]
        ],
    }

    # --- production -----------------------------------------------------------
    prod = ProductionOrder.objects.filter(company=company)
    completed = prod.filter(status='COMPLETED', end_date__isnull=False)
    cur_done, prev_done = window(completed, 'end_date')
    cur_units = cur_done.aggregate(v=Coalesce(Sum('quantity'), 0))['v']
    prev_units = prev_done.aggregate(v=Coalesce(Sum('quantity'), 0))['v']

    def cycle_hours(qs):
        rows = qs.filter(start_date__isnull=False).values_list('start_date', 'end_date')
        spans = [(e - s).total_seconds() / 3600 for s, e in rows]
        return round(sum(spans) / len(spans), 1) if spans else None

    consumed = (ProductionMaterial.objects.filter(production_order__in=cur_done)
                .values('product__name').annotate(units=Sum('quantity')).order_by('-units')[:6])
    made = cur_done.values('product__name').annotate(units=Sum('quantity'), runs=Count('id')).order_by('-units')[:6]
    production = {
        'runs_completed': _metric(cur_done.count(), prev_done.count()),
        'units_produced': _metric(cur_units, prev_units),
        'avg_cycle_hours': {'value': cycle_hours(cur_done), 'previous': cycle_hours(prev_done)},
        'in_progress': prod.filter(status='IN_PROGRESS').count(),
        'planned': prod.filter(status='PLANNED').count(),
        'overdue': prod.filter(status='IN_PROGRESS', end_date__lt=now).count(),
        'top_products': [{'name': m['product__name'], 'units': m['units'], 'runs': m['runs']} for m in made],
        'materials_used': [{'name': m['product__name'], 'units': m['units']} for m in consumed],
    }

    # --- warehousing ----------------------------------------------------------
    transfers = WarehouseTransfer.objects.filter(company=company)
    done_tr = transfers.filter(status='COMPLETED', completed_at__isnull=False)
    cur_tr, prev_tr = window(done_tr, 'completed_at')
    moved = lambda qs: TransferItem.objects.filter(transfer__in=qs).aggregate(v=Coalesce(Sum('quantity'), 0))['v']  # noqa: E731

    def avg_transfer_days(qs):
        rows = qs.values_list('initiated_at', 'completed_at')
        spans = [(c - i).total_seconds() / 86400 for i, c in rows]
        return round(sum(spans) / len(spans), 1) if spans else None

    routes = (cur_tr.values('source_warehouse__name', 'destination_warehouse__name')
              .annotate(transfers=Count('id', distinct=True), units=Coalesce(Sum('transfer_items__quantity'), 0))
              .order_by('-transfers', '-units')[:6])
    warehousing = {
        'transfers_completed': _metric(cur_tr.count(), prev_tr.count()),
        'units_moved': _metric(moved(cur_tr), moved(prev_tr)),
        'avg_transfer_days': {'value': avg_transfer_days(cur_tr), 'previous': avg_transfer_days(prev_tr)},
        'in_transit': transfers.filter(status='IN_TRANSIT').count(),
        'pending': transfers.filter(status='PENDING').count(),
        'routes': [{'from': r['source_warehouse__name'], 'to': r['destination_warehouse__name'],
                    'transfers': r['transfers'], 'units': r['units']} for r in routes],
    }

    # --- daily series ---------------------------------------------------------
    dates = [(start + timedelta(days=i)).date().isoformat() for i in range(days)]
    series = {
        'orders': _daily(orders, 'created_at', start, days),
        'revenue': _daily(orders.exclude(status='CANCELLED'), 'created_at', start, days, 'total_amount'),
        'deliveries': _daily(delivered, 'actual_delivery', start, days),
        'units_produced': _daily(completed, 'end_date', start, days, 'quantity'),
        'stock_in': _daily(txns.filter(quantity__gt=0), 'timestamp', start, days, 'quantity'),
        'stock_out': [-v for v in _daily(txns.filter(quantity__lt=0), 'timestamp', start, days, 'quantity')],
        'transfers': _daily(done_tr, 'completed_at', start, days),
    }

    return {
        'period': {'days': days, 'start': start.isoformat(), 'end': now.isoformat(), 'previous_start': prev_start.isoformat()},
        'currency': getattr(getattr(company, 'settings', None), 'currency', None) or 'USD',
        'distribution': distribution,
        'inventory': inventory,
        'production': production,
        'warehousing': warehousing,
        'series': {'dates': dates, **series},
        'generated_at': now.isoformat(),
    }
