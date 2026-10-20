# apps/payments/stripe_flow.py
"""Stripe Checkout results, shared by the success endpoint and the webhook so both do exactly the same thing."""
import logging
from datetime import datetime, timezone as dt_timezone

from django.db import transaction

from . import billing
from .billing import _supersede, record_payment
from .models import PaymentMethod, SubscriptionPlan, UserSubscription

logger = logging.getLogger(__name__)

STATUS_MAP = {
    'active': 'ACTIVE', 'trialing': 'TRIALING', 'past_due': 'PAST_DUE', 'unpaid': 'UNPAID',
    'canceled': 'CANCELLED', 'incomplete_expired': 'EXPIRED', 'incomplete': 'PAST_DUE',
}


def _ts(value):
    return datetime.fromtimestamp(value, tz=dt_timezone.utc) if value else None


def _get(obj, key, default=None):
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def customer_id_for(company):
    """The company's existing Stripe customer, if we've seen one."""
    sub = (UserSubscription.objects.filter(company=company, payment_provider='STRIPE')
           .exclude(provider_customer_id='').order_by('-created_at').first())
    if sub:
        return sub.provider_customer_id
    card = PaymentMethod.objects.filter(company=company, provider='STRIPE').exclude(provider_customer_id='').first()
    return card.provider_customer_id if card else None


def ensure_customer(company, user):
    existing = customer_id_for(company)
    if existing:
        return existing
    customer = billing._stripe().Customer.create(
        email=user.email, name=company.name,
        metadata={'company_id': str(company.id), 'user_id': str(user.id)},
    )
    return customer.id


def sync_subscription(stripe_sub, local=None):
    """Copy status, period and cancel-at-period-end from a Stripe subscription onto ours."""
    local = local or UserSubscription.objects.filter(provider_subscription_id=_get(stripe_sub, 'id')).first()
    if local is None:
        return None
    status = STATUS_MAP.get(_get(stripe_sub, 'status'))
    if status:
        local.status = status
    items = _get(_get(stripe_sub, 'items'), 'data') or []
    period_end = _get(stripe_sub, 'current_period_end') or (items and _get(items[0], 'current_period_end'))
    period_start = _get(stripe_sub, 'current_period_start') or (items and _get(items[0], 'current_period_start'))
    if period_end:
        local.end_date = _ts(period_end)
    if period_start:
        local.start_date = _ts(period_start)
    trial_end = _ts(_get(stripe_sub, 'trial_end'))
    local.trial_end = trial_end
    local.is_trial = local.status == 'TRIALING'
    local.auto_renew = not _get(stripe_sub, 'cancel_at_period_end', False)
    local.save()
    return local


def complete_subscription_checkout(session, user=None):
    """
    A subscription Checkout Session finished: create (or update) our subscription from it, replace any other
    live subscription, and record the first payment once. Returns the subscription.
    """
    metadata = _get(session, 'metadata') or {}
    plan = SubscriptionPlan.objects.get(id=metadata.get('plan_id'))
    from apps.tenants.models import Company
    from apps.users.models import User
    company = Company.objects.get(id=metadata.get('company_id'))
    user = user or User.objects.filter(id=metadata.get('user_id')).first()

    stripe_sub = _get(session, 'subscription')
    if isinstance(stripe_sub, str):
        stripe_sub = billing._stripe().Subscription.retrieve(stripe_sub)
    customer = _get(session, 'customer')
    customer_id = customer if isinstance(customer, str) else _get(customer, 'id', '')

    with transaction.atomic():
        sub, _ = UserSubscription.objects.select_for_update().get_or_create(
            provider_subscription_id=_get(stripe_sub, 'id'),
            defaults={
                'company': company, 'user': user, 'plan': plan, 'payment_provider': 'STRIPE',
                'provider_customer_id': customer_id, 'status': 'TRIALING',
                'start_date': _ts(_get(stripe_sub, 'current_period_start')) or datetime.now(dt_timezone.utc),
                'end_date': _ts(_get(stripe_sub, 'current_period_end')) or datetime.now(dt_timezone.utc),
            },
        )
        sync_subscription(stripe_sub, sub)
        _supersede(company, keep=sub)

        invoice = _get(session, 'invoice')
        invoice_id = invoice if isinstance(invoice, str) else _get(invoice, 'id')
        amount = (_get(session, 'amount_total') or 0) / 100
        if invoice_id and amount > 0:
            record_payment(
                company=company, user=user, provider='STRIPE', provider_transaction_id=invoice_id,
                amount=amount, currency=(_get(session, 'currency') or 'usd').upper(), status='COMPLETED',
                subscription=sub, description=f'{plan.name} subscription',
            )
    return sub


def save_card_from_setup(session, user=None):
    """A setup-mode Checkout Session finished: store the saved card (once). Returns the PaymentMethod."""
    stripe = billing._stripe()
    metadata = _get(session, 'metadata') or {}
    from apps.tenants.models import Company
    from apps.users.models import User
    company = Company.objects.get(id=metadata.get('company_id'))
    user = user or User.objects.filter(id=metadata.get('user_id')).first()

    setup_intent = _get(session, 'setup_intent')
    if isinstance(setup_intent, str):
        setup_intent = stripe.SetupIntent.retrieve(setup_intent)
    pm = _get(setup_intent, 'payment_method')
    if isinstance(pm, str):
        pm = stripe.PaymentMethod.retrieve(pm)
    card = _get(pm, 'card') or {}
    customer = _get(session, 'customer')
    customer_id = customer if isinstance(customer, str) else _get(customer, 'id', '')

    with transaction.atomic():
        method, created = PaymentMethod.objects.get_or_create(
            company=company, provider='STRIPE', provider_payment_method_id=_get(pm, 'id'),
            defaults={
                'user': user, 'type': 'CARD', 'provider_customer_id': customer_id,
                'card_brand': (_get(card, 'brand') or '').title(), 'last_four': _get(card, 'last4') or '',
                'expiry_month': str(_get(card, 'exp_month') or '').zfill(2), 'expiry_year': str(_get(card, 'exp_year') or ''),
            },
        )
        if created and not PaymentMethod.objects.filter(company=company, is_default=True).exclude(pk=method.pk).exists():
            method.is_default = True
            method.save(update_fields=['is_default'])
    return method
