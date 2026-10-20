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
from datetime import datetime, timezone as dt_timezone
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
            # Let Stripe retry: handlers are idempotent, so a retry can't double-count anything
            logger.exception(f"Error processing webhook {event['type']}: {str(e)}")
            return HttpResponse(status=500)
    
    def handle_webhook_event(self, event):
        """Route webhook events to their handlers. Every handler is safe to run twice (Stripe retries)."""
        handlers = {
            'checkout.session.completed': self.handle_checkout_completed,
            'customer.subscription.created': self.handle_subscription_created,
            'customer.subscription.updated': self.handle_subscription_updated,
            'customer.subscription.deleted': self.handle_subscription_deleted,
            'invoice.payment_succeeded': self.handle_invoice_payment_succeeded,
            'invoice.paid': self.handle_invoice_payment_succeeded,
            'invoice.payment_failed': self.handle_invoice_payment_failed,
            'customer.subscription.trial_will_end': self.handle_trial_will_end,
            'payment_intent.succeeded': self.handle_payment_intent_succeeded,
            'payment_intent.payment_failed': self.handle_payment_intent_failed,
        }
        handler = handlers.get(event['type'])
        if handler is None:
            logger.info('Unhandled Stripe event %s', event['type'])
            return
        handler(event['data']['object'])

    def handle_checkout_completed(self, session):
        from .stripe_flow import complete_subscription_checkout, save_card_from_setup
        if session.get('mode') == 'subscription':
            complete_subscription_checkout(session)
        elif session.get('mode') == 'setup':
            save_card_from_setup(session)

    @transaction.atomic
    def handle_subscription_created(self, subscription):
        from .stripe_flow import sync_subscription
        if sync_subscription(subscription) is None:
            logger.warning('No local subscription for Stripe subscription %s yet', subscription['id'])

    @transaction.atomic
    def handle_subscription_updated(self, subscription):
        from .stripe_flow import sync_subscription
        if sync_subscription(subscription) is None:
            logger.warning('No local subscription for Stripe subscription %s', subscription['id'])

    @transaction.atomic
    def handle_subscription_deleted(self, subscription):
        updated = UserSubscription.objects.filter(provider_subscription_id=subscription['id']).update(
            status='CANCELLED', auto_renew=False, updated_at=timezone.now(),
        )
        if not updated:
            logger.warning('No local subscription for deleted Stripe subscription %s', subscription['id'])

    def _invoice_subscription(self, invoice):
        sub_id = invoice.get('subscription') or (invoice.get('parent') or {}).get('subscription_details', {}).get('subscription')
        return UserSubscription.objects.filter(provider_subscription_id=sub_id).select_related('plan').first() if sub_id else None

    def handle_invoice_payment_succeeded(self, invoice):
        """Record the payment once (zero-amount trial invoices are skipped)."""
        from .billing import record_payment
        sub = self._invoice_subscription(invoice)
        amount = (invoice.get('amount_paid') or 0) / 100
        if sub is None or amount <= 0:
            return
        record_payment(
            company=sub.company, user=sub.user, provider='STRIPE', provider_transaction_id=invoice['id'],
            amount=amount, currency=(invoice.get('currency') or 'usd').upper(), status='COMPLETED', subscription=sub,
            description=f'{sub.plan.name} subscription', receipt_url=invoice.get('hosted_invoice_url') or '',
            invoice_number=invoice.get('number') or '',
        )

    @transaction.atomic
    def handle_invoice_payment_failed(self, invoice):
        from .billing import record_payment
        sub = self._invoice_subscription(invoice)
        if sub is None:
            return
        record_payment(
            company=sub.company, user=sub.user, provider='STRIPE', provider_transaction_id=invoice['id'],
            amount=(invoice.get('amount_due') or 0) / 100, currency=(invoice.get('currency') or 'usd').upper(),
            status='FAILED', subscription=sub, description=f'Failed payment for {sub.plan.name}',
            invoice_number=invoice.get('number') or '',
        )
        if sub.status in ('ACTIVE', 'TRIALING'):
            sub.status = 'PAST_DUE'
            sub.save(update_fields=['status', 'updated_at'])

    def _one_time(self, payment_intent, status):
        """One-time payments carry company_id/user_id in their metadata; subscription invoices are handled above."""
        from apps.tenants.models import Company
        from apps.users.models import User
        from .billing import record_payment
        meta = payment_intent.get('metadata') or {}
        if payment_intent.get('invoice') or not meta.get('company_id'):
            return
        company = Company.objects.filter(id=meta['company_id']).first()
        user = User.objects.filter(id=meta.get('user_id')).first()
        if not company or not user:
            logger.warning('Unknown company/user on payment intent %s', payment_intent['id'])
            return
        charges = (payment_intent.get('charges') or {}).get('data') or [{}]
        record_payment(
            company=company, user=user, provider='STRIPE', provider_transaction_id=payment_intent['id'],
            amount=(payment_intent.get('amount') or 0) / 100, currency=(payment_intent.get('currency') or 'usd').upper(),
            status=status, payment_type='ONE_TIME', description=payment_intent.get('description') or 'One-time payment',
            receipt_url=charges[0].get('receipt_url') or '',
        )

    def handle_payment_intent_succeeded(self, payment_intent):
        self._one_time(payment_intent, 'COMPLETED')

    def handle_payment_intent_failed(self, payment_intent):
        self._one_time(payment_intent, 'FAILED')

    def handle_trial_will_end(self, subscription):
        logger.info('Trial ending soon for Stripe subscription %s', subscription['id'])


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