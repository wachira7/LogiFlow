from apps.inventory.models import InventoryItem
from apps.production.models import ProductionOrder, ProductionStep
from utils.testing import AuthenticatedAPITestCase, make_company, make_product, make_user, make_warehouse

BASE = '/api/v1/production'


class ProductionTests(AuthenticatedAPITestCase):
    def make_order(self, company):
        return ProductionOrder.objects.create(
            company=company, order_number='PO-1', product=make_product(company), quantity=10,
        )

    def test_step_detail_for_own_company(self):
        step = ProductionStep.objects.create(production_order=self.make_order(self.company), name='Mixing')
        self.assertEqual(self.client.get(f'{BASE}/steps/{step.id}/').status_code, 200)

    def test_other_company_order_and_step_are_404(self):
        order = self.make_order(make_company())
        step = ProductionStep.objects.create(production_order=order, name='Mixing')
        self.assertEqual(self.client.get(f'{BASE}/orders/{order.id}/').status_code, 404)
        self.assertEqual(self.client.get(f'{BASE}/steps/{step.id}/').status_code, 404)


class ProductionFlowTests(AuthenticatedAPITestCase):
    """Materials leave stock once (on start), finished goods arrive once (on complete)."""

    def setUp(self):
        super().setUp()
        self.store = make_warehouse(self.company)
        self.finished = make_warehouse(self.company)
        self.bread = make_product(self.company)
        self.flour = make_product(self.company)
        self.yeast = make_product(self.company)
        InventoryItem.objects.create(product=self.flour, warehouse=self.store, quantity=100)
        InventoryItem.objects.create(product=self.yeast, warehouse=self.store, quantity=10)

    def qty(self, product, warehouse):
        line = InventoryItem.objects.filter(product=product, warehouse=warehouse).first()
        return line.quantity if line else 0

    def create(self, flour=40, yeast=2, steps=('Mix', 'Bake'), **extra):
        body = {
            'product_id': str(self.bread.id), 'quantity': 50, 'output_warehouse_id': str(self.finished.id),
            'production_steps': [{'name': s, 'duration_hours': '2'} for s in steps],
            'production_materials': [
                {'product_id': str(self.flour.id), 'warehouse_id': str(self.store.id), 'quantity': flour},
                {'product_id': str(self.yeast.id), 'warehouse_id': str(self.store.id), 'quantity': yeast},
            ],
            **extra,
        }
        return self.client.post(f'{BASE}/orders/', body, format='json')

    def act(self, oid, name):
        return self.client.post(f'{BASE}/orders/{oid}/{name}_production/')

    def step_act(self, sid, name):
        return self.client.post(f'{BASE}/steps/{sid}/{name}_step/')

    def steps(self, oid):
        return list(ProductionStep.objects.filter(production_order_id=oid).order_by('created_at'))

    def test_create_generates_number_and_ignores_status(self):
        r = self.create(status='COMPLETED')
        self.assertEqual(r.status_code, 201, r.content)
        order = ProductionOrder.objects.get(id=r.json()['id'])
        self.assertEqual(order.status, 'PLANNED')
        self.assertTrue(order.order_number.startswith('PO-'))
        self.assertEqual(order.created_by, self.user)
        self.assertEqual(r.json()['steps_total'], 2)

    def test_full_flow_moves_stock_exactly_once(self):
        oid = self.create().json()['id']
        self.assertEqual(self.act(oid, 'start').status_code, 200)
        self.assertEqual((self.qty(self.flour, self.store), self.qty(self.yeast, self.store)), (60, 8))
        self.assertEqual(self.act(oid, 'start').status_code, 400)
        mix, bake = self.steps(oid)
        self.assertEqual((mix.status, bake.status), ('IN_PROGRESS', 'PENDING'))
        # can't finish with steps open
        self.assertEqual(self.act(oid, 'complete').status_code, 400)
        r = self.step_act(mix.id, 'complete')
        self.assertEqual(r.json()['next_step_started'], 'Bake')
        self.step_act(bake.id, 'complete')
        r = self.act(oid, 'complete')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.qty(self.bread, self.finished), 50)
        self.assertEqual(self.act(oid, 'complete').status_code, 400)
        self.assertEqual(self.qty(self.bread, self.finished), 50)
        self.assertEqual(r.json()['order']['progress_percentage'], 100)
        # ledger matches every stock line
        for line in InventoryItem.objects.all():
            self.assertEqual(sum(line.transactions.values_list('quantity', flat=True)), line.quantity - (100 if line.product == self.flour else 10 if line.product == self.yeast else 0))

    def test_start_checks_materials(self):
        oid = self.create(flour=500).json()['id']
        r = self.act(oid, 'start')
        self.assertEqual(r.status_code, 400)
        self.assertIn('insufficient_materials', r.json())
        self.assertEqual(self.qty(self.flour, self.store), 100)
        self.assertEqual(ProductionOrder.objects.get(id=oid).status, 'PLANNED')

    def test_cancel_in_progress_returns_materials(self):
        oid = self.create().json()['id']
        self.act(oid, 'start')
        self.assertEqual(self.act(oid, 'cancel').status_code, 200)
        self.assertEqual((self.qty(self.flour, self.store), self.qty(self.yeast, self.store)), (100, 10))
        self.assertEqual(self.act(oid, 'cancel').status_code, 400)
        self.assertEqual(self.qty(self.flour, self.store), 100)

    def test_skipped_steps_count_as_done(self):
        oid = self.create().json()['id']
        self.act(oid, 'start')
        mix, bake = self.steps(oid)
        self.step_act(mix.id, 'skip')
        self.assertEqual(self.steps(oid)[1].status, 'IN_PROGRESS')
        self.step_act(bake.id, 'complete')
        self.assertEqual(self.act(oid, 'complete').status_code, 200)

    def test_steps_need_order_in_progress(self):
        oid = self.create().json()['id']
        self.assertEqual(self.step_act(self.steps(oid)[0].id, 'start').status_code, 400)

    def test_complete_needs_output_warehouse(self):
        oid = self.create(output_warehouse_id=None, steps=()).json()['id']
        self.act(oid, 'start')
        self.assertEqual(self.act(oid, 'complete').status_code, 400)
        self.client.patch(f'{BASE}/orders/{oid}/', {'output_warehouse_id': str(self.finished.id)}, format='json')
        self.assertEqual(self.act(oid, 'complete').status_code, 200)

    def test_status_and_locked_fields_cannot_be_patched(self):
        oid = self.create().json()['id']
        r = self.client.patch(f'{BASE}/orders/{oid}/', {'status': 'COMPLETED', 'quantity': 60}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['status'], 'PLANNED')
        self.assertEqual(r.json()['quantity'], 60)
        self.act(oid, 'start')
        r = self.client.patch(f'{BASE}/orders/{oid}/', {'quantity': 70}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.patch(f'{BASE}/orders/{oid}/', {'notes': 'Night shift'}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_delete_only_planned_or_cancelled(self):
        oid = self.create().json()['id']
        self.act(oid, 'start')
        self.assertEqual(self.client.delete(f'{BASE}/orders/{oid}/').status_code, 400)
        self.act(oid, 'cancel')
        self.assertEqual(self.client.delete(f'{BASE}/orders/{oid}/').status_code, 204)

    def test_add_steps_and_materials_to_existing_order(self):
        oid = self.create(steps=()).json()['id']
        teammate = make_user(self.company)
        r = self.client.post(f'{BASE}/steps/', {'production_order_id': oid, 'name': 'Cool', 'assigned_to_id': str(teammate.id)}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['assigned_to_id'], str(teammate.id))
        salt = make_product(self.company)
        r = self.client.post(f'{BASE}/materials/', {'production_order_id': oid, 'product_id': str(salt.id),
                                                    'warehouse_id': str(self.store.id), 'quantity': 1}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        # duplicate material and outsider assignee rejected
        dup = self.client.post(f'{BASE}/materials/', {'production_order_id': oid, 'product_id': str(salt.id),
                                                      'warehouse_id': str(self.store.id), 'quantity': 2}, format='json')
        self.assertEqual(dup.status_code, 400)
        outsider = make_user(make_company())
        r = self.client.post(f'{BASE}/steps/', {'production_order_id': oid, 'name': 'X', 'assigned_to_id': str(outsider.id)}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_materials_locked_once_started(self):
        oid = self.create().json()['id']
        self.act(oid, 'start')
        material = self.client.get(f'{BASE}/orders/{oid}/').json()['production_materials'][0]
        r = self.client.patch(f'{BASE}/materials/{material["id"]}/', {'quantity': 1}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.client.delete(f'{BASE}/materials/{material["id"]}/').status_code, 400)

    def test_validation(self):
        self.assertEqual(self.create(flour=0).status_code, 400)
        r = self.client.post(f'{BASE}/orders/', {'product_id': str(self.bread.id), 'quantity': 1, 'production_materials': [
            {'product_id': str(self.bread.id), 'warehouse_id': str(self.store.id), 'quantity': 1}]}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.post(f'{BASE}/orders/', {'product_id': str(self.bread.id), 'quantity': 1,
                                                 'start_date': '2026-10-10T00:00:00Z', 'end_date': '2026-10-01T00:00:00Z'}, format='json')
        self.assertEqual(r.status_code, 400)
        other = make_product(make_company())
        r = self.client.post(f'{BASE}/orders/', {'product_id': str(other.id), 'quantity': 1}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_requirements_and_dashboard(self):
        planned = self.create(flour=150).json()['id']
        started = self.create().json()['id']
        self.act(started, 'start')
        req = self.client.get(f'{BASE}/orders/material_requirements/').json()
        flour = next(r for r in req['material_requirements'] if r['product_id'] == str(self.flour.id))
        # only the planned order still needs materials; the started one already took its share
        self.assertEqual((flour['required_quantity'], flour['available_stock'], flour['shortage']), (150, 60, 90))
        short = self.client.get(f'{BASE}/materials/insufficient_stock/').json()
        self.assertEqual(short['total_count'], 1)
        self.assertEqual(short['materials_with_insufficient_stock'][0]['production_order_id'], planned)
        dash = self.client.get(f'{BASE}/orders/dashboard/').json()
        self.assertEqual((dash['planned_orders'], dash['in_progress_orders'], dash['steps_in_progress']), (1, 1, 1))

    def test_list_query_count_does_not_grow_per_order(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        def count():
            with CaptureQueriesContext(connection) as ctx:
                self.assertEqual(self.client.get(f'{BASE}/orders/').status_code, 200)
            return len(ctx.captured_queries)

        self.create()
        one = count()
        for _ in range(4):
            self.create()
        self.assertEqual(count(), one)
