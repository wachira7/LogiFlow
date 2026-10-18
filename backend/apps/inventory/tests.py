from apps.inventory.models import InventoryItem, InventoryTransaction, Product
from utils.testing import AuthenticatedAPITestCase, make_company, make_product, make_warehouse

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

        r = self.adjust(-40)
        self.assertEqual(r.json()['new_quantity'], 0)  # never negative

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
