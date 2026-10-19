# apps/payments/billing.py
"""
The one place that changes subscription state and records money.

Rules:
- A company has at most one live subscription (TRIALING, ACTIVE or PAST_DUE). Starting another supersedes it.
- A company gets one free trial, ever.
- Cancelling stops renewal; access continues until the end of the paid period (or trial), then it ends.
- Only real payments are recorded, each once (keyed by the provider's id), and a completed payment for a
  subscription activates it and extends it by one billing cycle.
- Stripe bills its own subscriptions; our scheduled billing only handles M-Pesa and crypto.
"""
import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import PaymentTransaction, UserSubscription

logger = logging.getLogger(__name__)

LIVE = ('TRIALING', 'ACTIVE', 'PAST_DUE')
TRIAL_DAYS = 14
CYCLE_DAYS = {'MONTHLY': 30, 'QUARTERLY': 90, 'ANNUAL': 365}


class BillingError(Exception):
    """A billing step that isn't allowed; the message is shown to the user."""


def cycle_length(plan):
    return timedelta(days=CYCLE_DAYS.get(plan.billing_cycle, 30))


def live_subscription(company):
    return (UserSubscription.objects.filter(company=company, status__in=LIVE)
            .select_related('plan').order_by('-created_at').first())


def trial_available(company):
    return not UserSubscription.objects.filter(company=company).exists()


def provider_amount(plan, provider):
    """What to charge for a plan with a provider: KES for M-Pesa, USD otherwise."""
    import math
    from .utils.currency_converter import get_payment_amount_display
    info = get_payment_amount_display(plan.price, provider)
    if info['currency'] == 'KES':
        # M-Pesa charges whole shillings; round up so the shown price is exactly what's charged
        return math.ceil(info['amount']), 'KES'
    return info['amount'], info['currency']


# --- Stripe calls (kept here so tests can patch one place) -------------------

def _stripe():
    import stripe
    from django.conf import settings
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def stripe_set_cancel_at_period_end(subscription, cancel):
    if subscription.payment_provider == 'STRIPE' and subscription.provider_subscription_id:
        _stripe().Subscription.modify(subscription.provider_subscription_id, cancel_at_period_end=cancel)


def stripe_cancel_now(subscription):
    if subscription.payment_provider == 'STRIPE' and subscription.provider_subscription_id:
        _stripe().Subscription.cancel(subscription.provider_subscription_id)


# --- subscription lifecycle ---------------------------------------------------

def _supersede(company, keep=None):
    """End any other live subscription of the company (a new plan replaces it)."""
    for old in UserSubscription.objects.filter(company=company, status__in=LIVE).exclude(pk=getattr(keep, 'pk', None)):
        try:
            stripe_cancel_now(old)
        except Exception as exc:  # the new plan must still go through; log for follow-up
            logger.error('Could not cancel superseded Stripe subscription %s: %s', old.provider_subscription_id, exc)
        old.status = 'CANCELLED'
        old.auto_renew = False
        old.end_date = min(old.end_date, timezone.now())
        old.save(update_fields=['status', 'auto_renew', 'end_date', 'updated_at'])


def start_local_trial(company, user, plan, provider):
    """M-Pesa / crypto: a free trial now, charged by our scheduled billing when it ends."""
    if provider not in ('MPESA', 'CRYPTO'):
        raise BillingError('Card subscriptions start through Stripe checkout.')
    with transaction.atomic():
        if not trial_available(company):
            if live_subscription(company):
                raise BillingError('You already have a subscription. Change plan from the billing page instead.')
            raise BillingError('Your free trial has been used. Choose a plan and pay to continue.')
        now = timezone.now()
        trial_end = now + timedelta(days=TRIAL_DAYS)
        return UserSubscription.objects.create(
            company=company, user=user, plan=plan, status='TRIALING', payment_provider=provider,
            start_date=now, end_date=trial_end, trial_end=trial_end, is_trial=True, auto_renew=True,
        )


def start_paid_local(company, user, plan, provider):
    """M-Pesa / crypto without a trial: created as past due until its first payment arrives."""
    with transaction.atomic():
        now = timezone.now()
        sub = UserSubscription.objects.create(
            company=company, user=user, plan=plan, status='PAST_DUE', payment_provider=provider,
            start_date=now, end_date=now, is_trial=False, auto_renew=True,
        )
        return sub


def cancel(subscription):
    """Stop renewal; access continues until the end of the current period."""
    if subscription.status not in LIVE:
        raise BillingError('This subscription has already ended.')
    if not subscription.auto_renew:
        raise BillingError('This subscription is already set to end.')
    stripe_set_cancel_at_period_end(subscription, True)
    if subscription.status == 'PAST_DUE':
        # Nothing paid for the current period: end it now
        subscription.status = 'CANCELLED'
        subscription.end_date = timezone.now()
    subscription.auto_renew = False
    subscription.save()
    return subscription


def resume(subscription):
    """Undo a cancellation before the period ends."""
    if subscription.status not in ('TRIALING', 'ACTIVE') or subscription.end_date <= timezone.now():
        raise BillingError('This subscription has ended. Choose a plan to subscribe again.')
    if subscription.auto_renew:
        raise BillingError('This subscription is already renewing.')
    stripe_set_cancel_at_period_end(subscription, False)
    subscription.auto_renew = True
    subscription.save()
    return subscription


def end_finished_subscriptions(now=None):
    """Subscriptions set not to renew whose period is over are ended. Returns how many."""
    now = now or timezone.now()
    ended = UserSubscription.objects.filter(status__in=('TRIALING', 'ACTIVE'), auto_renew=False, end_date__lte=now)
    return ended.update(status='CANCELLED')


# --- payments -----------------------------------------------------------------

def record_payment(*, company, user, provider, provider_transaction_id, amount, currency, status,
                   subscription=None, payment_type='SUBSCRIPTION', description='', receipt_url='', invoice_number=''):
    """
    Record a payment once per provider id. Returns (transaction, created). A repeat with the same id updates
    the status only when moving forward (PENDING → COMPLETED/FAILED), and never downgrades a completed payment.
    """
    with transaction.atomic():
        existing = (PaymentTransaction.objects.select_for_update()
                    .filter(provider=provider, provider_transaction_id=provider_transaction_id).first())
        if existing:
            if existing.status == 'PENDING' and status != 'PENDING':
                existing.status = status
                existing.receipt_url = receipt_url or existing.receipt_url
                existing.invoice_number = invoice_number or existing.invoice_number
                existing.save()
                if status == 'COMPLETED':
                    apply_completed_payment(existing)
            return existing, False
        tx = PaymentTransaction.objects.create(
            company=company, user=user, subscription=subscription, provider=provider,
            provider_transaction_id=provider_transaction_id, amount=amount, currency=currency, status=status,
            payment_type=payment_type, description=description, receipt_url=receipt_url, invoice_number=invoice_number,
        )
        if status == 'COMPLETED':
            apply_completed_payment(tx)
        return tx, True


def apply_completed_payment(tx):
    """A subscription payment came through: activate it and extend it by one cycle."""
    sub = tx.subscription
    if not sub or tx.payment_type != 'SUBSCRIPTION':
        return
    sub = UserSubscription.objects.select_for_update().select_related('plan').get(pk=sub.pk)
    if sub.payment_provider == 'STRIPE':
        # Stripe tells us the period itself (subscription.updated); just make sure it's active
        if sub.status in ('PAST_DUE', 'UNPAID'):
            sub.status = 'ACTIVE'
            sub.save(update_fields=['status', 'updated_at'])
        return
    now = timezone.now()
    base = max(now, sub.end_date) if sub.status in ('ACTIVE', 'TRIALING') else now
    sub.end_date = base + cycle_length(sub.plan)
    sub.status = 'ACTIVE'
    sub.is_trial = False
    sub.trial_end = None
    sub.save()
    _supersede(sub.company, keep=sub)


def mark_payment_failed(tx, reason=''):
    """A pending payment failed; a subscription that was due becomes past due."""
    with transaction.atomic():
        tx = PaymentTransaction.objects.select_for_update().get(pk=tx.pk)
        if tx.status != 'PENDING':
            return tx
        tx.status = 'FAILED'
        if reason:
            tx.description = f'{tx.description} ({reason})'.strip()
        tx.save()
        sub = tx.subscription
        if sub and sub.status in ('TRIALING', 'ACTIVE') and sub.end_date <= timezone.now():
            sub.status = 'PAST_DUE'
            sub.save(update_fields=['status', 'updated_at'])
        return tx


def subscriptions_due(now=None):
    """M-Pesa / crypto subscriptions whose period (or trial) has ended and that should renew."""
    now = now or timezone.now()
    return (UserSubscription.objects.filter(status__in=('TRIALING', 'ACTIVE'), auto_renew=True, end_date__lte=now)
            .exclude(payment_provider='STRIPE').select_related('plan', 'company', 'user'))
