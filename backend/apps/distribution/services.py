# apps/distribution/services.py
"""
Shipment steps that move stock. Each is atomic and locks the rows it touches.

    PENDING → PICKED → PACKED → SHIPPED (items leave the warehouse) → DELIVERED
       \\________________________/ cancel → CANCELLED (no stock moved)
                                   SHIPPED / DELIVERED → return → RETURNED (stock back)
"""
from django.db import transaction
from django.utils import timezone

from apps.inventory.models import InventoryItem, InventoryTransaction

from .events import record_event, record_status_change
from .models import Shipment

PRE_SHIP = ('PENDING', 'PICKED', 'PACKED')


class ShipmentError(Exception):
    """A shipment step that isn't allowed; the message is shown to the user."""

    def __init__(self, message, details=None):
        super().__init__(message)
        self.details = details or {}


def _lock(shipment):
    # lock only the shipment row: PostgreSQL can't lock the optional (outer-joined) order
    return Shipment.objects.select_for_update(of=('self',)).select_related('warehouse', 'order').get(pk=shipment.pk)


def _move(product, warehouse, qty, kind, shipment, note, user):
    line, _ = InventoryItem.objects.get_or_create(product=product, warehouse=warehouse, defaults={'quantity': 0})
    line = InventoryItem.objects.select_for_update().get(pk=line.pk)
    line.quantity += qty
    line.save()
    InventoryTransaction.objects.create(inventory_item=line, transaction_type=kind, quantity=qty,
                                        reference=shipment.shipment_number, notes=note, performed_by=user)


def _take_stock(shipment, user):
    items = list(shipment.shipment_items.select_related('product'))
    shortages = []
    for item in items:
        line = InventoryItem.objects.select_for_update().filter(product=item.product, warehouse=shipment.warehouse).first()
        have = line.quantity if line else 0
        if have < item.quantity:
            shortages.append({'product': item.product.name, 'required': item.quantity, 'available': have})
    if shortages:
        names = ', '.join(f"{s['product']} (need {s['required']}, have {s['available']})" for s in shortages)
        raise ShipmentError(f'Not enough stock in {shipment.warehouse.name}: {names}.', {'insufficient_items': shortages})
    for item in items:
        _move(item.product, shipment.warehouse, -item.quantity, 'SHIPMENT', shipment,
              f'Shipped{" for order " + shipment.order.order_number if shipment.order else ""}', user)
    shipment.stock_deducted = True


def advance(shipment, to_status, user):
    """PENDING → PICKED → PACKED (no stock moves)."""
    expected = {'PICKED': 'PENDING', 'PACKED': 'PICKED'}[to_status]
    with transaction.atomic():
        shipment = _lock(shipment)
        if shipment.status != expected:
            raise ShipmentError({'PICKED': 'Only pending shipments can be picked.', 'PACKED': 'Pick the shipment before packing it.'}[to_status])
        previous = shipment.status
        shipment.status = to_status
        shipment.save()
        record_status_change(shipment, previous, actor=user)
        return shipment


def ship(shipment, user, *, tracking_number='', carrier='', estimated_delivery=None, allow_unpacked=False):
    """Take the items out of the warehouse and mark the shipment (and its order) shipped."""
    with transaction.atomic():
        shipment = _lock(shipment)
        allowed = PRE_SHIP if allow_unpacked else ('PACKED',)
        if shipment.status not in allowed:
            raise ShipmentError('Pack the shipment before shipping it.' if shipment.status in PRE_SHIP else
                                f'A {shipment.get_status_display().lower()} shipment can’t be shipped.')
        if not shipment.stock_deducted:
            _take_stock(shipment, user)
        previous = shipment.status
        shipment.status = 'SHIPPED'
        shipment.shipping_date = timezone.now()
        shipment.tracking_number = tracking_number or shipment.tracking_number
        shipment.carrier = carrier or shipment.carrier
        if estimated_delivery:
            shipment.estimated_delivery = estimated_delivery
        shipment.save()
        record_status_change(shipment, previous, actor=user, data={'carrier': shipment.carrier, 'tracking_number': shipment.tracking_number})
        order = shipment.order
        if order and order.status == 'PROCESSING':
            order.status = 'SHIPPED'
            order.save(update_fields=['status', 'updated_at'])
        return shipment


def deliver(shipment, user, delivered_at=None):
    """Mark delivered; the order is delivered once all of its live shipments are."""
    delivered_at = delivered_at or timezone.now()
    with transaction.atomic():
        shipment = _lock(shipment)
        if shipment.status != 'SHIPPED':
            raise ShipmentError('Only shipments on their way can be delivered.')
        previous = shipment.status
        shipment.status = 'DELIVERED'
        shipment.actual_delivery = delivered_at
        shipment.save()
        record_status_change(shipment, previous, actor=user, message='Delivered', occurred_at=delivered_at)
        order = shipment.order
        if order and not order.shipments.exclude(status__in=('DELIVERED', 'CANCELLED', 'RETURNED')).exists() \
                and order.shipments.filter(status='DELIVERED').exists():
            order.status = 'DELIVERED'
            order.save(update_fields=['status', 'updated_at'])
        return shipment


def cancel(shipment, user, reason=''):
    """Cancel before it leaves the warehouse; nothing moves."""
    with transaction.atomic():
        shipment = _lock(shipment)
        if shipment.status not in PRE_SHIP:
            raise ShipmentError('This shipment has already left the warehouse. Record a return instead.')
        previous = shipment.status
        shipment.status = 'CANCELLED'
        shipment.save()
        record_status_change(shipment, previous, actor=user, message='Cancelled' + (f': {reason}' if reason else ''))
        # The order stays in processing, so it can be shipped again
        return shipment


def return_shipment(shipment, user, reason=''):
    """Goods came back: put the stock back in the warehouse it left from."""
    with transaction.atomic():
        shipment = _lock(shipment)
        if shipment.status not in ('SHIPPED', 'DELIVERED', 'FAILED'):
            raise ShipmentError('Only shipments that left the warehouse can be returned.')
        if shipment.stock_deducted:
            for item in shipment.shipment_items.select_related('product'):
                _move(item.product, shipment.warehouse, item.quantity, 'RETURN', shipment,
                      'Returned' + (f': {reason}' if reason else ''), user)
            shipment.stock_deducted = False
        previous = shipment.status
        shipment.status = 'RETURNED'
        shipment.save()
        record_status_change(shipment, previous, actor=user, message='Returned to warehouse' + (f': {reason}' if reason else ''))
        return shipment


def next_number(model, field, company, prefix):
    """PREFIX-YYYYMMDD-NNN, unique within the company."""
    stem = f"{prefix}-{timezone.now():%Y%m%d}-"
    taken = set(model.objects.filter(company=company, **{f'{field}__startswith': stem}).values_list(field, flat=True))
    n = len(taken) + 1
    while f'{stem}{n:03d}' in taken:
        n += 1
    return f'{stem}{n:03d}'
