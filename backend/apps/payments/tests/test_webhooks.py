# apps/payments/tests/test_webhooks.py
import json
from decimal import Decimal
from django.test import TestCase, Client
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, Mock
from apps.users.models import User
from apps.tenants.models import Company
from apps.payments.models import SubscriptionPlan, UserSubscription, PaymentTransaction
from apps.payments.webhooks import StripeWebhookView


class StripeWebhookTestCase(TestCase):
    """Test cases for Stripe webhook handling."""
    
    def setUp(self):
        """Set up test data."""
        # Create test company and user
        self.company = Company.objects.create(
            name="Test Company",
            email="test@company.com"
        )
        
        self.user = User.objects.create_user(
            email="test@user.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
            company=self.company
        )
        
        # Create test subscription plan
        self.plan = SubscriptionPlan.objects.create(
            name="Test Plan",
            description="Test subscription plan",
            price=Decimal("29.99"),
            billing_cycle="MONTHLY",
            features={"max_users": 5},
            stripe_price_id="price_test123"
        )
        
        # Create test subscription
        self.subscription = UserSubscription.objects.create(
            company=self.company,
            user=self.user,
            plan=self.plan,
            status='TRIALING',
            payment_provider='STRIPE',
            provider_subscription_id='sub_test123',
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=30),
            is_trial=True
        )
        
        self.client = Client()
        self.webhook_view = StripeWebhookView()
    
    def create_test_event(self, event_type, event_data):
        """Helper to create test webhook events."""
        return {
            'id': 'evt_test123',
            'type': event_type,
            'data': {'object': event_data}
        }
    
    def test_subscription_created_webhook(self):
        """Test subscription created webhook handling."""
        event_data = {
            'id': 'sub_test123',
            'status': 'active',
            'current_period_end': int((timezone.now() + timedelta(days=30)).timestamp()),
            'trial_end': None
        }
        
        event = self.create_test_event('customer.subscription.created', event_data)
        
        # Process the webhook
        self.webhook_view.handle_webhook_event(event)
        
        # Verify subscription status was updated
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.status, 'ACTIVE')
    
    def test_subscription_updated_webhook(self):
        """Test subscription updated webhook handling."""
        event_data = {
            'id': 'sub_test123',
            'status': 'past_due',
            'current_period_end': int((timezone.now() + timedelta(days=30)).timestamp()),
            'trial_end': None
        }
        
        event = self.create_test_event('customer.subscription.updated', event_data)
        
        # Process the webhook
        self.webhook_view.handle_webhook_event(event)
        
        # Verify subscription status was updated
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.status, 'PAST_DUE')
    
    def test_subscription_deleted_webhook(self):
        """Test subscription deletion webhook handling."""
        event_data = {
            'id': 'sub_test123',
            'status': 'canceled'
        }
        
        event = self.create_test_event('customer.subscription.deleted', event_data)
        
        # Process the webhook
        self.webhook_view.handle_webhook_event(event)
        
        # Verify subscription was cancelled
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.status, 'CANCELLED')
        self.assertFalse(self.subscription.auto_renew)
    
    def test_invoice_payment_succeeded_webhook(self):
        """Test successful payment webhook handling."""
        event_data = {
            'id': 'in_test123',
            'subscription': 'sub_test123',
            'amount_paid': 2999,  # $29.99 in cents
            'currency': 'usd',
            'hosted_invoice_url': 'https://invoice.stripe.com/test',
            'number': 'INV-001'
        }
        
        event = self.create_test_event('invoice.payment_succeeded', event_data)
        
        # Process the webhook
        self.webhook_view.handle_webhook_event(event)
        
        # Verify payment transaction was created
        transaction = PaymentTransaction.objects.filter(
            provider_transaction_id='in_test123'
        ).first()
        
        self.assertIsNotNone(transaction)
        self.assertEqual(transaction.amount, Decimal('29.99'))
        self.assertEqual(transaction.status, 'COMPLETED')
        self.assertEqual(transaction.provider, 'STRIPE')
        self.assertEqual(transaction.subscription, self.subscription)
    
    def test_invoice_payment_failed_webhook(self):
        """Test failed payment webhook handling."""
        # Set subscription to active first
        self.subscription.status = 'ACTIVE'
        self.subscription.save()
        
        event_data = {
            'id': 'in_test123',
            'subscription': 'sub_test123',
            'amount_due': 2999,
            'currency': 'usd',
            'number': 'INV-001'
        }
        
        event = self.create_test_event('invoice.payment_failed', event_data)
        
        # Process the webhook
        self.webhook_view.handle_webhook_event(event)
        
        # Verify failed payment transaction was created
        transaction = PaymentTransaction.objects.filter(
            provider_transaction_id='in_test123'
        ).first()
        
        self.assertIsNotNone(transaction)
        self.assertEqual(transaction.status, 'FAILED')
        
        # Verify subscription status was updated
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.status, 'PAST_DUE')
    
    def test_payment_intent_succeeded_webhook(self):
        """Test successful one-time payment webhook."""
        event_data = {
            'id': 'pi_test123',
            'amount': 4999,  # $49.99 in cents
            'currency': 'usd',
            'description': 'One-time service fee',
            'metadata': {
                'user_id': str(self.user.id),
                'company_id': str(self.company.id)
            },
            'charges': {
                'data': [{
                    'receipt_url': 'https://pay.stripe.com/receipts/test'
                }]
            }
        }
        
        event = self.create_test_event('payment_intent.succeeded', event_data)
        
        # Process the webhook
        self.webhook_view.handle_webhook_event(event)
        
        # Verify payment transaction was created
        transaction = PaymentTransaction.objects.filter(
            provider_transaction_id='pi_test123'
        ).first()
        
        self.assertIsNotNone(transaction)
        self.assertEqual(transaction.amount, Decimal('49.99'))
        self.assertEqual(transaction.status, 'COMPLETED')
        self.assertEqual(transaction.payment_type, 'ONE_TIME')
        self.assertEqual(transaction.company, self.company)
        self.assertEqual(transaction.user, self.user)
    
    def test_payment_intent_failed_webhook(self):
        """Test failed one-time payment webhook."""
        event_data = {
            'id': 'pi_test123',
            'amount': 4999,
            'currency': 'usd',
            'description': 'Failed one-time payment',
            'metadata': {
                'user_id': str(self.user.id),
                'company_id': str(self.company.id)
            }
        }
        
        event = self.create_test_event('payment_intent.payment_failed', event_data)
        
        # Process the webhook
        self.webhook_view.handle_webhook_event(event)
        
        # Verify failed payment transaction was created
        transaction = PaymentTransaction.objects.filter(
            provider_transaction_id='pi_test123'
        ).first()
        
        self.assertIsNotNone(transaction)
        self.assertEqual(transaction.status, 'FAILED')
        self.assertEqual(transaction.payment_type, 'ONE_TIME')
    
    def test_nonexistent_subscription_webhook(self):
        """Test webhook for non-existent subscription doesn't crash."""
        event_data = {
            'id': 'sub_nonexistent',
            'status': 'active'
        }
        
        event = self.create_test_event('customer.subscription.updated', event_data)
        
        # This should not raise an exception
        try:
            self.webhook_view.handle_webhook_event(event)
        except Exception as e:
            self.fail(f"Webhook handling raised an exception: {e}")
    
    @patch('stripe.Webhook.construct_event')
    def test_webhook_endpoint_valid_signature(self, mock_construct_event):
        """Test webhook endpoint with valid signature."""
        # Mock the webhook event
        mock_event = {
            'type': 'customer.subscription.created',
            'data': {'object': {'id': 'sub_test123', 'status': 'active'}}
        }
        mock_construct_event.return_value = mock_event
        
        # Make request to webhook endpoint
        response = self.client.post(
            reverse('stripe_webhook'),
            data=json.dumps({}),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='valid_signature'
        )
        
        self.assertEqual(response.status_code, 200)
        mock_construct_event.assert_called_once()
    
    @patch('stripe.Webhook.construct_event')
    def test_webhook_endpoint_invalid_signature(self, mock_construct_event):
        """Test webhook endpoint with invalid signature."""
        from stripe.error import SignatureVerificationError
        
        # Mock signature verification error
        mock_construct_event.side_effect = SignatureVerificationError(
            "Invalid signature", "sig_header"
        )
        
        # Make request to webhook endpoint
        response = self.client.post(
            reverse('stripe_webhook'),
            data=json.dumps({}),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='invalid_signature'
        )
        
        self.assertEqual(response.status_code, 400)
    
    def test_webhook_endpoint_missing_signature(self):
        """Test webhook endpoint without signature header."""
        response = self.client.post(
            reverse('stripe_webhook'),
            data=json.dumps({}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
    
    def test_trial_will_end_webhook(self):
        """Test trial ending notification webhook."""
        event_data = {
            'id': 'sub_test123',
            'status': 'trialing'
        }
        
        event = self.create_test_event('customer.subscription.trial_will_end', event_data)
        
        # This should not raise an exception
        try:
            self.webhook_view.handle_webhook_event(event)
        except Exception as e:
            self.fail(f"Trial ending webhook raised an exception: {e}")


class StripeWebhookIntegrationTest(TestCase):
    """Integration tests for Stripe webhooks with database operations."""
    
    def setUp(self):
        """Set up test data."""
        self.company = Company.objects.create(
            name="Integration Test Company",
            email="integration@test.com"
        )
        
        self.user = User.objects.create_user(
            email="integration@user.com",
            password="testpass123",
            first_name="Integration",
            last_name="User",
            company=self.company
        )
        
        self.plan = SubscriptionPlan.objects.create(
            name="Integration Plan",
            price=Decimal("99.99"),
            billing_cycle="MONTHLY",
            stripe_price_id="price_integration"
        )
    
    def test_full_subscription_lifecycle(self):
        """Test complete subscription lifecycle through webhooks."""
        webhook_view = StripeWebhookView()
        
        # 1. Create subscription
        subscription = UserSubscription.objects.create(
            company=self.company,
            user=self.user,
            plan=self.plan,
            status='TRIALING',
            payment_provider='STRIPE',
            provider_subscription_id='sub_lifecycle_test',
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=30),
            is_trial=True
        )
        
        # 2. Subscription becomes active
        event = {
            'type': 'customer.subscription.updated',
            'data': {'object': {
                'id': 'sub_lifecycle_test',
                'status': 'active',
                'trial_end': None
            }}
        }
        webhook_view.handle_webhook_event(event)
        
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, 'ACTIVE')
        
        # 3. Payment succeeds
        event = {
            'type': 'invoice.payment_succeeded',
            'data': {'object': {
                'id': 'in_lifecycle_test',
                'subscription': 'sub_lifecycle_test',
                'amount_paid': 9999,
                'currency': 'usd',
                'hosted_invoice_url': 'https://invoice.stripe.com/test',
                'number': 'LIFECYCLE-001'
            }}
        }
        webhook_view.handle_webhook_event(event)
        
        # Check payment transaction was created
        transaction = PaymentTransaction.objects.filter(
            subscription=subscription,
            status='COMPLETED'
        ).first()
        self.assertIsNotNone(transaction)
        self.assertEqual(transaction.amount, Decimal('99.99'))
        
        # 4. Payment fails
        event = {
            'type': 'invoice.payment_failed',
            'data': {'object': {
                'id': 'in_lifecycle_fail',
                'subscription': 'sub_lifecycle_test',
                'amount_due': 9999,
                'currency': 'usd',
                'number': 'LIFECYCLE-002'
            }}
        }
        webhook_view.handle_webhook_event(event)
        
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, 'PAST_DUE')
        
        # 5. Subscription cancelled
        event = {
            'type': 'customer.subscription.deleted',
            'data': {'object': {
                'id': 'sub_lifecycle_test',
                'status': 'canceled'
            }}
        }
        webhook_view.handle_webhook_event(event)
        
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, 'CANCELLED')
        self.assertFalse(subscription.auto_renew)