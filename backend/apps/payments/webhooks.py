# apps/payments/webhooks.py
import json
import logging
import stripe
from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils.decorators import method_decorator
from django.views import View
from django.db import transaction
from django.utils import timezone
from .models import UserSubscription, PaymentTransaction, PaymentMethod
from .providers.stripe import StripeService

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(View):
    """Handle Stripe webhook events."""
    
    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        if not sig_header:
            logger.error("Missing Stripe signature header")
            return HttpResponseBadRequest('Missing signature header')
        
        try:
            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            return HttpResponseBadRequest('Invalid payload')
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            return HttpResponseBadRequest('Invalid signature')
        
        # Log the event for debugging
        logger.info(f"Received Stripe webhook: {event['type']} - {event['id']}")
        
        try:
            # Handle the event
            self.handle_webhook_event(event)
            return HttpResponse(status=200)
        except Exception as e:
            logger.error(f"Error processing webhook {event['type']}: {str(e)}")
            # Return 200 to prevent Stripe from retrying
            # Log the error for manual investigation
            return HttpResponse(status=200)
    
    def handle_webhook_event(self, event):
        """Route webhook events to appropriate handlers."""
        event_type = event['type']
        event_data = event['data']['object']
        
        # Subscription events
        if event_type == 'customer.subscription.created':
            self.handle_subscription_created(event_data)
        elif event_type == 'customer.subscription.updated':
            self.handle_subscription_updated(event_data)
        elif event_type == 'customer.subscription.deleted':
            self.handle_subscription_deleted(event_data)
        
        # Payment events
        elif event_type == 'invoice.payment_succeeded':
            self.handle_invoice_payment_succeeded(event_data)
        elif event_type == 'invoice.payment_failed':
            self.handle_invoice_payment_failed(event_data)
        elif event_type == 'payment_intent.succeeded':
            self.handle_payment_intent_succeeded(event_data)
        elif event_type == 'payment_intent.payment_failed':
            self.handle_payment_intent_failed(event_data)
        
        # Payment method events
        elif event_type == 'payment_method.attached':
            self.handle_payment_method_attached(event_data)
        elif event_type == 'customer.subscription.trial_will_end':
            self.handle_trial_will_end(event_data)
        
        # Setup intent events (for saving payment methods)
        elif event_type == 'setup_intent.succeeded':
            self.handle_setup_intent_succeeded(event_data)
        
        else:
            logger.info(f"Unhandled webhook event: {event_type}")
    
    @transaction.atomic
    def handle_subscription_created(self, subscription):
        """Handle subscription creation."""
        logger.info(f"Processing subscription created: {subscription['id']}")
        
        try:
            # Find the UserSubscription by provider_subscription_id
            user_subscription = UserSubscription.objects.get(
                provider_subscription_id=subscription['id']
            )
            
            # Update subscription status based on Stripe status
            stripe_status = subscription['status']
            if stripe_status == 'active':
                user_subscription.status = 'ACTIVE'
            elif stripe_status == 'trialing':
                user_subscription.status = 'TRIALING'
            elif stripe_status == 'past_due':
                user_subscription.status = 'PAST_DUE'
            elif stripe_status == 'canceled':
                user_subscription.status = 'CANCELLED'
            elif stripe_status == 'unpaid':
                user_subscription.status = 'UNPAID'
            
            user_subscription.save()
            logger.info(f"Updated subscription {user_subscription.id} status to {user_subscription.status}")
            
        except UserSubscription.DoesNotExist:
            logger.warning(f"UserSubscription not found for Stripe subscription {subscription['id']}")
    
    @transaction.atomic
    def handle_subscription_updated(self, subscription):
        """Handle subscription updates."""
        logger.info(f"Processing subscription updated: {subscription['id']}")
        
        try:
            user_subscription = UserSubscription.objects.get(
                provider_subscription_id=subscription['id']
            )
            
            # Update subscription status
            stripe_status = subscription['status']
            old_status = user_subscription.status
            
            if stripe_status == 'active':
                user_subscription.status = 'ACTIVE'
            elif stripe_status == 'trialing':
                user_subscription.status = 'TRIALING'
            elif stripe_status == 'past_due':
                user_subscription.status = 'PAST_DUE'
            elif stripe_status == 'canceled':
                user_subscription.status = 'CANCELLED'
            elif stripe_status == 'unpaid':
                user_subscription.status = 'UNPAID'
            
            # Update trial end if changed
            if subscription.get('trial_end'):
                user_subscription.trial_end = timezone.datetime.fromtimestamp(
                    subscription['trial_end'], tz=timezone.utc
                )
            
            # Update end date if changed
            if subscription.get('current_period_end'):
                user_subscription.end_date = timezone.datetime.fromtimestamp(
                    subscription['current_period_end'], tz=timezone.utc
                )
            
            user_subscription.save()
            
            logger.info(f"Updated subscription {user_subscription.id} from {old_status} to {user_subscription.status}")
            
        except UserSubscription.DoesNotExist:
            logger.warning(f"UserSubscription not found for Stripe subscription {subscription['id']}")
    
    @transaction.atomic
    def handle_subscription_deleted(self, subscription):
        """Handle subscription deletion/cancellation."""
        logger.info(f"Processing subscription deleted: {subscription['id']}")
        
        try:
            user_subscription = UserSubscription.objects.get(
                provider_subscription_id=subscription['id']
            )
            
            user_subscription.status = 'CANCELLED'
            user_subscription.auto_renew = False
            user_subscription.save()
            
            logger.info(f"Marked subscription {user_subscription.id} as cancelled")
            
        except UserSubscription.DoesNotExist:
            logger.warning(f"UserSubscription not found for Stripe subscription {subscription['id']}")
    
    @transaction.atomic
    def handle_invoice_payment_succeeded(self, invoice):
        """Handle successful invoice payment."""
        logger.info(f"Processing invoice payment succeeded: {invoice['id']}")
        
        try:
            # Get subscription from invoice
            subscription_id = invoice.get('subscription')
            if not subscription_id:
                return
            
            user_subscription = UserSubscription.objects.get(
                provider_subscription_id=subscription_id
            )
            
            # Create successful payment transaction
            payment_transaction = PaymentTransaction.objects.create(
                company=user_subscription.company,
                user=user_subscription.user,
                subscription=user_subscription,
                amount=invoice['amount_paid'] / 100,  # Convert from cents
                currency=invoice['currency'].upper(),
                status='COMPLETED',
                payment_type='SUBSCRIPTION',
                provider='STRIPE',
                provider_transaction_id=invoice['id'],
                description=f"Subscription payment for {user_subscription.plan.name}",
                receipt_url=invoice.get('hosted_invoice_url', ''),
                invoice_number=invoice.get('number', '')
            )
            
            # Update subscription status if it was past due
            if user_subscription.status in ['PAST_DUE', 'UNPAID']:
                user_subscription.status = 'ACTIVE'
                user_subscription.save()
            
            logger.info(f"Created payment transaction {payment_transaction.id} for ${payment_transaction.amount}")
            
        except UserSubscription.DoesNotExist:
            logger.warning(f"UserSubscription not found for Stripe subscription {subscription_id}")
    
    @transaction.atomic
    def handle_invoice_payment_failed(self, invoice):
        """Handle failed invoice payment."""
        logger.error(f"Processing invoice payment failed: {invoice['id']}")
        
        try:
            subscription_id = invoice.get('subscription')
            if not subscription_id:
                return
            
            user_subscription = UserSubscription.objects.get(
                provider_subscription_id=subscription_id
            )
            
            # Create failed payment transaction
            PaymentTransaction.objects.create(
                company=user_subscription.company,
                user=user_subscription.user,
                subscription=user_subscription,
                amount=invoice['amount_due'] / 100,
                currency=invoice['currency'].upper(),
                status='FAILED',
                payment_type='SUBSCRIPTION',
                provider='STRIPE',
                provider_transaction_id=invoice['id'],
                description=f"Failed subscription payment for {user_subscription.plan.name}",
                invoice_number=invoice.get('number', '')
            )
            
            # Update subscription status
            user_subscription.status = 'PAST_DUE'
            user_subscription.save()
            
            logger.info(f"Updated subscription {user_subscription.id} to PAST_DUE due to payment failure")
            
            # TODO: Send notification email to user about payment failure
            
        except UserSubscription.DoesNotExist:
            logger.warning(f"UserSubscription not found for Stripe subscription {subscription_id}")
    
    @transaction.atomic
    def handle_payment_intent_succeeded(self, payment_intent):
        """Handle successful one-time payment."""
        logger.info(f"Processing payment intent succeeded: {payment_intent['id']}")
        
        try:
            # Extract user/company info from metadata
            metadata = payment_intent.get('metadata', {})
            user_id = metadata.get('user_id')
            company_id = metadata.get('company_id')
            
            if user_id and company_id:
                from apps.users.models import User
                from apps.tenants.models import Company
                
                user = User.objects.get(id=user_id)
                company = Company.objects.get(id=company_id)
                
                # Create payment transaction
                PaymentTransaction.objects.create(
                    company=company,
                    user=user,
                    amount=payment_intent['amount'] / 100,
                    currency=payment_intent['currency'].upper(),
                    status='COMPLETED',
                    payment_type='ONE_TIME',
                    provider='STRIPE',
                    provider_transaction_id=payment_intent['id'],
                    description=payment_intent.get('description', 'One-time payment'),
                    receipt_url=payment_intent.get('charges', {}).get('data', [{}])[0].get('receipt_url', '')
                )
                
                logger.info(f"Created one-time payment transaction for payment intent {payment_intent['id']}")
            
        except (User.DoesNotExist, Company.DoesNotExist) as e:
            logger.warning(f"User or Company not found for payment intent {payment_intent['id']}: {e}")
        except Exception as e:
            logger.error(f"Error processing payment intent {payment_intent['id']}: {e}")
    
    @transaction.atomic
    def handle_payment_intent_failed(self, payment_intent):
        """Handle failed one-time payment."""
        logger.error(f"Processing payment intent failed: {payment_intent['id']}")
        
        try:
            metadata = payment_intent.get('metadata', {})
            user_id = metadata.get('user_id')
            company_id = metadata.get('company_id')
            
            if user_id and company_id:
                from apps.users.models import User
                from apps.tenants.models import Company
                
                user = User.objects.get(id=user_id)
                company = Company.objects.get(id=company_id)
                
                # Create failed payment transaction
                PaymentTransaction.objects.create(
                    company=company,
                    user=user,
                    amount=payment_intent['amount'] / 100,
                    currency=payment_intent['currency'].upper(),
                    status='FAILED',
                    payment_type='ONE_TIME',
                    provider='STRIPE',
                    provider_transaction_id=payment_intent['id'],
                    description=payment_intent.get('description', 'Failed one-time payment')
                )
                
                logger.info(f"Created failed payment transaction for payment intent {payment_intent['id']}")
            
        except (User.DoesNotExist, Company.DoesNotExist) as e:
            logger.warning(f"User or Company not found for payment intent {payment_intent['id']}: {e}")
        except Exception as e:
            logger.error(f"Error processing failed payment intent {payment_intent['id']}: {e}")
    
    def handle_payment_method_attached(self, payment_method):
        """Handle payment method attachment to customer."""
        logger.info(f"Processing payment method attached: {payment_method['id']}")
        
        try:
            customer_id = payment_method['customer']
            
            # Find user by Stripe customer ID
            # You might need to store stripe_customer_id in User or Company model
            # For now, we'll skip creating PaymentMethod records automatically
            # and let users add them manually through the UI
            
            logger.info(f"Payment method {payment_method['id']} attached to customer {customer_id}")
            
        except Exception as e:
            logger.error(f"Error processing payment method attachment: {e}")
    
    def handle_trial_will_end(self, subscription):
        """Handle trial ending soon notification."""
        logger.info(f"Processing trial will end: {subscription['id']}")
        
        try:
            user_subscription = UserSubscription.objects.get(
                provider_subscription_id=subscription['id']
            )
            
            # TODO: Send trial ending notification email
            logger.info(f"Trial ending soon for subscription {user_subscription.id}")
            
        except UserSubscription.DoesNotExist:
            logger.warning(f"UserSubscription not found for trial ending notification {subscription['id']}")
    
    def handle_setup_intent_succeeded(self, setup_intent):
        """Handle successful setup intent (payment method saved)."""
        logger.info(f"Processing setup intent succeeded: {setup_intent['id']}")
        
        try:
            customer_id = setup_intent['customer']
            payment_method_id = setup_intent['payment_method']
            
            # TODO: Create PaymentMethod record in database
            logger.info(f"Setup intent succeeded for customer {customer_id}, payment method {payment_method_id}")
            
        except Exception as e:
            logger.error(f"Error processing setup intent: {e}")


# Convenience function for manual webhook testing
def test_webhook_event(event_type, event_data):
    """Test webhook handling manually."""
    webhook_view = StripeWebhookView()
    
    mock_event = {
        'type': event_type,
        'data': {'object': event_data}
    }
    
    try:
        webhook_view.handle_webhook_event(mock_event)
        logger.info(f"Successfully processed test event: {event_type}")
        return True
    except Exception as e:
        logger.error(f"Failed to process test event {event_type}: {e}")
        return False