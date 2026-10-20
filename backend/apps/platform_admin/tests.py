from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.payments.models import PaymentTransaction, SubscriptionPlan, UserSubscription
from apps.platform_admin.models import PlatformAuditLog, PlatformNotification
from apps.tenants.models import Company
from apps.users.models import User
from utils.testing import make_company, make_product, make_user, make_warehouse, strong_password

BASE = '/api/v1/platform-admin'
PASSWORD = strong_password()


class PlatformAdminTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email='admin@logiflow.app', username='admin', password=PASSWORD, is_platform_admin=True)
        self.company = make_company(name='Duka Ltd')
        self.owner = make_user(self.company, is_company_owner=True, password=PASSWORD)
        self.plan = SubscriptionPlan.objects.create(name='Starter', price=Decimal('30'), billing_cycle='MONTHLY')
        self.client.force_authenticate(self.admin)

    def manage(self, action, **extra):
        return self.client.post(f'{BASE}/analytics/manage_company/', {
            'company_id': str(self.company.id), 'action': action, 'reason': 'Support ticket 42', **extra}, format='json')

    def test_only_platform_admins(self):
        self.client.force_authenticate(self.owner)
        for url in ('analytics/overview/', 'analytics/company_overview/', 'system-health/dashboard/', 'audit-logs/'):
            self.assertEqual(self.client.get(f'{BASE}/{url}').status_code, 403, url)

    def test_suspend_signs_users_out_and_blocks_sign_in_then_activate(self):
        r = self.manage('SUSPEND')
        self.assertEqual(r.status_code, 200, r.content)
        self.company.refresh_from_db()
        self.assertFalse(self.company.is_active)
        self.client.force_authenticate(None)
        r = self.client.post('/api/v1/auth/login/', {'email': self.owner.email, 'password': PASSWORD}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('suspended', r.json()['message'])
        self.client.force_authenticate(self.owner)
        r = self.client.get('/api/v1/inventory/products/')
        self.assertEqual(r.status_code, 403)
        self.assertIn('suspended', r.json()['message'])
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.manage('SUSPEND').status_code, 400)  # already suspended
        self.assertEqual(self.manage('ACTIVATE').status_code, 200)
        actions = list(PlatformAuditLog.objects.filter(target_company=self.company).values_list('action', flat=True))
        self.assertEqual(sorted(actions), ['COMPANY_ACTIVATED', 'COMPANY_SUSPENDED'])

    def test_extend_trial(self):
        now = timezone.now()
        sub = UserSubscription.objects.create(company=self.company, user=self.owner, plan=self.plan, status='TRIALING',
                                              payment_provider='MPESA', start_date=now, end_date=now + timedelta(days=2),
                                              trial_end=now + timedelta(days=2), is_trial=True)
        r = self.manage('EXTEND_TRIAL', days=10)
        self.assertEqual(r.status_code, 200, r.content)
        sub.refresh_from_db()
        self.assertAlmostEqual((sub.end_date - now).days, 12, delta=1)
        self.assertEqual(sub.trial_end, sub.end_date)
        self.assertTrue(PlatformAuditLog.objects.filter(action='TRIAL_EXTENDED').exists())
        sub.status, sub.is_trial = 'ACTIVE', False
        sub.save()
        self.assertEqual(self.manage('EXTEND_TRIAL').status_code, 400)  # paid plan: no trial to extend

    def test_delete_needs_the_name_and_keeps_history(self):
        self.assertEqual(self.manage('DELETE').status_code, 400)
        self.assertEqual(self.manage('DELETE', confirm_name='duka ltd').status_code, 400)
        # stock history is protected: suggest suspending instead
        from apps.inventory.models import InventoryItem, InventoryTransaction
        line = InventoryItem.objects.create(product=make_product(self.company), warehouse=make_warehouse(self.company), quantity=5)
        InventoryTransaction.objects.create(inventory_item=line, transaction_type='RECEIPT', quantity=5)
        r = self.manage('DELETE', confirm_name='Duka Ltd')
        self.assertEqual(r.status_code, 400)
        self.assertIn('Suspend it instead', r.json()['message'])
        self.assertTrue(Company.objects.filter(id=self.company.id).exists())
        self.assertFalse(PlatformAuditLog.objects.filter(action='COMPANY_DELETED').exists())  # rolled back
        empty = make_company(name='Empty Co')
        r = self.client.post(f'{BASE}/analytics/manage_company/', {'company_id': str(empty.id), 'action': 'DELETE',
                                                                   'reason': 'Duplicate signup', 'confirm_name': 'Empty Co'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(Company.objects.filter(id=empty.id).exists())
        self.assertTrue(PlatformAuditLog.objects.filter(action='COMPANY_DELETED').exists())

    @patch('apps.platform_admin.health._workers', return_value=('ok', '1 worker online'))
    def test_health_is_measured_not_invented(self, _workers):
        data = self.client.get(f'{BASE}/system-health/dashboard/').json()
        self.assertEqual({c['key'] for c in data['checks']}, {'database', 'cache', 'workers', 'disk'})
        self.assertNotIn('cpu_usage', data)
        self.assertTrue(all('mode' in p and 'configured' in p for p in data['providers']))
        dumped = str(data)
        self.assertNotIn('sk_', dumped)  # never leak keys
        self.assertIn(self.client.post(f'{BASE}/system-health/generate_test_metrics/').status_code, (404, 405))

    def test_overview_keeps_currencies_apart_and_computes_mrr(self):
        now = timezone.now()
        UserSubscription.objects.create(company=self.company, user=self.owner, plan=self.plan, status='ACTIVE',
                                        payment_provider='MPESA', start_date=now, end_date=now + timedelta(days=30))
        for amount, cur in (('30', 'USD'), ('3900', 'KES')):
            PaymentTransaction.objects.create(company=self.company, user=self.owner, amount=Decimal(amount), currency=cur,
                                              status='COMPLETED', payment_type='SUBSCRIPTION', provider='MPESA')
        data = self.client.get(f'{BASE}/analytics/overview/').json()
        self.assertEqual(data['revenue_total'], {'USD': 30.0, 'KES': 3900.0})
        self.assertEqual((data['mrr_usd'], data['paying_subscriptions']), (30.0, 1))
        self.assertEqual(len(data['monthly']), 12)
        self.assertEqual(data['total_users'], 1)  # platform admins not counted

    def test_company_list_and_detail(self):
        other = make_company(name='Zebra Freight')
        make_user(other)
        rows = self.client.get(f'{BASE}/analytics/company_overview/', {'search': 'zebra'}).json()['companies']
        self.assertEqual([r['company_name'] for r in rows], ['Zebra Freight'])
        self.assertEqual(rows[0]['user_count'], 1)
        detail = self.client.get(f'{BASE}/analytics/company_detail/', {'company_id': str(self.company.id)}).json()
        self.assertEqual((detail['name'], len(detail['users'])), ('Duka Ltd', 1))
        self.assertIn('products', detail['usage'])

    def test_notifications_respect_schedule_and_expiry(self):
        now = timezone.now()
        PlatformNotification.objects.create(title='Live', message='m', is_global=True, created_by=self.admin)
        PlatformNotification.objects.create(title='Later', message='m', is_global=True, created_by=self.admin, scheduled_for=now + timedelta(days=1))
        PlatformNotification.objects.create(title='Old', message='m', is_global=True, created_by=self.admin, expires_at=now - timedelta(days=1))
        self.client.force_authenticate(self.owner)
        r = self.client.get('/api/v1/auth/notifications/').json()
        titles = [n['title'] for n in (r if isinstance(r, list) else r.get('notifications', r.get('results', [])))]
        self.assertEqual(titles, ['Live'])

    def test_settings_changes_are_audited(self):
        r = self.client.post(f'{BASE}/settings/', {'setting_key': 'maintenance_banner', 'setting_value': 'off',
                                                   'description': 'Banner'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(PlatformAuditLog.objects.filter(action='SETTINGS_CHANGED').exists())

    def test_notification_targets(self):
        r = self.client.post(f'{BASE}/notifications/', {'title': 'Hi', 'message': 'Hello', 'is_global': False}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.post(f'{BASE}/notifications/', {'title': 'Hi', 'message': 'Hello', 'is_global': False,
                                                        'target_company_ids': [str(self.company.id)]}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['target_company_names'], ['Duka Ltd'])
        self.client.force_authenticate(self.owner)
        self.assertIn('Hi', [n['title'] for n in self.client.get('/api/v1/auth/notifications/').json()])
