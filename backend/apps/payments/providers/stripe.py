# apps/payments/providers/stripe.py - Enhanced version
import stripe
import logging
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from ..models import UserSubscription, PaymentTransaction, PaymentMethod

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY
stripe.api_version = settings.STRIPE_API_VERSION

logger = logging.getLogger(__name__)

class StripeService:
    """Enhanced Stripe payment processing service."""
    
    def __init__(self):
        self.api_key = settings.STRIPE_SECRET_KEY
        stripe.api_key = self.api_key
    
    def create_customer(self, user, company):
        """Create a Stripe customer for a user/company."""
        try:
            customer = stripe.Customer.create(
                email=user.email,
                name=f"{user.get_full_name()}",
                description=f"{company.name} - {user.email}",
                metadata={
                    'user_id': str(user.id),
                    'company_id': str(company.id),
                    'company_name': company.name,
                    'platform': 'LogiFlow'
                }
            )
            
            logger.info(f"Created Stripe customer {customer.id} for user {user.email}")
            return customer
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create Stripe customer for {user.email}: {str(e)}")
            raise
    
    def get_or_create_customer(self, user, company):
        """Get existing customer or create a new one."""
        try:
            # Try to find existing customer by email
            customers = stripe.Customer.list(email=user.email, limit=1)
            
            if customers.data:
                customer = customers.data[0]
                logger.info(f"Found existing Stripe customer {customer.id} for {user.email}")
                return customer
            else:
                return self.create_customer(user, company)
                
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get/create customer for {user.email}: {str(e)}")
            raise
    
    def create_subscription(self, customer_id, price_id, trial_days=14, metadata=None):
        """Create a Stripe subscription."""
        try:
            subscription_params = {
                'customer': customer_id,
                'items': [{'price': price_id}],
                'payment_behavior': 'default_incomplete',
                'payment_settings': {'save_default_payment_method': 'on_subscription'},
                'expand': ['latest_invoice.payment_intent'],
                'metadata': metadata or {'created_by': 'LogiFlow Platform'}
            }
            
            # Add trial period if specified
            if trial_days > 0:
                trial_end = timezone.now() + timedelta(days=trial_days)
                subscription_params['trial_end'] = int(trial_end.timestamp())
            
            subscription = stripe.Subscription.create(**subscription_params)
            
            logger.info(f"Created Stripe subscription {subscription.id} for customer {customer_id}")
            return subscription
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create subscription for customer {customer_id}: {str(e)}")
            raise
    
    def create_payment_intent(self, amount, currency='usd', customer_id=None, description=None, metadata=None):
        """Create a one-time payment intent."""
        try:
            payment_intent_params = {
                'amount': int(amount * 100),  # Convert to cents
                'currency': currency.lower(),
                'automatic_payment_methods': {'enabled': True},
                'metadata': metadata or {'created_by': 'LogiFlow Platform'}
            }
            
            if customer_id:
                payment_intent_params['customer'] = customer_id
            
            if description:
                payment_intent_params['description'] = description
            
            payment_intent = stripe.PaymentIntent.create(**payment_intent_params)
            
            logger.info(f"Created payment intent {payment_intent.id} for ${amount}")
            return payment_intent
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create payment intent: {str(e)}")
            raise
    
    def confirm_payment_intent(self, payment_intent_id, payment_method_id=None):
        """Confirm a payment intent."""
        try:
            params = {}
            if payment_method_id:
                params['payment_method'] = payment_method_id
            
            payment_intent = stripe.PaymentIntent.confirm(payment_intent_id, **params)
            
            logger.info(f"Confirmed payment intent {payment_intent_id}")
            return payment_intent
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to confirm payment intent {payment_intent_id}: {str(e)}")
            raise
    
    def cancel_subscription(self, subscription_id, prorate=True):
        """Cancel a Stripe subscription."""
        try:
            subscription = stripe.Subscription.cancel(
                subscription_id,
                prorate=prorate
            )
            
            logger.info(f"Cancelled Stripe subscription {subscription_id}")
            return subscription
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to cancel subscription {subscription_id}: {str(e)}")
            raise
    
    def reactivate_subscription(self, subscription_id):
        """Reactivate a cancelled Stripe subscription."""
        try:
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=False
            )
            
            logger.info(f"Reactivated Stripe subscription {subscription_id}")
            return subscription
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to reactivate subscription {subscription_id}: {str(e)}")
            raise
    
    def get_customer_payment_methods(self, customer_id):
        """Get all payment methods for a customer."""
        try:
            payment_methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type='card'
            )
            
            return payment_methods.data
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get payment methods for customer {customer_id}: {str(e)}")
            raise
    
    def attach_payment_method(self, payment_method_id, customer_id):
        """Attach a payment method to a customer."""
        try:
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )
            
            logger.info(f"Attached payment method {payment_method_id} to customer {customer_id}")
            return payment_method
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to attach payment method {payment_method_id}: {str(e)}")
            raise
    
    def detach_payment_method(self, payment_method_id):
        """Detach a payment method from a customer."""
        try:
            payment_method = stripe.PaymentMethod.detach(payment_method_id)
            
            logger.info(f"Detached payment method {payment_method_id}")
            return payment_method
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to detach payment method {payment_method_id}: {str(e)}")
            raise
    
    def create_setup_intent(self, customer_id, metadata=None):
        """Create a setup intent for saving payment methods."""
        try:
            setup_intent = stripe.SetupIntent.create(
                customer=customer_id,
                payment_method_types=['card'],
                usage='off_session',
                metadata=metadata or {'created_by': 'LogiFlow Platform'}
            )
            
            logger.info(f"Created setup intent for customer {customer_id}")
            return setup_intent
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create setup intent for customer {customer_id}: {str(e)}")
            raise
    
    def get_subscription(self, subscription_id):
        """Get subscription details from Stripe."""
        try:
            subscription = stripe.Subscription.retrieve(
                subscription_id,
                expand=['customer', 'items.data.price']
            )
            return subscription
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get subscription {subscription_id}: {str(e)}")
            raise
    
    def create_customer_portal_session(self, customer_id, return_url):
        """Create a customer portal session for self-service."""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url
            )
            
            logger.info(f"Created customer portal session for {customer_id}")
            return session
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create customer portal session: {str(e)}")
            raise
    
    def create_price(self, product_id, amount, currency='usd', recurring_interval='month'):
        """Create a price object for subscriptions."""
        try:
            price_params = {
                'product': product_id,
                'unit_amount': int(amount * 100),  # Convert to cents
                'currency': currency.lower(),
            }
            
            if recurring_interval:
                price_params['recurring'] = {'interval': recurring_interval}
            
            price = stripe.Price.create(**price_params)
            
            logger.info(f"Created price {price.id} for product {product_id}")
            return price
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create price: {str(e)}")
            raise
    
    def create_product(self, name, description=None):
        """Create a product for subscription plans."""
        try:
            product_params = {
                'name': name,
                'type': 'service',
            }
            
            if description:
                product_params['description'] = description
            
            product = stripe.Product.create(**product_params)
            
            logger.info(f"Created product {product.id}: {name}")
            return product
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create product: {str(e)}")
            raise
    
    def retrieve_invoice(self, invoice_id):
        """Retrieve invoice details."""
        try:
            invoice = stripe.Invoice.retrieve(invoice_id)
            return invoice
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to retrieve invoice {invoice_id}: {str(e)}")
            raise
    
    def create_refund(self, payment_intent_id, amount=None, reason=None):
        """Create a refund for a payment."""
        try:
            refund_params = {
                'payment_intent': payment_intent_id,
                'metadata': {'created_by': 'LogiFlow Platform'}
            }
            
            if amount:
                refund_params['amount'] = int(amount * 100)  # Convert to cents
            
            if reason:
                refund_params['reason'] = reason
            
            refund = stripe.Refund.create(**refund_params)
            
            logger.info(f"Created refund {refund.id} for payment intent {payment_intent_id}")
            return refund
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create refund: {str(e)}")
            raise
    
    def verify_webhook_signature(self, payload, sig_header, endpoint_secret=None):
        """Verify Stripe webhook signature."""
        try:
            endpoint_secret = endpoint_secret or settings.STRIPE_WEBHOOK_SECRET
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
            return event
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            raise
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            raise
    
    def sync_subscription_status(self, subscription_id):
        """Sync local subscription with Stripe status."""
        try:
            # Get subscription from Stripe
            stripe_subscription = self.get_subscription(subscription_id)
            
            # Find local subscription
            user_subscription = UserSubscription.objects.get(
                provider_subscription_id=subscription_id
            )
            
            # Update local status based on Stripe status
            stripe_status = stripe_subscription['status']
            status_mapping = {
                'active': 'ACTIVE',
                'trialing': 'TRIALING',
                'past_due': 'PAST_DUE',
                'canceled': 'CANCELLED',
                'unpaid': 'UNPAID',
            }
            
            new_status = status_mapping.get(stripe_status, user_subscription.status)
            
            if new_status != user_subscription.status:
                user_subscription.status = new_status
                user_subscription.save()
                logger.info(f"Synced subscription {subscription_id} status to {new_status}")
            
            return user_subscription
            
        except UserSubscription.DoesNotExist:
            logger.error(f"Local subscription not found for Stripe subscription {subscription_id}")
            raise
        except stripe.error.StripeError as e:
            logger.error(f"Failed to sync subscription {subscription_id}: {str(e)}")
            raise
    
    def get_upcoming_invoice(self, customer_id, subscription_id=None):
        """Get the upcoming invoice for a customer."""
        try:
            params = {'customer': customer_id}
            if subscription_id:
                params['subscription'] = subscription_id
            
            upcoming_invoice = stripe.Invoice.upcoming(**params)
            return upcoming_invoice
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get upcoming invoice: {str(e)}")
            raise
    
    def test_connection(self):
        """Test Stripe API connection."""
        try:
            # Simple API call to test connection
            stripe.Account.retrieve()
            logger.info("Stripe connection test successful")
            return True
        except stripe.error.StripeError as e:
            logger.error(f"Stripe connection test failed: {str(e)}")
            return False