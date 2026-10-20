import hashlib
import hmac
import json
from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import override_settings
from django.utils import timezone

from apps.payments import billing
from apps.payments.models import PaymentMethod, PaymentTransaction, SubscriptionPlan, UserSubscription
from apps.payments.tasks import bill_due_subscriptions
from apps.payments.webhooks import StripeWebhookView
from utils.testing import AuthenticatedAPITestCase, make_user

BASE = '/api/v1/payments'
TOKEN = 'cb-token-for-tests'


def stk_ok(checkout_id='ws_CO_1'):
    resp = MagicMock()
    resp.json.return_value = {'CheckoutRequestID': checkout_id, 'MerchantRequestID': 'm1', 'ResponseCode': '0',
                              'CustomerMessage': 'Success'}
    resp.raise_for_status.return_value = None
    return resp


def callback(checkout_id, amount, code=0):
    items = [{'Name': 'Amount', 'Value': amount}, {'Name': 'MpesaReceiptNumber', 'Value': 'QWE123'},
             {'Name': 'PhoneNumber', 'Value': 254712345678}]
    return {'Body': {'stkCallback': {'ResultCode': code, 'ResultDesc': 'ok', 'CheckoutRequestID': checkout_id,
                                     'CallbackMetadata': {'Item': items}}}}


@override_settings(MPESA_CALLBACK_TOKEN=TOKEN)
class BillingTests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.user.is_company_owner = True
        self.user.save()
        self.plan = SubscriptionPlan.objects.create(name='Growth', price=Decimal('20.00'), billing_cycle='MONTHLY')
        self.annual = SubscriptionPlan.objects.create(name='Growth', price=Decimal('200.00'), billing_cycle='ANNUAL')
        self.kes = patch('apps.payments.billing.provider_amount', side_effect=lambda plan, provider:
                         (float(plan.price) * 130, 'KES') if provider == 'MPESA' else (float(plan.price), 'USD'))
        self.kes.start()
        self.addCleanup(self.kes.stop)

    def subscribe(self, provider='MPESA', **extra):
        return self.client.post(f'{BASE}/subscriptions/', {'plan_id': str(self.plan.id), 'payment_provider': provider, **extra}, format='json')

    # --- access ---------------------------------------------------------------
    def test_members_cannot_see_or_change_billing(self):
        member = make_user(self.company)
        self.client.force_authenticate(member)
        for url in ('subscriptions/', 'payment-methods/', 'transactions/', 'subscriptions/overview/'):
            self.assertEqual(self.client.get(f'{BASE}/{url}').status_code, 403, url)
        self.assertEqual(self.client.get(f'{BASE}/plans/').status_code, 200)

    # --- lifecycle --------------------------------------------------------------
    def test_trial_once_no_fake_payment_and_no_direct_edits(self):
        r = self.subscribe()
        self.assertEqual(r.status_code, 201, r.content)
        sub = UserSubscription.objects.get(id=r.json()['id'])
        self.assertEqual((sub.status, sub.is_trial), ('TRIALING', True))
        self.assertEqual(PaymentTransaction.objects.count(), 0)
        self.assertEqual(self.subscribe().status_code, 400)  # already subscribed
        for method in ('put', 'patch', 'delete'):
            self.assertEqual(getattr(self.client, method)(f'{BASE}/subscriptions/{sub.id}/', {'status': 'ACTIVE'}, format='json').status_code, 405)
        self.assertEqual(self.subscribe('STRIPE').status_code, 400)  # cards go through checkout

    def test_cancel_keeps_access_until_period_end_then_ends(self):
        sub = UserSubscription.objects.get(id=self.subscribe().json()['id'])
        r = self.client.post(f'{BASE}/subscriptions/{sub.id}/cancel_subscription/')
        self.assertEqual(r.status_code, 200, r.content)
        sub.refresh_from_db()
        self.assertEqual((sub.status, sub.auto_renew), ('TRIALING', False))
        self.assertTrue(r.json()['subscription']['cancels_at_period_end'])
        self.assertEqual(self.client.post(f'{BASE}/subscriptions/{sub.id}/reactivate_subscription/').status_code, 200)
        sub.refresh_from_db()
        self.assertTrue(sub.auto_renew)
        self.client.post(f'{BASE}/subscriptions/{sub.id}/cancel_subscription/')
        self.assertEqual(billing.end_finished_subscriptions(timezone.now() + timedelta(days=15)), 1)
        sub.refresh_from_db()
        self.assertEqual(sub.status, 'CANCELLED')
        # trial used: subscribing again starts unpaid instead of a second free trial
        again = UserSubscription.objects.get(id=self.subscribe().json()['id'])
        self.assertEqual((again.status, again.is_trial), ('PAST_DUE', False))

    def test_cancelling_a_stripe_subscription_tells_stripe(self):
        sub = UserSubscription.objects.create(company=self.company, user=self.user, plan=self.plan, status='ACTIVE',
                                              payment_provider='STRIPE', provider_subscription_id='sub_123',
                                              start_date=timezone.now(), end_date=timezone.now() + timedelta(days=20))
        stripe = MagicMock()
        with patch('apps.payments.billing._stripe', return_value=stripe):
            self.assertEqual(self.client.post(f'{BASE}/subscriptions/{sub.id}/cancel_subscription/').status_code, 200)
        stripe.Subscription.modify.assert_called_once_with('sub_123', cancel_at_period_end=True)
        # Stripe unreachable: nothing changes locally
        sub.auto_renew = True
        sub.save()
        stripe.Subscription.modify.side_effect = Exception('down')
        with patch('apps.payments.billing._stripe', return_value=stripe):
            self.assertEqual(self.client.post(f'{BASE}/subscriptions/{sub.id}/cancel_subscription/').status_code, 502)
        sub.refresh_from_db()
        self.assertTrue(sub.auto_renew)

    # --- M-Pesa -------------------------------------------------------------------
    @patch('apps.payments.providers.mpesa.MPesaService.get_access_token', return_value='tok')
    @patch('apps.payments.providers.mpesa.requests.post', return_value=stk_ok())
    def test_mpesa_payment_activates_once_and_rejects_forgeries(self, post, _token):
        sub = UserSubscription.objects.get(id=self.subscribe(pay_now=True).json()['id'])
        self.assertEqual(sub.status, 'PAST_DUE')
        r = self.client.post(f'{BASE}/mpesa/pay/', {'phone_number': '0712 345 678', 'amount': 1}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['amount'], 2600)  # from the plan, not the request
        self.assertIn(f'token={TOKEN}', post.call_args.kwargs['json']['CallBackURL'])
        tx = PaymentTransaction.objects.get(provider_transaction_id='ws_CO_1')
        self.assertEqual((tx.status, tx.subscription_id, tx.amount), ('PENDING', sub.id, Decimal('2600')))

        url = f'{BASE}/callbacks/mpesa/'
        self.assertEqual(self.client.post(url, callback('ws_CO_1', 2600), content_type='application/json').status_code, 403)
        self.client.post(f'{url}?token={TOKEN}', callback('ws_CO_1', 10), content_type='application/json')
        tx.refresh_from_db()
        sub.refresh_from_db()
        self.assertEqual((tx.status, sub.status), ('FAILED', 'PAST_DUE'))

        post.return_value = stk_ok('ws_CO_2')
        self.client.post(f'{BASE}/mpesa/pay/', {'phone_number': '254712345678'}, format='json')
        for _ in range(2):  # Safaricom may send it twice
            self.client.post(f'{url}?token={TOKEN}', callback('ws_CO_2', 2600), content_type='application/json')
        sub.refresh_from_db()
        self.assertEqual(sub.status, 'ACTIVE')
        self.assertAlmostEqual((sub.end_date - timezone.now()).days, 29, delta=1)
        self.assertEqual(PaymentTransaction.objects.filter(provider_transaction_id='ws_CO_2', status='COMPLETED').count(), 1)
        self.assertEqual(self.client.get(f'{BASE}/subscriptions/overview/').json()['spent_total'], {'KES': 2600.0})

    @patch('apps.payments.tasks.MPesaService')
    def test_billing_run_charges_due_mpesa_but_never_stripe(self, mpesa):
        due = UserSubscription.objects.get(id=self.subscribe().json()['id'])
        UserSubscription.objects.filter(pk=due.pk).update(end_date=timezone.now() - timedelta(minutes=1))
        PaymentMethod.objects.create(company=self.company, user=self.user, type='MPESA', provider='MPESA',
                                     phone_number='254712345678', is_default=True)
        stripe_sub = UserSubscription.objects.create(company=self.company, user=self.user, plan=self.annual, status='ACTIVE',
                                                     payment_provider='STRIPE', start_date=timezone.now(),
                                                     end_date=timezone.now() - timedelta(minutes=1))
        with patch('apps.payments.tasks.send_mpesa_payment_initiated_notification'):
            result = bill_due_subscriptions()
        self.assertEqual(result, {'total': 1, 'requested': 1, 'no_payment_method': 0})
        kwargs = mpesa.return_value.initiate_stk_push.call_args.kwargs
        self.assertEqual((kwargs['phone_number'], kwargs['amount'], kwargs['subscription'].id), ('254712345678', 2600.0, due.id))
        due.refresh_from_db()
        stripe_sub.refresh_from_db()
        self.assertEqual((due.status, stripe_sub.status), ('PAST_DUE', 'ACTIVE'))

    # --- crypto -------------------------------------------------------------------
    @override_settings(NOWPAYMENTS_IPN_SECRET='ipn-secret', DEBUG=False)
    def test_crypto_ipn_requires_a_valid_signature(self):
        sub = UserSubscription.objects.get(id=self.subscribe('CRYPTO', pay_now=True).json()['id'])
        PaymentTransaction.objects.create(company=self.company, user=self.user, subscription=sub, amount=20, currency='USD',
                                          status='PENDING', payment_type='SUBSCRIPTION', provider='CRYPTO', provider_transaction_id='777')
        body = {'payment_id': 777, 'payment_status': 'finished', 'pay_currency': 'usdttrc20', 'price_amount': 20}
        raw = json.dumps(body)
        url = f'{BASE}/callbacks/crypto/'
        self.assertEqual(self.client.post(url, raw, content_type='application/json').status_code, 400)
        self.assertEqual(self.client.post(url, raw, content_type='application/json', HTTP_X_NOWPAYMENTS_SIG='bad').status_code, 400)
        sig = hmac.new(b'ipn-secret', json.dumps(body, sort_keys=True, separators=(',', ':')).encode(), hashlib.sha512).hexdigest()
        self.assertEqual(self.client.post(url, raw, content_type='application/json', HTTP_X_NOWPAYMENTS_SIG=sig).status_code, 200)
        sub.refresh_from_db()
        self.assertEqual(sub.status, 'ACTIVE')

    # --- Stripe -------------------------------------------------------------------
    def test_stripe_invoice_webhook_is_recorded_once(self):
        sub = UserSubscription.objects.create(company=self.company, user=self.user, plan=self.plan, status='ACTIVE',
                                              payment_provider='STRIPE', provider_subscription_id='sub_x',
                                              start_date=timezone.now(), end_date=timezone.now() + timedelta(days=30))
        event = {'type': 'invoice.payment_succeeded', 'data': {'object': {
            'id': 'in_1', 'subscription': 'sub_x', 'amount_paid': 2000, 'currency': 'usd', 'number': 'A-1'}}}
        for _ in range(3):
            StripeWebhookView().handle_webhook_event(event)
        self.assertEqual(PaymentTransaction.objects.filter(provider_transaction_id='in_1').count(), 1)
        zero = {'type': 'invoice.payment_succeeded', 'data': {'object': {'id': 'in_0', 'subscription': 'sub_x', 'amount_paid': 0, 'currency': 'usd'}}}
        StripeWebhookView().handle_webhook_event(zero)
        self.assertFalse(PaymentTransaction.objects.filter(provider_transaction_id='in_0').exists())
        self.assertEqual(sub.transactions.count(), 1)

    def test_checkout_offers_the_trial_only_once(self):
        stripe = MagicMock()
        stripe.checkout.Session.create.return_value = MagicMock(url='https://checkout', id='cs_1')
        stripe.Customer.create.return_value = MagicMock(id='cus_1')
        with patch('apps.payments.billing._stripe', return_value=stripe):
            r = self.client.post(f'{BASE}/stripe/checkout/', {'plan_id': str(self.plan.id)}, format='json')
            self.assertEqual(r.status_code, 200, r.content)
            self.assertTrue(r.json()['trial'])
            self.assertEqual(stripe.checkout.Session.create.call_args.kwargs['subscription_data']['trial_period_days'], 14)
            UserSubscription.objects.create(company=self.company, user=self.user, plan=self.plan, status='CANCELLED',
                                            start_date=timezone.now(), end_date=timezone.now())
            r = self.client.post(f'{BASE}/stripe/checkout/', {'plan_id': str(self.annual.id)}, format='json')
            self.assertFalse(r.json()['trial'])
            self.assertNotIn('trial_period_days', stripe.checkout.Session.create.call_args.kwargs['subscription_data'])

    def test_checkout_completion_replaces_the_old_plan_and_records_payment_once(self):
        old = UserSubscription.objects.get(id=self.subscribe().json()['id'])
        now = int(timezone.now().timestamp())
        session = {
            'mode': 'subscription', 'status': 'complete', 'payment_status': 'paid', 'customer': 'cus_9', 'invoice': 'in_9',
            'amount_total': 20000, 'currency': 'usd',
            'metadata': {'company_id': str(self.company.id), 'user_id': str(self.user.id), 'plan_id': str(self.annual.id)},
            'subscription': {'id': 'sub_9', 'status': 'active', 'current_period_start': now, 'current_period_end': now + 365 * 86400,
                             'trial_end': None, 'cancel_at_period_end': False},
        }
        for _ in range(2):
            StripeWebhookView().handle_webhook_event({'type': 'checkout.session.completed', 'data': {'object': session}})
        old.refresh_from_db()
        new = UserSubscription.objects.get(provider_subscription_id='sub_9')
        self.assertEqual((old.status, new.status, new.plan_id), ('CANCELLED', 'ACTIVE', self.annual.id))
        self.assertEqual(PaymentTransaction.objects.filter(provider_transaction_id='in_9').count(), 1)
        self.assertEqual(UserSubscription.objects.filter(company=self.company, status__in=billing.LIVE).count(), 1)

    # --- payment methods ------------------------------------------------------------
    def test_payment_methods(self):
        r = self.client.post(f'{BASE}/payment-methods/', {'type': 'CARD', 'last_four': '4242'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.post(f'{BASE}/payment-methods/', {'type': 'MPESA', 'phone_number': '+254 712-345-678'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual((r.json()['phone_number'], r.json()['is_default'], r.json()['provider']), ('254712345678', True, 'MPESA'))
        self.assertEqual(self.client.post(f'{BASE}/payment-methods/', {'type': 'MPESA', 'phone_number': '12345'}, format='json').status_code, 400)
        second = self.client.post(f'{BASE}/payment-methods/', {'type': 'CRYPTO', 'currency': 'USDT'}, format='json').json()
        self.assertFalse(second['is_default'])
        self.client.delete(f"{BASE}/payment-methods/{r.json()['id']}/")
        self.assertTrue(PaymentMethod.objects.get(id=second['id']).is_default)
