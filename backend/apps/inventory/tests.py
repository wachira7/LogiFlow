from apps.inventory.models import InventoryItem, InventoryTransaction, Product
from utils.testing import AuthenticatedAPITestCase, make_company, make_product, make_shipment, make_warehouse

BASE = '/api/v1/inventory'


class InventoryTests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.warehouse = make_warehouse(self.company)
        self.product = make_product(self.company, reorder_point=10)
        other = make_company()
        self.other_warehouse = make_warehouse(other)
        self.other_product = make_product(other)

    def adjust(self, quantity, product=None, warehouse=None):
        return self.client.post(f'{BASE}/inventory-items/adjust_stock/', {
            'product_id': str((product or self.product).id),
            'warehouse_id': str((warehouse or self.warehouse).id),
            'adjustment_quantity': quantity,
            'reason': 'Stock count',
        }, format='json')

    def test_lists_only_show_own_company(self):
        products = self.results(self.client.get(f'{BASE}/products/'))
        warehouses = self.results(self.client.get(f'{BASE}/warehouses/'))
        self.assertEqual([p['id'] for p in products], [str(self.product.id)])
        self.assertEqual([w['id'] for w in warehouses], [str(self.warehouse.id)])

    def test_other_company_and_unknown_ids_are_404(self):
        self.assertEqual(self.client.get(f'{BASE}/products/{self.other_product.id}/').status_code, 404)
        self.assertEqual(self.client.get(f'{BASE}/warehouses/{self.other_warehouse.id}/').status_code, 404)
        self.assertEqual(self.client.get(f'{BASE}/products/not-a-uuid/').status_code, 404)

    def test_create_product(self):
        r = self.client.post(f'{BASE}/products/', {
            'name': 'Maize Flour 2kg', 'sku': 'MF-2', 'unit_price': '180.00', 'cost_price': '140.00',
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(Product.objects.get(sku='MF-2').company, self.company)

    def test_adjust_stock_creates_item_and_transaction(self):
        r = self.adjust(25)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['new_quantity'], 25)
        item = InventoryItem.objects.get(product=self.product, warehouse=self.warehouse)
        self.assertEqual(item.quantity, 25)
        self.assertEqual(item.transactions.get().transaction_type, 'ADJUSTMENT')

        # removing more than is in stock is rejected (it used to clamp to 0 and log -40)
        self.assertEqual(self.adjust(-40).status_code, 400)
        self.assertEqual(self.adjust(-25).json()['new_quantity'], 0)

    def test_adjust_stock_rejects_other_company_product(self):
        self.assertEqual(self.adjust(5, product=self.other_product).status_code, 400)

    def test_inventory_item_and_transaction_detail(self):
        self.adjust(5)
        item = InventoryItem.objects.get()
        transaction = InventoryTransaction.objects.get()
        self.assertEqual(self.client.get(f'{BASE}/inventory-items/{item.id}/').status_code, 200)
        self.assertEqual(self.client.get(f'{BASE}/transactions/{transaction.id}/').status_code, 200)
        r = self.client.patch(f'{BASE}/inventory-items/{item.id}/', {'location': 'Aisle 3'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)

    def test_other_company_inventory_item_is_404(self):
        item = InventoryItem.objects.create(product=self.other_product, warehouse=self.other_warehouse, quantity=3)
        self.assertEqual(self.client.get(f'{BASE}/inventory-items/{item.id}/').status_code, 404)

    def test_low_stock_and_stock_report(self):
        self.adjust(4)  # below reorder point of 10
        low = self.client.get(f'{BASE}/products/low_stock/').json()
        self.assertEqual([p['id'] for p in low], [str(self.product.id)])
        report = self.client.get(f'{BASE}/products/stock_report/').json()
        self.assertEqual(report['total_products'], 1)
        self.assertEqual(report['low_stock_products'], 1)

    def test_stock_report_snapshot(self):
        self.adjust(4)
        empty = make_product(self.company, reorder_point=0)
        InventoryItem.objects.create(product=empty, warehouse=self.warehouse, quantity=0)
        make_product(make_company())  # other company's products never count
        report = self.client.get(f'{BASE}/products/stock_report/').json()
        self.assertEqual(report['total_products'], 2)
        self.assertEqual(report['out_of_stock_products'], 1)
        self.assertEqual(report['total_units'], 4)
        self.assertEqual(float(report['total_stock_value']), float(4 * self.product.cost_price))
        self.assertEqual([w['id'] for w in report['by_warehouse']], [str(self.warehouse.id)])
        self.assertEqual(report['by_warehouse'][0]['lines'], 2)
        self.assertEqual([r['id'] for r in report['reorder']], [str(self.product.id)])
        self.assertEqual(report['reorder'][0]['suggested_order'], 16)  # back up to twice the reorder point
        out = self.results(self.client.get(f'{BASE}/inventory-items/?out_of_stock=true'))
        self.assertEqual([i['product_id'] for i in out], [str(empty.id)])
        summary = self.client.get(f'{BASE}/warehouses/{self.warehouse.id}/stock_summary/').json()
        self.assertEqual(summary['low_stock_items'], 1)  # the empty line has no reorder point, so it isn't "low"


    def test_receive_records_a_receipt_and_adds_to_existing_stock(self):
        url = f'{BASE}/inventory-items/receive/'
        body = {'product_id': str(self.product.id), 'warehouse_id': str(self.warehouse.id), 'quantity': 30, 'reference': 'PO-77', 'location': 'A-1'}
        r = self.client.post(url, body, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        r = self.client.post(url, {**body, 'quantity': 5, 'location': ''}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['new_quantity'], 35)
        item = InventoryItem.objects.get(product=self.product, warehouse=self.warehouse)
        self.assertEqual((item.quantity, item.location), (35, 'A-1'))
        self.assertEqual(list(item.transactions.values_list('transaction_type', 'quantity', 'reference').order_by('timestamp')),
                         [('RECEIPT', 30, 'PO-77'), ('RECEIPT', 5, 'PO-77')])
        self.assertEqual(self.client.post(url, {**body, 'quantity': 0}, format='json').status_code, 400)
        self.assertEqual(self.client.post(url, {**body, 'product_id': str(self.other_product.id)}, format='json').status_code, 400)
        self.warehouse.is_active = False
        self.warehouse.save()
        self.assertEqual(self.client.post(url, body, format='json').status_code, 400)

    def test_stock_count_sets_last_checked(self):
        self.adjust(5)
        item = InventoryItem.objects.get()
        self.assertIsNotNone(item.last_checked)  # the helper's reason is 'Stock count'
        r = self.client.post(f'{BASE}/inventory-items/adjust_stock/', {
            'product_id': str(self.product.id), 'warehouse_id': str(self.warehouse.id), 'adjustment_quantity': 1, 'reason': 'Damaged',
        }, format='json')
        self.assertEqual(r.status_code, 200)


class InventoryAuditTests(AuthenticatedAPITestCase):
    """Behaviour the inventory module must guarantee (written during the module audit)."""

    def setUp(self):
        super().setUp()
        self.warehouse = make_warehouse(self.company, capacity=1000)
        self.product = make_product(self.company, reorder_point=10)
        self.other = make_company()

    def adjust(self, qty, product=None, warehouse=None, reason='Stock count'):
        return self.client.post(f'{BASE}/inventory-items/adjust_stock/', {
            'product_id': str((product or self.product).id), 'warehouse_id': str((warehouse or self.warehouse).id),
            'adjustment_quantity': qty, 'reason': reason,
        }, format='json')

    # ── categories ──────────────────────────────────────────────
    def test_duplicate_names_are_a_400_not_a_crash(self):
        from apps.inventory.models import Category

        Category.objects.create(company=self.company, name='Cereals')
        r = self.client.post(f'{BASE}/categories/', {'name': 'Cereals'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.post(f'{BASE}/products/', {'name': 'X', 'sku': self.product.sku, 'unit_price': '1', 'cost_price': '1'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.post(f'{BASE}/warehouses/', {'name': self.warehouse.name, 'address': 'x'}, format='json')
        self.assertEqual(r.status_code, 400)
        # same names are fine in another company
        Category.objects.create(company=self.other, name='Cereals')

    def test_category_parent_must_be_own_company_and_not_a_cycle(self):
        from apps.inventory.models import Category

        parent = Category.objects.create(company=self.company, name='Food')
        child = Category.objects.create(company=self.company, name='Flour', parent=parent)
        foreign = Category.objects.create(company=self.other, name='Theirs')
        r = self.client.post(f'{BASE}/categories/', {'name': 'Rice', 'parent_id': str(foreign.id)}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.patch(f'{BASE}/categories/{parent.id}/', {'parent_id': str(child.id)}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.patch(f'{BASE}/categories/{parent.id}/', {'parent_id': str(parent.id)}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_deleting_a_category_with_subcategories_is_blocked(self):
        from apps.inventory.models import Category

        parent = Category.objects.create(company=self.company, name='Food')
        Category.objects.create(company=self.company, name='Flour', parent=parent)
        r = self.client.delete(f'{BASE}/categories/{parent.id}/')
        self.assertEqual(r.status_code, 400)
        self.assertTrue(Category.objects.filter(name='Flour').exists())

    # ── products ────────────────────────────────────────────────
    def test_product_category_must_be_own_company(self):
        from apps.inventory.models import Category

        foreign = Category.objects.create(company=self.other, name='Theirs')
        r = self.client.post(f'{BASE}/products/', {
            'name': 'Sugar', 'sku': 'SUG-1', 'unit_price': '150', 'cost_price': '120', 'category_id': str(foreign.id),
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_product_validation(self):
        base = {'name': 'Sugar', 'sku': 'SUG-1', 'unit_price': '150', 'cost_price': '120'}
        self.assertEqual(self.client.post(f'{BASE}/products/', {**base, 'unit_price': '-1'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(f'{BASE}/products/', {**base, 'min_stock_level': 50, 'max_stock_level': 10}, format='json').status_code, 400)

    def test_ordering_by_stock_does_not_crash(self):
        self.assertEqual(self.client.get(f'{BASE}/products/', {'ordering': 'total_stock'}).status_code, 200)

    def test_new_product_without_reorder_point_is_not_flagged(self):
        from apps.inventory.models import Product

        p = make_product(self.company, reorder_point=0)
        self.assertFalse(Product.objects.get(pk=p.pk).needs_reorder)
        low = [x['id'] for x in self.client.get(f'{BASE}/products/low_stock/').json()]
        self.assertNotIn(str(p.id), low)

    def test_deleting_a_product_with_history_is_blocked(self):
        from apps.inventory.models import Product

        self.adjust(5)
        r = self.client.delete(f'{BASE}/products/{self.product.id}/')
        self.assertEqual(r.status_code, 400)
        self.assertIn('deactivate', r.json()['message'].lower())
        self.assertTrue(Product.objects.filter(pk=self.product.pk).exists())
        # a product with no history can be deleted
        unused = make_product(self.company)
        self.assertEqual(self.client.delete(f'{BASE}/products/{unused.id}/').status_code, 204)

    # ── warehouses ──────────────────────────────────────────────
    def test_warehouse_manager_must_be_own_company(self):
        from utils.testing import make_user

        stranger = make_user(company=self.other)
        r = self.client.post(f'{BASE}/warehouses/', {'name': 'Kisumu', 'address': 'x', 'manager_id': str(stranger.id)}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_warehouse_utilization_is_reported(self):
        self.adjust(250)
        data = self.client.get(f'{BASE}/warehouses/{self.warehouse.id}/').json()
        self.assertEqual(data['utilization_percentage'], 25.0)

    def test_deleting_a_warehouse_with_stock_or_shipments_is_blocked(self):
        from apps.inventory.models import Warehouse

        self.adjust(5)
        self.assertEqual(self.client.delete(f'{BASE}/warehouses/{self.warehouse.id}/').status_code, 400)
        empty = make_warehouse(self.company)
        make_shipment(self.company, warehouse=empty)
        self.assertEqual(self.client.delete(f'{BASE}/warehouses/{empty.id}/').status_code, 400)
        self.assertEqual(Warehouse.objects.filter(pk=empty.pk).count(), 1)
        unused = make_warehouse(self.company)
        self.assertEqual(self.client.delete(f'{BASE}/warehouses/{unused.id}/').status_code, 204)

    # ── stock movements ─────────────────────────────────────────
    def test_cannot_remove_more_stock_than_available(self):
        self.adjust(25)
        r = self.adjust(-40)
        self.assertEqual(r.status_code, 400)
        self.assertIn('25', r.json()['message'])
        item = InventoryItem.objects.get(product=self.product, warehouse=self.warehouse)
        self.assertEqual(item.quantity, 25)
        # the ledger always matches the stock level
        self.assertEqual(sum(item.transactions.values_list('quantity', flat=True)), item.quantity)

    def test_zero_adjustment_is_rejected(self):
        self.assertEqual(self.adjust(0).status_code, 400)

    def test_quantity_cannot_be_edited_directly(self):
        self.adjust(10)
        item = InventoryItem.objects.get()
        r = self.client.patch(f'{BASE}/inventory-items/{item.id}/', {'quantity': 999, 'location': 'Aisle 4'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        item.refresh_from_db()
        self.assertEqual((item.quantity, item.location), (10, 'Aisle 4'))

    def test_stocking_a_product_in_a_warehouse(self):
        r = self.client.post(f'{BASE}/inventory-items/', {
            'product_id': str(self.product.id), 'warehouse_id': str(self.warehouse.id), 'quantity': 40, 'location': 'A1',
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        item = InventoryItem.objects.get(product=self.product, warehouse=self.warehouse)
        self.assertEqual(item.quantity, 40)
        txn = item.transactions.get()
        self.assertEqual((txn.transaction_type, txn.quantity), ('RECEIPT', 40))
        # stocking the same product again is a clear error
        again = self.client.post(f'{BASE}/inventory-items/', {
            'product_id': str(self.product.id), 'warehouse_id': str(self.warehouse.id), 'quantity': 5,
        }, format='json')
        self.assertEqual(again.status_code, 400)

    def test_stocking_rejects_other_company_product(self):
        foreign = make_product(self.other)
        r = self.client.post(f'{BASE}/inventory-items/', {
            'product_id': str(foreign.id), 'warehouse_id': str(self.warehouse.id), 'quantity': 1,
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_bulk_update_validates_and_skips_no_ops(self):
        self.adjust(10)
        url = f'{BASE}/inventory-items/bulk_update/'
        row = {'product_id': str(self.product.id), 'warehouse_id': str(self.warehouse.id)}
        self.assertEqual(self.client.post(url, {'updates': [{**row, 'quantity': '-5'}]}, format='json').status_code, 400)
        r = self.client.post(url, {'updates': [{**row, 'quantity': '10'}]}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(InventoryTransaction.objects.count(), 1)  # unchanged quantity records nothing
        self.client.post(url, {'updates': [{**row, 'quantity': '14'}]}, format='json')
        item = InventoryItem.objects.get()
        self.assertEqual(sum(item.transactions.values_list('quantity', flat=True)), 14)


class DeletionSafetyNetTests(AuthenticatedAPITestCase):
    """History records are never cascade-deleted with a product or warehouse, but whole companies can be removed."""

    def build_history(self, company):
        from apps.distribution.models import OrderItem, ShipmentItem
        from utils.testing import make_order

        warehouse = make_warehouse(company)
        product = make_product(company)
        order = make_order(company)
        order_item = OrderItem.objects.create(order=order, product=product, quantity=1, unit_price=1, total_price=1)
        shipment = make_shipment(company, warehouse=warehouse, order=order)
        ShipmentItem.objects.create(shipment=shipment, order_item=order_item, product=product, quantity=1)
        return product, warehouse, order

    def test_direct_delete_of_product_or_warehouse_with_history_is_refused(self):
        from django.db.models import RestrictedError

        product, warehouse, order = self.build_history(self.company)
        with self.assertRaises(RestrictedError):
            product.delete()
        with self.assertRaises(RestrictedError):
            warehouse.delete()
        self.assertTrue(order.order_items.exists())

    def test_deleting_a_company_still_removes_everything(self):
        from apps.distribution.models import CustomerOrder

        company = make_company()
        self.build_history(company)
        company.delete()
        self.assertFalse(CustomerOrder.objects.filter(company_id=company.id).exists())


class InventoryFieldTests(AuthenticatedAPITestCase):
    def test_product_unit_and_warehouse_contact_details_are_saved(self):
        r = self.client.post(f'{BASE}/products/', {
            'name': 'Cooking oil 1L', 'sku': 'OIL-1', 'unit_price': '320', 'cost_price': '250', 'unit_of_measure': 'liter',
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(Product.objects.get(sku='OIL-1').unit_of_measure, 'liter')

        r = self.client.post(f'{BASE}/warehouses/', {
            'name': 'Mombasa hub', 'address': 'Port Reitz Rd', 'city': 'Mombasa', 'country': 'Kenya',
            'phone': '+254700000001', 'email': 'mombasa@duka.co.ke', 'manager_id': str(self.user.id), 'capacity': 5000,
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        data = self.client.get(f"{BASE}/warehouses/{r.json()['id']}/").json()
        self.assertEqual((data['city'], data['country'], data['manager_name']), ('Mombasa', 'Kenya', self.user.get_full_name()))


class InventoryFilterTests(AuthenticatedAPITestCase):
    """Filters the frontend sends must actually filter."""

    def setUp(self):
        super().setUp()
        self.nairobi = make_warehouse(self.company)
        self.mombasa = make_warehouse(self.company)
        self.low = make_product(self.company, reorder_point=10)
        self.ok = make_product(self.company, reorder_point=10)
        for product, warehouse, qty in [(self.low, self.nairobi, 4), (self.ok, self.mombasa, 50)]:
            self.client.post(f'{BASE}/inventory-items/', {
                'product_id': str(product.id), 'warehouse_id': str(warehouse.id), 'quantity': qty,
            }, format='json')

    def ids(self, url, **params):
        return {row['id'] for row in self.results(self.client.get(url, params))}

    def test_product_filters(self):
        self.assertEqual(self.ids(f'{BASE}/products/', low_stock='true'), {str(self.low.id)})
        self.assertEqual(self.ids(f'{BASE}/products/', warehouse=str(self.mombasa.id)), {str(self.ok.id)})

    def test_inventory_item_low_stock_filter(self):
        rows = self.results(self.client.get(f'{BASE}/inventory-items/', {'low_stock': 'true'}))
        self.assertEqual([r['product_id'] for r in rows], [str(self.low.id)])

    def test_transaction_filters(self):
        url = f'{BASE}/transactions/'
        by_product = self.results(self.client.get(url, {'product': str(self.low.id)}))
        by_warehouse = self.results(self.client.get(url, {'warehouse': str(self.mombasa.id)}))
        self.assertEqual([r['product_name'] for r in by_product], [self.low.name])
        self.assertEqual([r['product_name'] for r in by_warehouse], [self.ok.name])
        self.assertEqual(self.results(self.client.get(url, {'date_from': '2000-01-01', 'date_to': '2000-01-02'})), [])


class LedgerBalanceTests(AuthenticatedAPITestCase):
    def test_each_movement_records_the_running_balance(self):
        warehouse, product = make_warehouse(self.company), make_product(self.company)
        self.client.post(f'{BASE}/inventory-items/', {
            'product_id': str(product.id), 'warehouse_id': str(warehouse.id), 'quantity': 120,
        }, format='json')
        self.client.post(f'{BASE}/inventory-items/adjust_stock/', {
            'product_id': str(product.id), 'warehouse_id': str(warehouse.id), 'adjustment_quantity': -20, 'reason': 'Damaged',
        }, format='json')
        rows = self.results(self.client.get(f'{BASE}/transactions/', {'ordering': 'timestamp'}))
        self.assertEqual([(r['balance_before'], r['quantity'], r['balance_after']) for r in rows], [(0, 120, 120), (120, -20, 100)])
        self.assertEqual(rows[1]['performed_by_name'], self.user.get_full_name())
