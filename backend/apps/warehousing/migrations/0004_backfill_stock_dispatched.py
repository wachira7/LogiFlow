"""Mark transfers whose stock already left the source (an outbound TRANSFER movement exists in the ledger)."""
from django.db import migrations


def backfill(apps, schema_editor):
    WarehouseTransfer = apps.get_model('warehousing', 'WarehouseTransfer')
    InventoryTransaction = apps.get_model('inventory', 'InventoryTransaction')
    for transfer in WarehouseTransfer.objects.filter(status__in=['IN_TRANSIT', 'COMPLETED']).iterator():
        left_source = InventoryTransaction.objects.filter(
            transaction_type='TRANSFER', quantity__lt=0, reference=transfer.transfer_number,
            inventory_item__warehouse_id=transfer.source_warehouse_id,
        ).exists()
        if left_source:
            WarehouseTransfer.objects.filter(pk=transfer.pk).update(stock_dispatched=True)


class Migration(migrations.Migration):
    dependencies = [('warehousing', '0003_transfer_stock_dispatched'), ('inventory', '0007_transaction_balance_after')]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
