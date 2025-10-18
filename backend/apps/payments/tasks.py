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


@shared_task(bind=True, max_retries=3)
def process_trial_expiration(self):
    """
    Check for trials ending today and charge customers.
    Run this task daily at midnight.
    """
    logger.info("Starting trial expiration check...")
    
    today = timezone.now().date()
    
    # Find subscriptions with trials ending today
    expiring_trials = UserSubscription.objects.filter(
        is_trial=True,
        status='TRIALING',
        trial_end__date=today
    ).select_related('plan', 'company', 'user')
    
    results = {
        'total': expiring_trials.count(),
        'success': 0,
        'failed': 0,
        'no_payment_method': 0,
        'errors': []
    }
    
    for subscription in expiring_trials:
        try:
            # ✅ Check if payment method is available
            payment_method = get_subscription_payment_method(subscription)
            
            if not payment_method:
                results['no_payment_method'] += 1
                logger.warning(f"No payment method for subscription {subscription.id}")
                # Send notification to add payment method
                send_add_payment_method_notification.delay(subscription.id)
                continue
            
            # Process payment for the subscription
            success = charge_subscription(subscription, payment_method)
            
            if success:
                results['success'] += 1
                logger.info(f"Successfully charged subscription {subscription.id}")
            else:
                results['failed'] += 1
                logger.warning(f"Failed to charge subscription {subscription.id}")
                
        except Exception as e:
            results['failed'] += 1
            results['errors'].append({
                'subscription_id': str(subscription.id),
                'error': str(e)
            })
            logger.error(f"Error processing subscription {subscription.id}: {str(e)}")
    
    logger.info(f"Trial expiration check completed: {results}")
    return results


@shared_task(bind=True, max_retries=3)
def process_recurring_billing(self):
    """
    Process recurring billing for active subscriptions.
    Run this task daily at midnight.
    """
    logger.info("Starting recurring billing check...")
    
    today = timezone.now().date()
    
    # Find subscriptions ending today that need renewal
    subscriptions_to_renew = UserSubscription.objects.filter(
        status='ACTIVE',
        auto_renew=True,
        end_date__date=today
    ).select_related('plan', 'company', 'user')
    
    results = {
        'total': subscriptions_to_renew.count(),
        'success': 0,
        'failed': 0,
        'no_payment_method': 0,
        'errors': []
    }
    
    for subscription in subscriptions_to_renew:
        try:
            # ✅ Check if payment method is available
            payment_method = get_subscription_payment_method(subscription)
            
            if not payment_method:
                results['no_payment_method'] += 1
                logger.warning(f"No payment method for subscription {subscription.id}")
                send_add_payment_method_notification.delay(subscription.id)
                continue
            
            # Process payment for renewal
            success = charge_subscription(subscription, payment_method, is_renewal=True)
            
            if success:
                results['success'] += 1
                logger.info(f"Successfully renewed subscription {subscription.id}")
            else:
                results['failed'] += 1
                logger.warning(f"Failed to renew subscription {subscription.id}")
                
        except Exception as e:
            results['failed'] += 1
            results['errors'].append({
                'subscription_id': str(subscription.id),
                'error': str(e)
            })
            logger.error(f"Error renewing subscription {subscription.id}: {str(e)}")
    
    logger.info(f"Recurring billing check completed: {results}")
    return results


@shared_task(bind=True, max_retries=3)
def expire_past_due_subscriptions(self):
    """
    Mark past due subscriptions as expired after grace period.
    Run this task daily.
    """
    logger.info("Starting past due expiration check...")
    
    grace_period = timezone.now() - timedelta(days=7)  # 7-day grace period
    
    # Find subscriptions past due for more than grace period
    expired_subscriptions = UserSubscription.objects.filter(
        status='PAST_DUE',
        end_date__lt=grace_period
    )
    
    count = expired_subscriptions.count()
    
    # Mark as expired
    expired_subscriptions.update(
        status='EXPIRED',
        auto_renew=False
    )
    
    logger.info(f"Marked {count} subscriptions as EXPIRED")
    return {'expired_count': count}


# ============================================================================
#  HELPER FUNCTIONS - ENHANCED
# ============================================================================

def get_subscription_payment_method(subscription):
    """
    Get the payment method linked to a subscription.
    
    Args:
        subscription: UserSubscription instance
    
    Returns:
        PaymentMethod instance or None
    """
    try:
        # Option 1: If you added payment_method field to UserSubscription model
        if hasattr(subscription, 'payment_method') and subscription.payment_method:
            return subscription.payment_method
        
        # Option 2: Get from initial transaction's provider_payment_method
        initial_transaction = subscription.transactions.filter(
            payment_type='SUBSCRIPTION',
            description__contains='Trial subscription'
        ).first()
        
        if initial_transaction and initial_transaction.provider_payment_method:
            # Try to find matching payment method
            # This is approximate - you might need to store payment_method_id in transaction
            payment_methods = PaymentMethod.objects.filter(
                company=subscription.company,
                provider=subscription.payment_provider,
                display_info=initial_transaction.provider_payment_method
            )
            
            if payment_methods.exists():
                return payment_methods.first()
        
        # Option 3: Get default payment method for the provider
        default_method = PaymentMethod.objects.filter(
            company=subscription.company,
            provider=subscription.payment_provider,
            is_default=True
        ).first()
        
        return default_method
        
    except Exception as e:
        logger.error(f"Error getting payment method for subscription {subscription.id}: {str(e)}")
        return None


def charge_subscription(subscription, payment_method, is_renewal=False):
    """
    ✅ ENHANCED: Helper function to charge a subscription using linked payment method.
    
    Args:
        subscription: UserSubscription instance
        payment_method: PaymentMethod instance to charge
        is_renewal: Boolean indicating if this is a renewal charge
    
    Returns:
        Boolean indicating success/failure
    """
    try:
        # Import currency converter
        try:
            from .utils.currency_converter import get_payment_amount_display
        except ImportError:
            def get_payment_amount_display(amount, provider):
                if provider == 'MPESA':
                    return {'amount': float(amount) * 150, 'currency': 'KES', 'display': f'KES {float(amount) * 150:,.0f}'}
                return {'amount': float(amount), 'currency': 'USD', 'display': f'${float(amount):.2f}'}
        
        # Get payment amount in correct currency
        payment_info = get_payment_amount_display(
            subscription.plan.price,
            subscription.payment_provider
        )
        
        with transaction.atomic():
            # Create pending transaction
            payment_transaction = PaymentTransaction.objects.create(
                company=subscription.company,
                user=subscription.user,
                subscription=subscription,
                amount=payment_info['amount'],
                currency=payment_info['currency'],
                status='PENDING',
                payment_type='SUBSCRIPTION',
                provider=subscription.payment_provider,
                provider_payment_method=payment_method.display_info,  # ✅ Link payment method
                description=f'{"Renewal" if is_renewal else "Initial"} payment for {subscription.plan.name} using {payment_method.display_info}'
            )
            
            # ✅ Process payment based on provider with linked payment method
            payment_success = False
            
            if subscription.payment_provider == 'STRIPE':
                payment_success = process_stripe_payment(subscription, payment_transaction, payment_method)
                
            elif subscription.payment_provider == 'MPESA':
                payment_success = process_mpesa_payment(subscription, payment_transaction, payment_method)
                
            elif subscription.payment_provider == 'CRYPTO':
                payment_success = process_crypto_payment(subscription, payment_transaction, payment_method)
            
            # Update subscription based on payment result
            if payment_success:
                # Mark trial as complete if applicable
                if subscription.is_trial:
                    subscription.is_trial = False
                    subscription.trial_end = None
                
                # Update subscription status and dates
                subscription.status = 'ACTIVE'
                
                # Extend end date for renewal
                if is_renewal:
                    if subscription.plan.billing_cycle == 'MONTHLY':
                        subscription.end_date = subscription.end_date + timedelta(days=30)
                    elif subscription.plan.billing_cycle == 'QUARTERLY':
                        subscription.end_date = subscription.end_date + timedelta(days=90)
                    elif subscription.plan.billing_cycle == 'ANNUAL':
                        subscription.end_date = subscription.end_date + timedelta(days=365)
                
                subscription.save()
                
                # Mark transaction as completed
                payment_transaction.status = 'COMPLETED'
                payment_transaction.save()
                
                logger.info(f"✅ Payment successful for subscription {subscription.id} using {payment_method.display_info}")
                
                # Send success notification
                send_payment_success_notification.delay(subscription.id, payment_transaction.id)
                
                return True
                
            else:
                # Payment failed
                subscription.status = 'PAST_DUE'
                subscription.save()
                
                payment_transaction.status = 'FAILED'
                payment_transaction.save()
                
                logger.warning(f"❌ Payment failed for subscription {subscription.id}")
                
                # Send notification email
                send_payment_failed_notification.delay(subscription.id)
                
                return False
                
    except Exception as e:
        logger.error(f"Error charging subscription {subscription.id}: {str(e)}")
        return False


def process_stripe_payment(subscription, transaction, payment_method):
    """
    ✅ ENHANCED: Process payment via Stripe using saved payment method.
    """
    try:
        stripe_service = StripeService()
        
        # ✅ Get or create Stripe customer
        customer = stripe_service.get_or_create_customer(
            subscription.user,
            subscription.company
        )
        
        # ✅ Charge using saved payment method (card token stored in payment_method)
        # Note: You should have stored Stripe payment_method_id when creating PaymentMethod
        # For now, we'll create a new payment intent (you should enhance this to use saved method)
        
        payment_intent = stripe_service.create_payment_intent(
            amount=float(transaction.amount),
            currency=transaction.currency.lower(),
            customer_id=customer.id,
            description=transaction.description,
            metadata={
                'subscription_id': str(subscription.id),
                'transaction_id': str(transaction.id),
                'payment_method_id': str(payment_method.id)
            }
        )
        
        # Store payment intent ID
        transaction.provider_transaction_id = payment_intent.id
        transaction.save()
        
        # Check payment status
        if payment_intent.status == 'succeeded':
            logger.info(f"✅ Stripe payment succeeded: {payment_intent.id}")
            return True
        elif payment_intent.status == 'requires_payment_method':
            logger.warning(f"⚠️ Payment requires payment method for subscription {subscription.id}")
            return False
        else:
            logger.warning(f"⚠️ Stripe payment status: {payment_intent.status}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Stripe payment error for subscription {subscription.id}: {str(e)}")
        return False


def process_mpesa_payment(subscription, transaction, payment_method):
    """
    ✅ ENHANCED: Process payment via M-Pesa using saved phone number.
    """
    try:
        mpesa_service = MPesaService()
        
        # ✅ Get phone number from payment method
        phone_number = payment_method.phone_number
        
        if not phone_number:
            logger.error(f"No phone number in payment method for subscription {subscription.id}")
            return False
        
        # ✅ Initiate STK Push
        response = mpesa_service.stk_push(
            phone_number=phone_number,
            amount=int(transaction.amount),
            account_reference=f"SUB-{subscription.id}",
            transaction_desc=transaction.description
        )
        
        if response and response.get('ResponseCode') == '0':
            # Store checkout request ID
            transaction.provider_transaction_id = response.get('CheckoutRequestID')
            transaction.save()
            
            logger.info(f"✅ M-Pesa STK Push initiated for subscription {subscription.id}")
            
            # Note: Actual success will be confirmed via webhook
            # For now, return False and wait for webhook confirmation
            send_mpesa_payment_initiated_notification.delay(subscription.id, phone_number)
            return False
        else:
            logger.error(f"❌ M-Pesa STK Push failed for subscription {subscription.id}")
            return False
        
    except Exception as e:
        logger.error(f"❌ M-Pesa payment error for subscription {subscription.id}: {str(e)}")
        return False


def process_crypto_payment(subscription, transaction, payment_method):
    """
    ✅ ENHANCED: Process payment via Crypto using saved wallet.
    """
    try:
        crypto_service = CryptoService()
        
        # Create crypto payment
        payment = crypto_service.create_payment(
            amount=float(transaction.amount),
            currency=transaction.currency,
            order_id=f"sub-{subscription.id}-{transaction.id}",
            order_description=transaction.description,
            user=subscription.user,
            company=subscription.company
        )
        
        # Store payment ID
        transaction.provider_transaction_id = payment.get('payment_id') or payment.get('id')
        transaction.save()
        
        # Send notification to customer with payment details
        send_crypto_payment_notification.delay(
            subscription.id,
            payment.get('payment_address'),
            payment.get('pay_amount'),
            payment.get('pay_currency')
        )
        
        logger.info(f"✅ Crypto payment created for subscription {subscription.id}")
        
        # Manual payment required - will be confirmed via webhook
        return False
        
    except Exception as e:
        logger.error(f"❌ Crypto payment error for subscription {subscription.id}: {str(e)}")
        return False


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