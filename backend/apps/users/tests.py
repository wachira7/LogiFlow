from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.distribution.models import CustomerOrder
from apps.inventory.models import InventoryItem
from utils.testing import (
    AuthenticatedAPITestCase, make_company, make_order, make_product, make_shipment, make_user, make_warehouse,
    strong_password,
)

NEW_PASSWORD = strong_password()
OTHER_PASSWORD = strong_password()

DASHBOARD = '/api/v1/auth/dashboard/overview/'


class LoginTests(APITestCase):
    def setUp(self):
        self.user = make_user(company=make_company(), email='dispatcher@example.com')

    def test_login_returns_tokens(self):
        r = self.client.post('/api/v1/auth/login/', {'email': 'dispatcher@example.com', 'password': 'testpass123'})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertIn('access', r.json()['tokens'])
        self.assertEqual(r.json()['user']['email'], 'dispatcher@example.com')

    def test_login_rejects_wrong_password(self):
        r = self.client.post('/api/v1/auth/login/', {'email': 'dispatcher@example.com', 'password': 'wrong'})
        self.assertEqual(r.status_code, 400)


class DashboardOverviewTests(AuthenticatedAPITestCase):
    def get(self):
        r = self.client.get(DASHBOARD)
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def test_response_shape_matches_frontend_contract(self):
        data = self.get()
        for key in ('company', 'user', 'stats', 'recent_activity', 'quick_actions',
                    'setup_progress', 'performance_metrics', 'alerts', 'generated_at'):
            self.assertIn(key, data)
        for metric in data['performance_metrics']:
            self.assertEqual(set(metric), {'title', 'value', 'change', 'trend', 'description'})
            self.assertIn(metric['trend'], ('up', 'down'))
        for alert in data['alerts']:
            self.assertEqual(set(alert), {'id', 'type', 'title', 'message', 'timestamp', 'action'})
            self.assertIn(alert['type'], ('critical', 'warning', 'info', 'success'))

    def test_empty_company_has_no_fake_numbers(self):
        data = self.get()
        self.assertEqual(data['stats']['total_products'], 0)
        self.assertEqual(data['stats']['active_shipments'], 0)
        values = {m['title']: m['value'] for m in data['performance_metrics']}
        self.assertEqual(values['On-Time Delivery'], '—')
        self.assertEqual(values['Avg Delivery Time'], '—')
        # Only the setup reminder, nothing invented
        self.assertEqual([a['title'] for a in data['alerts']], ['Finish Setup'])

    def test_stats_count_real_records_for_own_company_only(self):
        make_product(self.company)
        make_product(self.company, is_active=False)
        make_order(self.company, status='NEW')
        make_order(self.company, status='PROCESSING')
        make_order(self.company, status='DELIVERED')
        make_shipment(self.company, status='SHIPPED')
        make_shipment(self.company, status='DELIVERED')
        other = make_company()
        make_product(other)
        make_order(other)
        make_shipment(other)

        stats = self.get()['stats']
        self.assertEqual(stats['total_products'], 1)
        self.assertEqual(stats['pending_orders'], 2)
        self.assertEqual(stats['active_shipments'], 1)

    def test_on_time_rate_and_average_delivery_time(self):
        now = timezone.now()
        warehouse = make_warehouse(self.company)
        # On time: 2 days in transit, delivered before ETA
        make_shipment(self.company, warehouse=warehouse, status='DELIVERED',
                      shipping_date=now - timedelta(days=3), actual_delivery=now - timedelta(days=1),
                      estimated_delivery=now - timedelta(hours=12))
        # Late: 4 days in transit, delivered after ETA
        make_shipment(self.company, warehouse=warehouse, status='DELIVERED',
                      shipping_date=now - timedelta(days=6), actual_delivery=now - timedelta(days=2),
                      estimated_delivery=now - timedelta(days=3))

        values = {m['title']: m['value'] for m in self.get()['performance_metrics']}
        self.assertEqual(values['On-Time Delivery'], '50.0%')
        self.assertEqual(values['Avg Delivery Time'], '3.0 days')

    def test_alerts_for_delays_low_stock_and_waiting_orders(self):
        now = timezone.now()
        make_shipment(self.company, status='SHIPPED', estimated_delivery=now - timedelta(days=2))
        product = make_product(self.company, reorder_point=10)
        InventoryItem.objects.create(product=product, warehouse=make_warehouse(self.company), quantity=3)
        order = make_order(self.company, status='NEW')
        CustomerOrder.objects.filter(id=order.id).update(created_at=now - timedelta(days=3))

        alerts = {a['title']: a for a in self.get()['alerts']}
        self.assertEqual(alerts['Delayed Shipments']['type'], 'critical')
        self.assertIn('1 shipment', alerts['Delayed Shipments']['message'])
        self.assertIn('1 stock line', alerts['Low Stock']['message'])
        self.assertIn('1 order', alerts['Orders Waiting']['message'])

    def test_setup_progress_reflects_real_data(self):
        make_user(company=self.company)
        make_warehouse(self.company)
        make_product(self.company)
        make_order(self.company)
        progress = self.get()['setup_progress']
        done = {s['title']: s['completed'] for s in progress['steps']}
        self.assertTrue(done['Add Team Members'])
        self.assertTrue(done['Set up Inventory'])
        self.assertTrue(done['Create First Order'])
        self.assertFalse(done['Configure Billing'])
        self.assertEqual(progress['completed_steps'], 4)

    def test_recent_activity_includes_orders(self):
        make_order(self.company, order_number='ORD-777', customer_name='Wanjiku')
        activity = self.get()['recent_activity']
        self.assertTrue(any(a['type'] == 'order_created' and 'ORD-777' in a['message'] for a in activity))
        self.assertEqual([a['id'] for a in activity], list(range(1, len(activity) + 1)))


@patch.dict('os.environ', {'EMAIL_PROVIDER': 'smtp'})
class PasswordResetTests(APITestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()  # throttle counters live in the cache
        self.user = make_user(company=make_company(), email='driver@example.com', first_name='Wanjiru')

    def request_link(self, email='driver@example.com'):
        from django.core import mail

        mail.outbox.clear()
        r = self.client.post('/api/v1/auth/forgot-password/', {'email': email})
        return r, mail.outbox

    def token_from(self, outbox):
        import re

        return re.search(r'reset-password\?token=([^\s"<]+)', outbox[0].body).group(1)

    def test_known_email_gets_a_link(self):
        r, outbox = self.request_link()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(outbox), 1)
        self.assertEqual(outbox[0].to, ['driver@example.com'])
        self.assertIn('/auth/reset-password?token=', outbox[0].body)

    def test_unknown_email_gets_the_same_answer_and_no_email(self):
        known, _ = self.request_link()
        unknown, outbox = self.request_link('nobody@example.com')
        self.assertEqual(unknown.status_code, 200)
        self.assertEqual(unknown.json()['message'], known.json()['message'])
        self.assertEqual(outbox, [])

    def test_reset_sets_new_password_and_signs_out_everywhere(self):
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(self.user)
        _, outbox = self.request_link()
        token = self.token_from(outbox)

        r = self.client.post('/api/v1/auth/reset-password/', {
            'token': token, 'password': NEW_PASSWORD, 'password_confirm': NEW_PASSWORD,
        })
        self.assertEqual(r.status_code, 200, r.content)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))
        self.assertTrue(BlacklistedToken.objects.filter(token__jti=refresh['jti']).exists())

        # The link is single-use: it stops working once the password changes
        again = self.client.post('/api/v1/auth/reset-password/', {
            'token': token, 'password': OTHER_PASSWORD, 'password_confirm': OTHER_PASSWORD,
        })
        self.assertEqual(again.status_code, 400)

    def test_rejects_bad_token_mismatch_and_weak_password(self):
        _, outbox = self.request_link()
        token = self.token_from(outbox)
        cases = [
            {'token': 'garbage', 'password': NEW_PASSWORD, 'password_confirm': NEW_PASSWORD},
            {'token': token, 'password': NEW_PASSWORD, 'password_confirm': OTHER_PASSWORD},
            {'token': token, 'password': '12345678', 'password_confirm': '12345678'},
        ]
        for data in cases:
            self.assertEqual(self.client.post('/api/v1/auth/reset-password/', data).status_code, 400, data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('testpass123'))

    def test_requests_are_rate_limited(self):
        codes = [self.client.post('/api/v1/auth/forgot-password/', {'email': 'x@example.com'}).status_code for _ in range(6)]
        self.assertEqual(codes[:5], [200] * 5)
        self.assertEqual(codes[5], 429)


class ErrorMessageTests(APITestCase):
    def test_validation_errors_carry_a_readable_message(self):
        r = self.client.post('/api/v1/auth/reset-password/', {'token': 'x', 'password': 'a', 'password_confirm': 'b'})
        body = r.json()
        self.assertEqual(r.status_code, 400)
        self.assertIn('invalid or has expired', body['message'])
        self.assertIn('token', body['details'])  # field errors still available


@patch.dict('os.environ', {'EMAIL_PROVIDER': 'smtp', 'CONTACT_EMAIL': 'team@logiflow.test'})
class ContactFormTests(APITestCase):
    def setUp(self):
        from django.core import mail
        from django.core.cache import cache

        cache.clear()
        mail.outbox.clear()

    payload = {'name': 'Achieng Odhiambo', 'email': 'achieng@shop.co.ke', 'company': 'Shop Ltd',
               'inquiryType': 'demo', 'message': 'We run 3 depots. <b>Can we get a demo?</b>'}

    def test_message_goes_to_team_inbox_and_confirmation_to_visitor(self):
        from django.core import mail

        r = self.client.post('/api/v1/contact/', self.payload)
        self.assertEqual(r.status_code, 200, r.content)
        team, confirmation = mail.outbox
        self.assertEqual(team.to, ['team@logiflow.test'])
        self.assertEqual(team.reply_to, ['achieng@shop.co.ke'])
        self.assertIn('&lt;b&gt;Can we get a demo?&lt;/b&gt;', team.alternatives[0][0])  # escaped
        self.assertEqual(confirmation.to, ['achieng@shop.co.ke'])
        self.assertNotIn('demo?', confirmation.body)  # visitor text isn't echoed to the address given

    def test_invalid_input_is_rejected(self):
        r = self.client.post('/api/v1/contact/', {**self.payload, 'email': 'not-an-email'})
        self.assertEqual(r.status_code, 400)
        self.assertIn('Email', r.json()['message'])

    def test_missing_contact_inbox_is_a_clear_error(self):
        with patch.dict('os.environ', {'CONTACT_EMAIL': ''}):
            r = self.client.post('/api/v1/contact/', self.payload)
        self.assertEqual(r.status_code, 503)

    def test_rate_limited(self):
        codes = [self.client.post('/api/v1/contact/', self.payload).status_code for _ in range(6)]
        self.assertEqual(codes, [200] * 5 + [429])

