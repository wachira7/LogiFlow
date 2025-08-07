# apps/payments/management/commands/test_stripe_webhook.py
import json
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import timedelta
from apps.payments.webhooks import StripeWebhookView
from apps.payments.models import UserSubscription, PaymentTransaction


class Command(BaseCommand):
    """Management command to test Stripe webhook handling locally."""
    
    help = 'Test Stripe webhook event handling'
    
    def add_arguments(self, parser):
        parser.add_argument(
            'event_type',
            type=str,
            help='Type of webhook event to test (e.g., customer.subscription.created)'
        )
        parser.add_argument(
            '--subscription-id',
            type=str,
            default='sub_test123',
            help='Stripe subscription ID to use in test'
        )
        parser.add_argument(
            '--payment-intent-id',
            type=str,
            default='pi_test123',
            help='Stripe payment intent ID to use in test'
        )
        parser.add_argument(
            '--invoice-id',
            type=str,
            default='in_test123',
            help='Stripe invoice ID to use in test'
        )
        parser.add_argument(
            '--amount',
            type=float,
            default=29.99,
            help='Amount for payment testing (in dollars)'
        )
        parser.add_argument(
            '--list-events',
            action='store_true',
            help='List available webhook events for testing'
        )
    
    def handle(self, *args, **options):
        if options['list_events']:
            self.list_available_events()
            return
        
        event_type = options['event_type']
        
        # Create test event data based on event type
        event_data = self.create_test_event_data(event_type, options)
        
        if not event_data:
            raise CommandError(f'Unknown or unsupported event type: {event_type}')
        
        # Create webhook event
        webhook_event = {
            'id': f'evt_test_{int(timezone.now().timestamp())}',
            'type': event_type,
            'data': {'object': event_data}
        }
        
        # Process the webhook
        webhook_view = StripeWebhookView()
        
        try:
            self.stdout.write(f"Processing webhook event: {event_type}")
            self.stdout.write(f"Event data: {json.dumps(event_data, indent=2)}")
            
            webhook_view.handle_webhook_event(webhook_event)
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully processed {event_type} webhook')
            )
            
            # Show relevant database changes
            self.show_database_changes(event_type, event_data)
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error processing webhook: {str(e)}')
            )
            raise
    
    def create_test_event_data(self, event_type, options):
        """Create test event data for different webhook types."""
        
        if event_type == 'customer.subscription.created':
            return {
                'id': options['subscription_id'],
                'status': 'active',
                'current_period_end': int((timezone.now() + timedelta(days=30)).timestamp()),
                'trial_end': None
            }
        
        elif event_type == 'customer.subscription.updated':
            return {
                'id': options['subscription_id'],
                'status': 'past_due',  # You can modify this
                'current_period_end': int((timezone.now() + timedelta(days=30)).timestamp()),
                'trial_end': None
            }
        
        elif event_type == 'customer.subscription.deleted':
            return {
                'id': options['subscription_id'],
                'status': 'canceled'
            }
        
        elif event_type == 'invoice.payment_succeeded':
            return {
                'id': options['invoice_id'],
                'subscription': options['subscription_id'],
                'amount_paid': int(options['amount'] * 100),  # Convert to cents
                'currency': 'usd',
                'hosted_invoice_url': f'https://invoice.stripe.com/{options["invoice_id"]}',
                'number': f'INV-TEST-{int(timezone.now().timestamp())}'
            }
        
        elif event_type == 'invoice.payment_failed':
            return {
                'id': options['invoice_id'],
                'subscription': options['subscription_id'],
                'amount_due': int(options['amount'] * 100),
                'currency': 'usd',
                'number': f'INV-FAIL-{int(timezone.now().timestamp())}'
            }
        
        elif event_type == 'payment_intent.succeeded':

            # Get real user and company IDs
            from apps.users.models import User
            from apps.tenants.models import Company
            
            user = User.objects.first()
            company = Company.objects.first()
            
            if user and company:
                return {
                    'id': options['payment_intent_id'],
                    'amount': int(options['amount'] * 100),
                    'currency': 'usd',
                    'description': 'Test one-time payment',
                    'metadata': {
                        'user_id': str(user.id),  # Real UUID
                        'company_id': str(company.id)  # Real UUID
                    },
                    'charges': {
                        'data': [{
                            'receipt_url': f'https://pay.stripe.com/receipts/{options["payment_intent_id"]}'
                        }]
                    }
                }
        
        elif event_type == 'payment_intent.payment_failed':
            return {
                'id': options['payment_intent_id'],
                'amount': int(options['amount'] * 100),
                'currency': 'usd',
                'description': 'Failed test payment',
                'metadata': {
                    'user_id': '1',
                    'company_id': '1'
                }
            }
        
        elif event_type == 'customer.subscription.trial_will_end':
            return {
                'id': options['subscription_id'],
                'status': 'trialing',
                'trial_end': int((timezone.now() + timedelta(days=3)).timestamp())
            }
        
        elif event_type == 'payment_method.attached':
            return {
                'id': 'pm_test123',
                'customer': 'cus_test123',
                'type': 'card',
                'card': {
                    'brand': 'visa',
                    'last4': '4242',
                    'exp_month': 12,
                    'exp_year': 2025
                }
            }
        
        elif event_type == 'setup_intent.succeeded':
            return {
                'id': 'seti_test123',
                'customer': 'cus_test123',
                'payment_method': 'pm_test123',
                'status': 'succeeded'
            }
        
        return None
    
    def list_available_events(self):
        """List all available webhook events for testing."""
        events = [
            'customer.subscription.created',
            'customer.subscription.updated', 
            'customer.subscription.deleted',
            'invoice.payment_succeeded',
            'invoice.payment_failed',
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'customer.subscription.trial_will_end',
            'payment_method.attached',
            'setup_intent.succeeded'
        ]
        
        self.stdout.write("Available webhook events for testing:")
        self.stdout.write("")
        
        for event in events:
            self.stdout.write(f"  • {event}")
        
        self.stdout.write("")
        self.stdout.write("Example usage:")
        self.stdout.write("  python manage.py test_stripe_webhook customer.subscription.created")
        self.stdout.write("  python manage.py test_stripe_webhook invoice.payment_succeeded --amount 49.99")
        self.stdout.write("  python manage.py test_stripe_webhook customer.subscription.updated --subscription-id sub_real123")
    
    def show_database_changes(self, event_type, event_data):
        """Show relevant database changes after webhook processing."""
        self.stdout.write("")
        self.stdout.write("Database changes:")
        
        if 'subscription' in event_type:
            subscription_id = event_data.get('id')
            if subscription_id:
                try:
                    subscription = UserSubscription.objects.get(
                        provider_subscription_id=subscription_id
                    )
                    self.stdout.write(f"  Subscription {subscription.id}: {subscription.status}")
                except UserSubscription.DoesNotExist:
                    self.stdout.write(f"  No local subscription found for {subscription_id}")
        
        if 'payment' in event_type or 'invoice' in event_type:
            transaction_id = event_data.get('id')
            if transaction_id:
                try:
                    transaction = PaymentTransaction.objects.get(
                        provider_transaction_id=transaction_id
                    )
                    self.stdout.write(f"  Transaction {transaction.id}: {transaction.status} - ${transaction.amount}")
                except PaymentTransaction.DoesNotExist:
                    self.stdout.write(f"  No transaction found for {transaction_id}")


# Example usage commands you can document:
"""
# Test subscription events
python manage.py test_stripe_webhook customer.subscription.created
python manage.py test_stripe_webhook customer.subscription.updated
python manage.py test_stripe_webhook customer.subscription.deleted

# Test payment events  
python manage.py test_stripe_webhook invoice.payment_succeeded --amount 99.99
python manage.py test_stripe_webhook invoice.payment_failed --amount 99.99
python manage.py test_stripe_webhook payment_intent.succeeded --amount 49.99

# List all available events
python manage.py test_stripe_webhook --list-events

# Test with specific IDs
python manage.py test_stripe_webhook invoice.payment_succeeded --subscription-id sub_1234 --invoice-id in_5678 --amount 29.99
"""