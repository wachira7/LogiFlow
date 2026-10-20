from datetime import timedelta

from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.demo import services
from apps.distribution.models import DeliveryException, DeliveryRoute, LocationPing, Shipment
from apps.inventory.models import InventoryTransaction
from apps.tenants.models import Company
from apps.users.models import User
from utils.testing import AuthenticatedAPITestCase

START = '/api/v1/demo/start/'


class DemoTests(APITestCase):
    def setUp(self):
        cache.clear()  # throttle counters

    def start(self):
        r = self.client.post(START)
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def as_(self, data):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {data['tokens']['access']}")

    def test_start_gives_each_visitor_a_private_filled_company(self):
        first, second = self.start(), self.start()
        self.assertTrue(first['user']['company_is_demo'])
        self.assertIsNotNone(first['user']['demo_expires_at'])
        self.assertNotEqual(first['user']['company_id'], second['user']['company_id'])
        c = Company.objects.get(id=first['user']['company_id'])
        statuses = set(Shipment.objects.filter(company=c).values_list('status', flat=True))
        self.assertTrue({'PENDING', 'PICKED', 'PACKED', 'SHIPPED', 'DELIVERED'} <= statuses)
        self.assertTrue(DeliveryRoute.objects.filter(company=c, status='IN_PROGRESS').exists())
        self.assertTrue(DeliveryException.objects.filter(company=c, status='OPEN').exists())
        self.assertEqual(c.settings.currency, 'KES')
        owner = User.objects.get(id=first['user']['id'])
        self.assertFalse(owner.has_usable_password())
        self.assertTrue(owner.email.endswith('.invalid'))

        # signed in for real: the app works, and only shows this visitor's company
        self.as_(first)
        board = self.client.get('/api/v1/ops/board/').json()
        self.assertGreater(board['summary']['in_flight'], 0)
        mine = {s['id'] for s in self.client.get('/api/v1/distribution/shipments/?page_size=100').json()['results']}
        theirs = set(Shipment.objects.filter(company_id=second['user']['company_id']).values_list('id', flat=True))
        self.assertFalse(mine & {str(i) for i in theirs})

    def test_sandbox_rules(self):
        self.as_(self.start())
        blocked = [
            ('post', '/api/v1/payments/stripe/checkout/', {}),
            ('post', '/api/v1/tenants/invitations/', {'email': 'someone@example.com', 'role': 'driver'}),
            ('post', '/api/v1/auth/change-password/', {}),
            ('patch', '/api/v1/auth/profile/', {'first_name': 'X'}),
            ('patch', '/api/v1/tenants/company/', {'name': 'Mine now'}),
        ]
        for method, url, body in blocked:
            r = getattr(self.client, method)(url, body, format='json')
            self.assertEqual(r.status_code, 403, (url, r.content))
            body = r.json()
            self.assertIn('demo', str(body.get('message') or body.get('detail') or body.get('error')).lower())
        # the normal app still works: writes outside the blocked areas go through
        r = self.client.post('/api/v1/ops/exceptions/', {'exception_type': 'OTHER', 'title': 'Trying it out'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)

    def test_switch_between_owner_and_driver(self):
        self.as_(self.start())
        r = self.client.post('/api/v1/demo/switch/', {'role': 'driver'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        driver = r.json()
        self.assertTrue(driver['user']['is_driver'])
        self.as_(driver)
        day = self.client.get('/api/v1/ops/driver/today/').json()
        self.assertEqual(day['route']['status'], 'IN_PROGRESS')
        back = self.client.post('/api/v1/demo/switch/', {'role': 'owner'}, format='json').json()
        self.assertTrue(back['user']['is_company_owner'])

    def test_cleanup_deletes_only_expired_demos(self):
        old, fresh = self.start(), self.start()
        Company.objects.filter(id=old['user']['company_id']).update(demo_expires_at=timezone.now() - timedelta(minutes=1))
        self.assertEqual(services.cleanup_expired(), 1)
        self.assertFalse(Company.objects.filter(id=old['user']['company_id']).exists())
        self.assertFalse(User.objects.filter(id=old['user']['id']).exists())
        self.assertFalse(InventoryTransaction.objects.filter(inventory_item__warehouse__company_id=old['user']['company_id']).exists())
        self.assertTrue(Company.objects.filter(id=fresh['user']['company_id']).exists())

    def test_simulator_moves_the_van_and_respects_the_cap(self):
        data = self.start()
        before = LocationPing.objects.filter(company_id=data['user']['company_id']).count()
        self.assertEqual(services.simulate_fleets(), 1)
        self.assertEqual(LocationPing.objects.filter(company_id=data['user']['company_id']).count(), before + 1)
        with override_settings(DEMO_MAX_ACTIVE=1):
            r = self.client.post(START)
            self.assertEqual(r.status_code, 503)


class RealCompanyTests(AuthenticatedAPITestCase):
    def test_real_companies_are_unaffected(self):
        # the sandbox rules never apply outside demos, and real users can't switch persona
        r = self.client.patch('/api/v1/auth/profile/', {'first_name': 'Real'}, format='json')
        self.assertNotEqual(r.status_code, 403, r.content)
        self.assertEqual(self.client.post('/api/v1/demo/switch/', {'role': 'driver'}, format='json').status_code, 403)
        with self.assertRaises(ValueError):
            services.delete_demo_company(self.company)
        self.company.demo_expires_at = timezone.now() - timedelta(days=1)  # not a demo, so never cleaned up
        self.company.save()
        self.assertEqual(services.cleanup_expired(), 0)
        self.assertTrue(Company.objects.filter(id=self.company.id).exists())
