# backend/apps/payments/tasks.py
"""
Celery tasks for subscription management.
Handles trial expiration, recurring billing, and subscription status updates.
ENHANCED: Now uses linked payment methods for charging
"""

from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from decimal import Decimal
import logging

from .models import UserSubscription, PaymentTransaction, PaymentMethod
from .providers.stripe import StripeService
from .providers.mpesa import MPesaService
from .providers.crypto import CryptoService

logger = logging.getLogger(__name__)


def request_payment(subscription):
    """
    Ask the customer to pay for the next period of an M-Pesa / crypto subscription: an STK push to the default
    M-Pesa number, or a crypto invoice. The payment callback activates and extends the subscription.
    Returns True when a payment request went out.
    """
    from .billing import provider_amount

    method = (PaymentMethod.objects.filter(company=subscription.company, provider=subscription.payment_provider)
              .order_by('-is_default', '-created_at').first())
    if method is None:
        send_add_payment_method_notification.delay(subscription.id)
        return False
    amount, currency = provider_amount(subscription.plan, subscription.payment_provider)
    description = f'LogiFlow {subscription.plan.name} ({subscription.plan.get_billing_cycle_display().lower()})'
    try:
        if subscription.payment_provider == 'MPESA':
            if not method.phone_number:
                return False
            MPesaService().initiate_stk_push(
                phone_number=method.phone_number, amount=amount, account_reference=f'SUB-{str(subscription.id)[:8]}',
                transaction_desc=description, user=subscription.user, company=subscription.company,
                subscription=subscription,
            )
            send_mpesa_payment_initiated_notification.delay(subscription.id, method.phone_number)
            return True
        if subscription.payment_provider == 'CRYPTO':
            payment = CryptoService().create_payment(
                amount=amount, currency=currency, order_id=f'sub-{subscription.id}-{int(timezone.now().timestamp())}',
                order_description=description, user=subscription.user, company=subscription.company,
                subscription=subscription,
            )
            send_crypto_payment_notification.delay(subscription.id, payment.get('pay_address'), payment.get('pay_amount'),
                                                   payment.get('pay_currency'))
            return True
    except Exception as exc:
        logger.error('Payment request failed for subscription %s: %s', subscription.id, exc)
    return False


def bill_due_subscriptions():
    """Every M-Pesa / crypto subscription whose period or trial has ended becomes past due and is asked to pay."""
    from .billing import subscriptions_due

    results = {'total': 0, 'requested': 0, 'no_payment_method': 0}
    for subscription in subscriptions_due():
        results['total'] += 1
        subscription.status = 'PAST_DUE'
        subscription.save(update_fields=['status', 'updated_at'])
        if request_payment(subscription):
            results['requested'] += 1
        else:
            results['no_payment_method'] += 1
    logger.info('Billing run: %s', results)
    return results


@shared_task(bind=True, max_retries=3)
def process_trial_expiration(self):
    """Daily: trials and periods that ended are billed (M-Pesa / crypto; Stripe bills its own)."""
    return bill_due_subscriptions()


@shared_task(bind=True, max_retries=3)
def process_recurring_billing(self):
    """Daily: same billing run as above (kept as a separate schedule entry)."""
    return bill_due_subscriptions()


@shared_task(bind=True, max_retries=3)
def expire_past_due_subscriptions(self):
    """
    Daily: subscriptions set not to renew end when their period is over, and subscriptions unpaid for more
    than the 7-day grace period expire.
    """
    from .billing import end_finished_subscriptions

    ended = end_finished_subscriptions()
    grace = timezone.now() - timedelta(days=7)
    expired = UserSubscription.objects.filter(status='PAST_DUE', end_date__lt=grace).update(status='EXPIRED', auto_renew=False)
    logger.info('Ended %s cancelled and expired %s unpaid subscriptions', ended, expired)
    return {'ended': ended, 'expired_count': expired}


# ============================================================================
# NOTIFICATION TASKS - ENHANCED
# ============================================================================

@shared_task
def send_payment_success_notification(subscription_id, transaction_id):
    """✅ NEW: Send email notification when payment succeeds."""
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        subscription = UserSubscription.objects.get(id=subscription_id)
        transaction_obj = PaymentTransaction.objects.get(id=transaction_id)
        
        subject = f"Payment Successful - {subscription.plan.name} Subscription"
        message = f"""
        Hi {subscription.user.get_full_name()},
        
        Your payment for the {subscription.plan.name} subscription was successful!
        
        Amount: {transaction_obj.currency} {transaction_obj.amount}
        Payment Method: {transaction_obj.provider_payment_method}
        Transaction ID: {transaction_obj.provider_transaction_id}
        
        Your subscription is now active until {subscription.end_date.strftime('%B %d, %Y')}.
        
        View Subscription: {settings.FRONTEND_URL}/billing/subscriptions/{subscription.id}
        
        Thank you for your business!
        
        Best regards,
        LogiFlow Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [subscription.user.email],
            fail_silently=False,
        )
        
        logger.info(f"Sent payment success notification for subscription {subscription_id}")
        
    except Exception as e:
        logger.error(f"Error sending payment success notification: {str(e)}")


@shared_task
def send_add_payment_method_notification(subscription_id):
    """✅ NEW: Notify user to add payment method before trial ends."""
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        subscription = UserSubscription.objects.get(id=subscription_id)
        
        subject = f"Action Required - Add Payment Method"
        message = f"""
        Hi {subscription.user.get_full_name()},
        
        Your {subscription.plan.name} trial is ending soon, but we don't have a payment method on file.
        
        Please add a payment method to avoid service interruption.
        
        Trial End Date: {subscription.trial_end.strftime('%B %d, %Y')}
        Plan Price: ${subscription.plan.price}/{subscription.plan.billing_cycle.lower()}
        
        Add Payment Method: {settings.FRONTEND_URL}/billing/payment-methods
        
        Best regards,
        LogiFlow Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [subscription.user.email],
            fail_silently=False,
        )
        
        logger.info(f"Sent add payment method notification for subscription {subscription_id}")
        
    except Exception as e:
        logger.error(f"Error sending add payment method notification: {str(e)}")


@shared_task
def send_mpesa_payment_initiated_notification(subscription_id, phone_number):
    """✅ ENHANCED: Notify user that M-Pesa payment was initiated."""
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        subscription = UserSubscription.objects.get(id=subscription_id)
        
        # Mask phone number for security
        masked_phone = f"****{phone_number[-4:]}"
        
        subject = f"M-Pesa Payment Initiated - {subscription.plan.name}"
        message = f"""
        Hi {subscription.user.get_full_name()},
        
        We've initiated an M-Pesa payment request for your {subscription.plan.name} subscription.
        
        Please check your phone ({masked_phone}) for an M-Pesa prompt and enter your PIN to complete the payment.
        
        Amount: KES {float(subscription.plan.price) * 150:,.0f}
        
        If you didn't receive the prompt, you can manually pay via:
        Paybill: [Your Paybill Number]
        Account: SUB-{subscription.id}
        
        Best regards,
        LogiFlow Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [subscription.user.email],
            fail_silently=False,
        )
        
        logger.info(f"Sent M-Pesa payment initiated notification for subscription {subscription_id}")
        
    except Exception as e:
        logger.error(f"Error sending M-Pesa payment notification: {str(e)}")


@shared_task
def send_payment_failed_notification(subscription_id):
    """Send email notification when payment fails."""
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        subscription = UserSubscription.objects.get(id=subscription_id)
        
        subject = f"Payment Failed - {subscription.plan.name} Subscription"
        message = f"""
        Hi {subscription.user.get_full_name()},
        
        We couldn't process your payment for the {subscription.plan.name} subscription.
        
        Amount: ${subscription.plan.price}
        Status: Past Due
        
        Please update your payment method to continue using our services.
        
        Update Payment Method: {settings.FRONTEND_URL}/billing/payment-methods
        
        If you have any questions, please contact our support team.
        
        Best regards,
        LogiFlow Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [subscription.user.email],
            fail_silently=False,
        )
        
        logger.info(f"Sent payment failed notification for subscription {subscription_id}")
        
    except Exception as e:
        logger.error(f"Error sending payment failed notification: {str(e)}")


@shared_task
def send_mpesa_payment_request_notification(subscription_id):
    """Send notification requesting M-Pesa payment."""
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        subscription = UserSubscription.objects.get(id=subscription_id)
        
        subject = f"Payment Required - {subscription.plan.name} Subscription"
        message = f"""
        Hi {subscription.user.get_full_name()},
        
        Your {subscription.plan.name} subscription requires payment.
        
        Amount: KES {float(subscription.plan.price) * 150:,.0f}
        
        Please make payment via M-Pesa to continue your subscription.
        
        Pay Now: {settings.FRONTEND_URL}/billing/subscriptions/{subscription.id}
        
        Best regards,
        LogiFlow Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [subscription.user.email],
            fail_silently=False,
        )
        
        logger.info(f"Sent M-Pesa payment request for subscription {subscription_id}")
        
    except Exception as e:
        logger.error(f"Error sending M-Pesa payment notification: {str(e)}")


@shared_task
def send_crypto_payment_notification(subscription_id, payment_address, amount, currency):
    """Send notification with crypto payment details."""
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        subscription = UserSubscription.objects.get(id=subscription_id)
        
        subject = f"Crypto Payment Required - {subscription.plan.name}"
        message = f"""
        Hi {subscription.user.get_full_name()},
        
        Your {subscription.plan.name} subscription requires payment.
        
        Payment Details:
        Amount: {amount} {currency.upper()}
        Address: {payment_address}
        
        Complete Payment: {settings.FRONTEND_URL}/billing/subscriptions/{subscription.id}
        
        Best regards,
        LogiFlow Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [subscription.user.email],
            fail_silently=False,
        )
        
        logger.info(f"Sent crypto payment notification for subscription {subscription_id}")
        
    except Exception as e:
        logger.error(f"Error sending crypto payment notification: {str(e)}")


@shared_task
def send_trial_ending_reminder(days_before=3):
    """
    Send reminder emails X days before trial ends.
    Run this task daily.
    """
    reminder_date = timezone.now().date() + timedelta(days=days_before)
    
    trials_ending = UserSubscription.objects.filter(
        is_trial=True,
        status='TRIALING',
        trial_end__date=reminder_date
    ).select_related('user', 'plan')
    
    for subscription in trials_ending:
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            
            subject = f"Your Trial Ends in {days_before} Days"
            message = f"""
            Hi {subscription.user.get_full_name()},
            
            Your {subscription.plan.name} trial will end in {days_before} days.
            
            Trial End Date: {subscription.trial_end.strftime('%B %d, %Y')}
            Plan Price: ${subscription.plan.price}/{subscription.plan.billing_cycle.lower()}
            
            Make sure your payment method is set up to avoid service interruption.
            
            Manage Subscription: {settings.FRONTEND_URL}/billing/subscriptions/{subscription.id}
            
            Best regards,
            LogiFlow Team
            """
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [subscription.user.email],
                fail_silently=False,
            )
            
        except Exception as e:
            logger.error(f"Error sending trial reminder for subscription {subscription.id}: {str(e)}")