# apps/warehousing/services.py
"""
Stock moves for warehouse transfers. Each step is atomic and locks the stock rows it touches, so a
transfer takes stock out of the source exactly once and puts it into the destination exactly once.

    PENDING --dispatch--> IN_TRANSIT (stock left source) --receive--> COMPLETED (stock at destination)
       \\--cancel--> CANCELLED          \\--cancel--> CANCELLED (stock returned to source)
"""
from django.db import transaction
from django.utils import timezone

from apps.inventory.models import InventoryItem, InventoryTransaction


class TransferError(Exception):
    """A transfer step that isn't allowed; the message is shown to the user."""

    def __init__(self, message, details=None):
        super().__init__(message)
        self.details = details or {}


def _lock_transfer(transfer):
    from .models import WarehouseTransfer

    return WarehouseTransfer.objects.select_for_update().get(pk=transfer.pk)


def _move(item, warehouse, qty, transfer, user, note, location=''):
    """Change one stock line by qty (negative = out) and record it in the ledger."""
    line, _ = InventoryItem.objects.get_or_create(
        product=item.product, warehouse=warehouse, defaults={'quantity': 0, 'location': location},
    )
    line = InventoryItem.objects.select_for_update().get(pk=line.pk)
    line.quantity += qty
    if location:
        line.location = location
    line.save()
    InventoryTransaction.objects.create(
        inventory_item=line, transaction_type='TRANSFER', quantity=qty,
        reference=transfer.transfer_number, notes=note, performed_by=user,
    )


def dispatch(transfer, user, *, approve=True):
    """Take the stock out of the source warehouse (on approval, or "start" for legacy transfers)."""
    with transaction.atomic():
        transfer = _lock_transfer(transfer)
        if approve and transfer.status != 'PENDING':
            raise TransferError('Only pending transfers can be approved.')
        if not approve and not (transfer.status == 'IN_TRANSIT' and not transfer.stock_dispatched):
            raise TransferError('This transfer’s stock has already left the source warehouse.')
        items = list(transfer.transfer_items.select_related('product'))
        if not items:
            raise TransferError('Add at least one item before approving this transfer.')

        shortages = []
        for item in items:
            line = InventoryItem.objects.select_for_update().filter(
                product=item.product, warehouse=transfer.source_warehouse,
            ).first()
            available = line.quantity if line else 0
            if available < item.quantity:
                shortages.append({'product': item.product.name, 'required': item.quantity, 'available': available})
        if shortages:
            names = ', '.join(f"{s['product']} (need {s['required']}, have {s['available']})" for s in shortages)
            raise TransferError(f'Not enough stock in {transfer.source_warehouse.name}: {names}.',
                                {'insufficient_items': shortages})

        for item in items:
            _move(item, transfer.source_warehouse, -item.quantity, transfer, user,
                  f'Transfer to {transfer.destination_warehouse.name}', item.source_location)
        transfer.status = 'IN_TRANSIT'
        transfer.stock_dispatched = True
        if approve:
            transfer.approved_by = user
        transfer.save()
        return transfer


def receive(transfer, user):
    """Put the stock into the destination warehouse and complete the transfer."""
    with transaction.atomic():
        transfer = _lock_transfer(transfer)
        if transfer.status != 'IN_TRANSIT':
            raise TransferError('Only transfers in transit can be completed.')
        if not transfer.stock_dispatched:
            raise TransferError('The stock hasn’t left the source warehouse yet. Start the transfer first.')
        for item in transfer.transfer_items.select_related('product'):
            _move(item, transfer.destination_warehouse, item.quantity, transfer, user,
                  f'Transfer from {transfer.source_warehouse.name}', item.destination_location)
        transfer.status = 'COMPLETED'
        transfer.completed_at = timezone.now()
        transfer.save()
        return transfer


def cancel(transfer, user):
    """Cancel; if the stock already left the source, put it back."""
    with transaction.atomic():
        transfer = _lock_transfer(transfer)
        if transfer.status not in ('PENDING', 'IN_TRANSIT'):
            raise TransferError(f'A {transfer.get_status_display().lower()} transfer can’t be cancelled.')
        if transfer.stock_dispatched:
            for item in transfer.transfer_items.select_related('product'):
                _move(item, transfer.source_warehouse, item.quantity, transfer, user,
                      'Transfer cancelled: stock returned', item.source_location)
            transfer.stock_dispatched = False
        transfer.status = 'CANCELLED'
        transfer.save()
        return transfer
