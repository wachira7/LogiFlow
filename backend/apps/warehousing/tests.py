from apps.inventory.models import InventoryItem, InventoryTransaction
from apps.warehousing.models import TransferItem, WarehouseTransfer
from utils.testing import AuthenticatedAPITestCase, make_company, make_product, make_warehouse

BASE = '/api/v1/warehousing'


class WarehousingTests(AuthenticatedAPITestCase):
    def make_transfer(self, company):
        return WarehouseTransfer.objects.create(
            company=company, transfer_number='TR-1',
            source_warehouse=make_warehouse(company), destination_warehouse=make_warehouse(company),
        )

    def test_transfer_item_detail_for_own_company(self):
        item = TransferItem.objects.create(transfer=self.make_transfer(self.company),
                                           product=make_product(self.company), quantity=5)
        self.assertEqual(self.client.get(f'{BASE}/transfer-items/{item.id}/').status_code, 200)

    def test_other_company_transfer_is_404(self):
        transfer = self.make_transfer(make_company())
        self.assertEqual(self.client.get(f'{BASE}/transfers/{transfer.id}/').status_code, 404)

    def test_dashboard(self):
        self.make_transfer(self.company)
        self.assertEqual(self.client.get(f'{BASE}/transfers/dashboard/').status_code, 200)


class TransferFlowTests(AuthenticatedAPITestCase):
    """Stock must always match reality: it leaves the source once and arrives at the destination once."""

    def setUp(self):
        super().setUp()
        self.nairobi = make_warehouse(self.company)
        self.mombasa = make_warehouse(self.company)
        self.flour = make_product(self.company)
        self.stock(self.flour, self.nairobi, 100)

    def stock(self, product, warehouse, qty):
        self.client.post('/api/v1/inventory/inventory-items/', {
            'product_id': str(product.id), 'warehouse_id': str(warehouse.id), 'quantity': qty,
        }, format='json')

    def qty(self, product, warehouse):
        item = InventoryItem.objects.filter(product=product, warehouse=warehouse).first()
        return item.quantity if item else 0

    def create(self, qty=30, **extra):
        r = self.client.post(f'{BASE}/transfers/', {
            'source_warehouse_id': str(self.nairobi.id), 'destination_warehouse_id': str(self.mombasa.id),
            'transfer_items': [{'product_id': str(self.flour.id), 'quantity': qty}], **extra,
        }, format='json')
        return r

    def act(self, transfer_id, action):
        return self.client.post(f'{BASE}/transfers/{transfer_id}/{action}_transfer/')

    def test_create_records_initiator_and_generates_number(self):
        r = self.create()
        self.assertEqual(r.status_code, 201, r.content)
        transfer = WarehouseTransfer.objects.get(id=r.json()['id'])
        self.assertEqual(transfer.initiated_by, self.user)
        self.assertTrue(transfer.transfer_number.startswith('TR-'))

    def test_full_flow_moves_stock_exactly_once(self):
        tid = self.create().json()['id']
        self.assertEqual(self.act(tid, 'approve').status_code, 200)
        self.assertEqual((self.qty(self.flour, self.nairobi), self.qty(self.flour, self.mombasa)), (70, 0))
        # stock left at approval; "start" can't take it again
        self.assertEqual(self.act(tid, 'start').status_code, 400)
        self.assertEqual(self.qty(self.flour, self.nairobi), 70)
        self.assertEqual(self.act(tid, 'complete').status_code, 200)
        self.assertEqual((self.qty(self.flour, self.nairobi), self.qty(self.flour, self.mombasa)), (70, 30))
        self.assertEqual(self.act(tid, 'complete').status_code, 400)
        # ledger balances match both stock lines
        for wh in (self.nairobi, self.mombasa):
            item = InventoryItem.objects.get(product=self.flour, warehouse=wh)
            self.assertEqual(sum(item.transactions.values_list('quantity', flat=True)), item.quantity)

    def test_approve_checks_stock(self):
        tid = self.create(qty=500).json()['id']
        r = self.act(tid, 'approve')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.qty(self.flour, self.nairobi), 100)
        self.assertEqual(WarehouseTransfer.objects.get(id=tid).status, 'PENDING')

    def test_cancel_after_dispatch_returns_stock_once(self):
        tid = self.create().json()['id']
        self.act(tid, 'approve')
        self.assertEqual(self.act(tid, 'cancel').status_code, 200)
        self.assertEqual(self.qty(self.flour, self.nairobi), 100)
        self.assertEqual(self.act(tid, 'cancel').status_code, 400)
        self.assertEqual(self.qty(self.flour, self.nairobi), 100)

    def test_cancel_pending_moves_no_stock(self):
        tid = self.create().json()['id']
        self.act(tid, 'cancel')
        self.assertEqual(self.qty(self.flour, self.nairobi), 100)
        self.assertFalse(InventoryTransaction.objects.filter(reference__startswith='TR-').exists())

    def test_legacy_in_transit_transfer_without_dispatch(self):
        # approved under the old flow: IN_TRANSIT but stock never left
        tid = self.create().json()['id']
        WarehouseTransfer.objects.filter(id=tid).update(status='IN_TRANSIT')
        self.assertEqual(self.act(tid, 'complete').status_code, 400)  # can't arrive before it leaves
        self.assertEqual(self.act(tid, 'start').status_code, 200)
        self.assertEqual(self.qty(self.flour, self.nairobi), 70)
        self.assertEqual(self.act(tid, 'complete').status_code, 200)
        self.assertEqual(self.qty(self.flour, self.mombasa), 30)

    def test_status_cannot_be_edited_directly(self):
        tid = self.create().json()['id']
        self.client.patch(f'{BASE}/transfers/{tid}/', {'status': 'COMPLETED'}, format='json')
        self.assertEqual(WarehouseTransfer.objects.get(id=tid).status, 'PENDING')
        self.assertEqual(self.qty(self.flour, self.mombasa), 0)

    def test_editing_only_while_pending(self):
        tid = self.create().json()['id']
        r = self.client.patch(f'{BASE}/transfers/{tid}/', {'notes': 'Use the blue truck'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(WarehouseTransfer.objects.get(id=tid).notes, 'Use the blue truck')
        self.act(tid, 'approve')
        self.assertEqual(self.client.patch(f'{BASE}/transfers/{tid}/', {'notes': 'x'}, format='json').status_code, 400)

    def test_items_change_only_while_pending(self):
        tid = self.create().json()['id']
        sugar = make_product(self.company)
        r = self.client.post(f'{BASE}/transfer-items/', {'transfer_id': tid, 'product_id': str(sugar.id), 'quantity': 5}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.act(tid, 'cancel')
        r = self.client.post(f'{BASE}/transfer-items/', {'transfer_id': tid, 'product_id': str(sugar.id), 'quantity': 5}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_delete_only_pending_or_cancelled(self):
        tid = self.create().json()['id']
        self.act(tid, 'approve')
        self.assertEqual(self.client.delete(f'{BASE}/transfers/{tid}/').status_code, 400)
        self.act(tid, 'cancel')
        self.assertEqual(self.client.delete(f'{BASE}/transfers/{tid}/').status_code, 204)

    def test_item_validation(self):
        self.assertEqual(self.create(qty=0).status_code, 400)
        r = self.client.post(f'{BASE}/transfers/', {
            'source_warehouse_id': str(self.nairobi.id), 'destination_warehouse_id': str(self.mombasa.id),
            'transfer_items': [{'product_id': str(self.flour.id), 'quantity': 5}, {'product_id': str(self.flour.id), 'quantity': 5}],
        }, format='json')
        self.assertEqual(r.status_code, 400)
        foreign = make_product(make_company())
        r = self.client.post(f'{BASE}/transfers/', {
            'source_warehouse_id': str(self.nairobi.id), 'destination_warehouse_id': str(self.mombasa.id),
            'transfer_items': [{'product_id': str(foreign.id), 'quantity': 5}],
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_ordering_by_value_does_not_crash(self):
        self.create()
        self.assertEqual(self.client.get(f'{BASE}/transfers/', {'ordering': 'total_value'}).status_code, 200)


    def test_dashboard_and_movement_report_numbers(self):
        done, on_road = self.create(qty=10).json()['id'], self.create(qty=20).json()['id']
        self.act(done, 'approve')
        self.act(done, 'complete')
        self.act(on_road, 'approve')
        dash = self.client.get(f'{BASE}/transfers/dashboard/').json()
        self.assertEqual((dash['completed_transfers'], dash['in_transit_transfers']), (1, 1))
        self.assertEqual(float(dash['in_transit_value']), float(20 * self.flour.cost_price))
        report = self.client.get(f'{BASE}/transfers/stock_movements/').json()
        self.assertEqual(report['total_movement_pairs'], 1)
        pair = report['stock_movements'][0]
        self.assertEqual((pair['transfer_count'], pair['total_items'], pair['total_quantity']), (1, 1, 10))
        self.assertIsNotNone(pair['last_transfer_at'])

    def test_shortage_and_most_moved_reports(self):
        short = self.create(qty=150).json()['id']  # only 100 in stock
        done = self.create(qty=10).json()['id']
        self.act(done, 'approve')
        self.act(done, 'complete')
        report = self.client.get(f'{BASE}/transfer-items/insufficient_stock_report/').json()
        self.assertEqual(report['total_items_with_shortage'], 1)
        row = report['insufficient_stock_items'][0]
        self.assertEqual((row['transfer_id'], row['shortage']), (short, 60))
        self.assertAlmostEqual(float(report['total_shortage_value']), float(60 * self.flour.cost_price))
        popular = self.client.get(f'{BASE}/transfer-items/popular_transfers/').json()['popular_transfer_products']
        self.assertEqual([(p['product__sku'], p['transfer_count'], p['total_quantity']) for p in popular], [(self.flour.sku, 1, 10)])

    def test_list_query_count_does_not_grow_per_transfer(self):
        self.create(qty=1)
        one = self._list_queries()
        for _ in range(5):
            self.create(qty=1)
        self.assertEqual(self._list_queries(), one)

    def _list_queries(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        with CaptureQueriesContext(connection) as ctx:
            self.assertEqual(self.client.get(f'{BASE}/transfers/').status_code, 200)
        return len(ctx.captured_queries)


class DispatchBackfillTests(AuthenticatedAPITestCase):
    def test_backfill_marks_only_transfers_whose_stock_left_the_source(self):
        import importlib

        from django.apps import apps

        backfill = importlib.import_module('apps.warehousing.migrations.0004_backfill_stock_dispatched').backfill
        source, dest, product = make_warehouse(self.company), make_warehouse(self.company), make_product(self.company)
        line = InventoryItem.objects.create(product=product, warehouse=source, quantity=10)
        left = WarehouseTransfer.objects.create(company=self.company, transfer_number='TR-OLD-1', status='IN_TRANSIT',
                                                source_warehouse=source, destination_warehouse=dest)
        stuck = WarehouseTransfer.objects.create(company=self.company, transfer_number='TR-OLD-2', status='IN_TRANSIT',
                                                 source_warehouse=source, destination_warehouse=dest)
        InventoryTransaction.objects.create(inventory_item=line, transaction_type='TRANSFER', quantity=-5, reference='TR-OLD-1')
        backfill(apps, None)
        left.refresh_from_db()
        stuck.refresh_from_db()
        self.assertTrue(left.stock_dispatched)
        self.assertFalse(stuck.stock_dispatched)
