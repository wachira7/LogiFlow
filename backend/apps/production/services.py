# apps/production/services.py
"""
Stock moves and state changes for production orders. Each step is atomic and locks the rows it
touches, so materials leave stock exactly once and finished goods arrive exactly once.

    PLANNED --start--> IN_PROGRESS (materials taken from stock) --complete--> COMPLETED (finished goods stocked)
       \\--cancel--> CANCELLED       \\--cancel--> CANCELLED (materials returned)
"""
from django.db import transaction
from django.utils import timezone

from apps.inventory.models import InventoryItem, InventoryTransaction


class ProductionError(Exception):
    """A production step that isn't allowed; the message is shown to the user."""

    def __init__(self, message, details=None):
        super().__init__(message)
        self.details = details or {}


def _lock_order(order):
    from .models import ProductionOrder

    return ProductionOrder.objects.select_for_update().get(pk=order.pk)


def _move(product, warehouse, qty, kind, reference, note, user):
    """Change one stock line by qty (negative = out) and record it in the ledger."""
    line, _ = InventoryItem.objects.get_or_create(product=product, warehouse=warehouse, defaults={'quantity': 0})
    line = InventoryItem.objects.select_for_update().get(pk=line.pk)
    line.quantity += qty
    line.save()
    InventoryTransaction.objects.create(
        inventory_item=line, transaction_type=kind, quantity=qty,
        reference=reference, notes=note, performed_by=user,
    )
    return line


def _consume_materials(order, user):
    materials = list(order.production_materials.select_related('product', 'warehouse'))
    shortages = []
    for m in materials:
        line = InventoryItem.objects.select_for_update().filter(product=m.product, warehouse=m.warehouse).first()
        have = line.quantity if line else 0
        if have < m.quantity:
            shortages.append({'product': m.product.name, 'warehouse': m.warehouse.name, 'required': m.quantity, 'available': have})
    if shortages:
        names = ', '.join(f"{s['product']} in {s['warehouse']} (need {s['required']}, have {s['available']})" for s in shortages)
        raise ProductionError(f'Not enough materials: {names}.', {'insufficient_materials': shortages})
    for m in materials:
        _move(m.product, m.warehouse, -m.quantity, 'PRODUCTION', order.order_number,
              f'Used in production order {order.order_number}', user)
    order.materials_consumed = True


def _start_next_step(order):
    """Begin the next pending step if nothing is in progress."""
    steps = order.production_steps.order_by('created_at')
    if steps.filter(status='IN_PROGRESS').exists():
        return None
    nxt = steps.filter(status='PENDING').first()
    if nxt:
        nxt.status = 'IN_PROGRESS'
        nxt.start_time = timezone.now()
        nxt.save()
    return nxt


def start(order, user):
    with transaction.atomic():
        order = _lock_order(order)
        if order.status != 'PLANNED':
            raise ProductionError('Only planned orders can be started.')
        if not order.materials_consumed:
            _consume_materials(order, user)
        order.status = 'IN_PROGRESS'
        order.start_date = timezone.now()
        order.save()
        _start_next_step(order)
        return order


def complete(order, user):
    with transaction.atomic():
        order = _lock_order(order)
        if order.status != 'IN_PROGRESS':
            raise ProductionError('Only orders in progress can be completed.')
        open_steps = list(order.production_steps.exclude(status__in=['COMPLETED', 'SKIPPED']).values_list('name', flat=True))
        if open_steps:
            raise ProductionError(f'Finish or skip the remaining steps first: {", ".join(open_steps)}.', {'pending_steps': open_steps})
        if not order.output_warehouse:
            raise ProductionError('Choose an output warehouse for the finished goods before completing.')
        # Orders started before materials were tracked take them now
        if not order.materials_consumed:
            _consume_materials(order, user)
        line = _move(order.product, order.output_warehouse, order.quantity, 'RECEIPT', order.order_number,
                     f'Finished goods from production order {order.order_number}', user)
        order.status = 'COMPLETED'
        order.end_date = timezone.now()
        order.save()
        return order, line


def cancel(order, user):
    with transaction.atomic():
        order = _lock_order(order)
        if order.status not in ('PLANNED', 'IN_PROGRESS'):
            raise ProductionError(f'A {order.get_status_display().lower()} order can’t be cancelled.')
        if order.materials_consumed:
            for m in order.production_materials.select_related('product', 'warehouse'):
                _move(m.product, m.warehouse, m.quantity, 'PRODUCTION', order.order_number,
                      f'Production order {order.order_number} cancelled: materials returned', user)
            order.materials_consumed = False
        order.production_steps.filter(status='IN_PROGRESS').update(status='PENDING', start_time=None)
        order.status = 'CANCELLED'
        order.save()
        return order


# --- steps -----------------------------------------------------------------

def _lock_step(step):
    from .models import ProductionStep

    step = ProductionStep.objects.select_for_update().select_related('production_order').get(pk=step.pk)
    if step.production_order.status != 'IN_PROGRESS':
        raise ProductionError('Steps can only be worked on while the order is in progress. Start the order first.')
    return step


def start_step(step):
    with transaction.atomic():
        step = _lock_step(step)
        if step.status != 'PENDING':
            raise ProductionError('Only pending steps can be started.')
        step.status = 'IN_PROGRESS'
        step.start_time = timezone.now()
        step.save()
        return step, None


def complete_step(step):
    with transaction.atomic():
        step = _lock_step(step)
        if step.status != 'IN_PROGRESS':
            raise ProductionError('Start this step before completing it.')
        step.status = 'COMPLETED'
        step.end_time = timezone.now()
        step.save()
        return step, _start_next_step(step.production_order)


def skip_step(step):
    with transaction.atomic():
        step = _lock_step(step)
        if step.status not in ('PENDING', 'IN_PROGRESS'):
            raise ProductionError(f'A {step.get_status_display().lower()} step can’t be skipped.')
        step.status = 'SKIPPED'
        step.end_time = timezone.now()
        step.save()
        return step, _start_next_step(step.production_order)
