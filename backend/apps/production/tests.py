from apps.production.models import ProductionOrder, ProductionStep
from utils.testing import AuthenticatedAPITestCase, make_company, make_product

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
