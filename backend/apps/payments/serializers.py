# apps/payments/serializers.py
import re

from django.utils import timezone
from rest_framework import serializers

from . import billing
from .billing import LIVE
from .models import PaymentMethod, PaymentTransaction, SubscriptionPlan, UserSubscription


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'description', 'price', 'billing_cycle', 'features',
            'is_active', 'max_users', 'max_warehouses', 'max_products',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


def normalize_kenyan_phone(value):
    """07XX / 01XX / +2547XX / 2547XX → 2547XXXXXXXX (or 2541…); raises on anything else."""
    digits = re.sub(r'\D', '', value or '')
    if digits.startswith('0') and len(digits) == 10:
        digits = '254' + digits[1:]
    elif len(digits) == 9 and digits[0] in '71':
        digits = '254' + digits
    if not re.fullmatch(r'254[17]\d{8}', digits):
        raise serializers.ValidationError('Enter a Safaricom number like 0712 345 678.')
    return digits


class PaymentMethodSerializer(serializers.ModelSerializer):
    """
    M-Pesa numbers and crypto preferences are added here. Cards are only added through Stripe (setup checkout),
    so card details are read-only.
    """
    display_info = serializers.SerializerMethodField()

    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'type', 'provider', 'last_four', 'expiry_month', 'expiry_year',
            'card_brand', 'phone_number', 'wallet_address', 'currency',
            'is_default', 'display_info', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'provider', 'last_four', 'expiry_month', 'expiry_year', 'card_brand',
                            'is_default', 'created_at', 'updated_at']

    def get_display_info(self, obj):
        if obj.type == 'CARD':
            return f"{obj.card_brand or 'Card'} •••• {obj.last_four}"
        if obj.type == 'MPESA':
            return f"M-Pesa {obj.phone_number}"
        if obj.type == 'CRYPTO':
            return f"{(obj.currency or 'Crypto').upper()} wallet"
        return '—'

    def validate(self, attrs):
        kind = attrs.get('type', getattr(self.instance, 'type', None))
        if self.instance is not None and 'type' in attrs and attrs['type'] != self.instance.type:
            raise serializers.ValidationError({'type': 'A payment method’s type can’t be changed.'})
        if kind == 'CARD':
            raise serializers.ValidationError({'type': 'Cards are added securely through Stripe. Use “Add card”.'})
        if kind == 'MPESA':
            attrs['phone_number'] = normalize_kenyan_phone(attrs.get('phone_number', getattr(self.instance, 'phone_number', '')))
            attrs['provider'] = 'MPESA'
        elif kind == 'CRYPTO':
            currency = (attrs.get('currency') or getattr(self.instance, 'currency', '') or '').strip().lower()
            if not currency:
                raise serializers.ValidationError({'currency': 'Choose the coin you’ll pay with (e.g. USDT).'})
            attrs['currency'] = currency
            attrs['provider'] = 'CRYPTO'
        return attrs


class PaymentTransactionSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    plan_name = serializers.CharField(source='subscription.plan.name', read_only=True, default=None)

    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'company_name', 'user_email', 'amount', 'currency', 'status',
            'payment_type', 'provider', 'provider_transaction_id',
            'provider_payment_method', 'description', 'receipt_url',
            'invoice_number', 'plan_name', 'created_at', 'updated_at'
        ]
        read_only_fields = fields


class SubscriptionStateMixin:
    """Shared, derived fields for subscription serializers."""

    def get_days_remaining(self, obj):
        if obj.end_date:
            return max(0, (obj.end_date.date() - timezone.now().date()).days)
        return 0

    def get_is_expired(self, obj):
        return bool(obj.end_date and obj.end_date < timezone.now())

    def get_cancels_at_period_end(self, obj):
        return obj.status in ('TRIALING', 'ACTIVE') and not obj.auto_renew

    def get_next_payment(self, obj):
        """What will be charged and when, if it renews."""
        if obj.status not in LIVE or not obj.auto_renew:
            return None
        amount, currency = billing.provider_amount(obj.plan, obj.payment_provider)
        return {'amount': amount, 'currency': currency, 'date': obj.end_date}


class UserSubscriptionListSerializer(SubscriptionStateMixin, serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_price = serializers.DecimalField(source='plan.price', max_digits=10, decimal_places=2, read_only=True)
    plan_id = serializers.UUIDField(source='plan.id', read_only=True)
    billing_cycle = serializers.CharField(source='plan.billing_cycle', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    days_remaining = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    cancels_at_period_end = serializers.SerializerMethodField()
    next_payment = serializers.SerializerMethodField()

    class Meta:
        model = UserSubscription
        fields = [
            'id', 'company_name', 'plan_name', 'plan_price', 'plan_id', 'billing_cycle', 'status',
            'payment_provider', 'start_date', 'end_date', 'trial_end', 'is_trial',
            'days_remaining', 'is_expired', 'auto_renew', 'cancels_at_period_end', 'next_payment', 'created_at'
        ]
        read_only_fields = fields


class UserSubscriptionDetailSerializer(UserSubscriptionListSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    recent_transactions = serializers.SerializerMethodField()

    class Meta(UserSubscriptionListSerializer.Meta):
        fields = UserSubscriptionListSerializer.Meta.fields + ['plan', 'user_email', 'recent_transactions', 'updated_at']
        read_only_fields = fields

    def get_recent_transactions(self, obj):
        return PaymentTransactionSerializer(obj.transactions.order_by('-created_at')[:5], many=True).data


class CreateSubscriptionSerializer(serializers.Serializer):
    """M-Pesa / crypto subscriptions. Cards go through Stripe checkout instead."""
    plan_id = serializers.PrimaryKeyRelatedField(queryset=SubscriptionPlan.objects.filter(is_active=True), source='plan')
    payment_provider = serializers.ChoiceField(choices=['MPESA', 'CRYPTO'])
    pay_now = serializers.BooleanField(default=False, help_text='Skip the free trial and pay for the first period now.')


class MPesaPaymentSerializer(serializers.Serializer):
    """Pay for a subscription with M-Pesa. The amount comes from the plan, not from the request."""
    subscription_id = serializers.UUIDField(required=False)
    phone_number = serializers.CharField(max_length=20, required=False)

    def validate_phone_number(self, value):
        return normalize_kenyan_phone(value)


class MPesaStatusCheckSerializer(serializers.Serializer):
    checkout_request_id = serializers.CharField(max_length=100)


class CryptoPaymentSerializer(serializers.Serializer):
    """Pay for a subscription in crypto. The amount comes from the plan, not from the request."""
    subscription_id = serializers.UUIDField(required=False)
    pay_currency = serializers.CharField(max_length=10, required=False)


class CryptoStatusCheckSerializer(serializers.Serializer):
    payment_id = serializers.CharField(max_length=100)
