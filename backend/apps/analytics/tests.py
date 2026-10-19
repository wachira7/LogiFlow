from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from apps.distribution.models import CustomerOrder, Shipment
from apps.inventory.models import InventoryItem
from utils.testing import AuthenticatedAPITestCase, make_company, make_order, make_product, make_shipment, make_warehouse

URL = '/api/v1/analytics/report/'


class AnalyticsReportTests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.store, self.depot = make_warehouse(self.company), make_warehouse(self.company)
        self.flour, self.bread = make_product(self.company), make_product(self.company)
        InventoryItem.objects.create(product=self.flour, warehouse=self.store, quantity=100)

    def test_empty_company_has_zeroes_not_fake_numbers(self):
        other = make_company()
        make_order(other, total_amount=Decimal('999'))
        data = self.client.get(URL).json()
        self.assertEqual(data['distribution']['orders'], {'value': 0, 'previous': 0, 'change': None})
        self.assertIsNone(data['distribution']['on_time_rate']['value'])
        self.assertEqual(len(data['series']['dates']), 30)
        self.assertEqual(sum(data['series']['orders']), 0)

    def test_orders_revenue_and_change_against_previous_period(self):
        now = timezone.now()
        for amount in ('100', '300'):
            make_order(self.company, total_amount=Decimal(amount))
        make_order(self.company, total_amount=Decimal('50'), status='CANCELLED')
        old = make_order(self.company, total_amount=Decimal('200'))
        CustomerOrder.objects.filter(pk=old.pk).update(created_at=now - timedelta(days=10))
        data = self.client.get(URL, {'days': 7}).json()
        d = data['distribution']
        self.assertEqual(d['orders'], {'value': 3, 'previous': 1, 'change': 200.0})
        self.assertEqual(d['revenue']['value'], 400.0)  # cancelled excluded
        self.assertEqual(d['revenue']['previous'], 200.0)
        self.assertEqual(len(data['series']['dates']), 7)
        self.assertEqual(data['series']['orders'][-1], 3)
        self.assertEqual(d['top_customers'][0]['revenue'], 300.0)

    def test_delivery_metrics(self):
        now = timezone.now()
        late = make_shipment(self.company)
        on_time = make_shipment(self.company)
        Shipment.objects.filter(pk=late.pk).update(status='DELIVERED', shipping_date=now - timedelta(days=3),
                                                    estimated_delivery=now - timedelta(days=2), actual_delivery=now - timedelta(days=1))
        Shipment.objects.filter(pk=on_time.pk).update(status='DELIVERED', shipping_date=now - timedelta(days=2),
                                                       estimated_delivery=now, actual_delivery=now - timedelta(days=1))
        d = self.client.get(URL).json()['distribution']
        self.assertEqual(d['deliveries']['value'], 2)
        self.assertEqual(d['on_time_rate']['value'], 50.0)
        self.assertEqual(d['avg_delivery_days']['value'], 1.5)

    def test_production_inventory_and_warehousing_from_real_flows(self):
        r = self.client.post('/api/v1/production/orders/', {
            'product_id': str(self.bread.id), 'quantity': 12, 'output_warehouse_id': str(self.depot.id),
            'production_materials': [{'product_id': str(self.flour.id), 'warehouse_id': str(self.store.id), 'quantity': 30}],
        }, format='json')
        oid = r.json()['id']
        self.client.post(f'/api/v1/production/orders/{oid}/start_production/')
        self.client.post(f'/api/v1/production/orders/{oid}/complete_production/')
        t = self.client.post('/api/v1/warehousing/transfers/', {
            'source_warehouse_id': str(self.store.id), 'destination_warehouse_id': str(self.depot.id),
            'transfer_items': [{'product_id': str(self.flour.id), 'quantity': 20}],
        }, format='json').json()['id']
        self.client.post(f'/api/v1/warehousing/transfers/{t}/approve_transfer/')
        self.client.post(f'/api/v1/warehousing/transfers/{t}/complete_transfer/')

        data = self.client.get(URL).json()
        p, inv, wh = data['production'], data['inventory'], data['warehousing']
        self.assertEqual((p['runs_completed']['value'], p['units_produced']['value']), (1, 12))
        self.assertEqual(p['top_products'][0]['units'], 12)
        self.assertEqual(p['materials_used'][0]['units'], 30)
        self.assertEqual(inv['stock_units'], 100 - 30 + 12)
        self.assertEqual((inv['units_in'], inv['units_out']), (12 + 20, 30 + 20))
        self.assertEqual(inv['movements_by_type'], {'PRODUCTION': 1, 'RECEIPT': 1, 'TRANSFER': 2})
        self.assertEqual((wh['transfers_completed']['value'], wh['units_moved']['value']), (1, 20))
        self.assertEqual(wh['routes'][0]['units'], 20)
        self.assertEqual(sum(data['series']['units_produced']), 12)
        self.assertEqual(sum(w['units'] for w in inv['by_warehouse']), inv['stock_units'])

    def test_unknown_period_falls_back_to_30_days(self):
        self.assertEqual(self.client.get(URL, {'days': 1000}).json()['period']['days'], 30)
        self.assertEqual(self.client.get(URL, {'days': 'abc'}).json()['period']['days'], 30)
