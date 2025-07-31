# apps/payments/serializers.py
from rest_framework import serializers
from .models import SubscriptionPlan, UserSubscription, PaymentTransaction, PaymentMethod

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for SubscriptionPlan model."""
    
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'description', 'price', 'billing_cycle', 'features',
            'is_active', 'max_users', 'max_warehouses', 'max_products',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class PaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer for PaymentMethod model."""
    display_info = serializers.SerializerMethodField()
    
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'type', 'provider', 'last_four', 'expiry_month', 'expiry_year',
            'card_brand', 'phone_number', 'wallet_address', 'currency',
            'is_default', 'display_info', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_display_info(self, obj):
        if obj.type == 'CARD':
            return f"{obj.card_brand} ****{obj.last_four}"
        elif obj.type == 'MPESA':
            return obj.phone_number
        elif obj.type == 'CRYPTO':
            return f"{obj.currency} wallet"
        return "-"

class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Serializer for PaymentTransaction model."""
    company_name = serializers.CharField(source='company.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'company_name', 'user_email', 'amount', 'currency', 'status',
            'payment_type', 'provider', 'provider_transaction_id', 
            'provider_payment_method', 'description', 'receipt_url',
            'invoice_number', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company_name', 'user_email', 'created_at', 'updated_at']

class UserSubscriptionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for subscription lists."""
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_price = serializers.DecimalField(source='plan.price', max_digits=10, decimal_places=2, read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    days_remaining = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSubscription
        fields = [
            'id', 'company_name', 'plan_name', 'plan_price', 'status',
            'payment_provider', 'start_date', 'end_date', 'is_trial',
            'days_remaining', 'is_expired', 'auto_renew'
        ]
    
    def get_days_remaining(self, obj):
        from django.utils import timezone
        if obj.end_date:
            delta = obj.end_date.date() - timezone.now().date()
            return max(0, delta.days)
        return 0
    
    def get_is_expired(self, obj):
        from django.utils import timezone
        return obj.end_date and obj.end_date < timezone.now()

class UserSubscriptionDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for UserSubscription model."""
    plan = SubscriptionPlanSerializer(read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    recent_transactions = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSubscription
        fields = [
            'id', 'company_name', 'user_email', 'plan', 'status', 'payment_provider',
            'start_date', 'end_date', 'trial_end', 'auto_renew', 'is_trial',
            'recent_transactions', 'days_remaining', 'is_expired', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_recent_transactions(self, obj):
        transactions = obj.transactions.all()[:5]
        return PaymentTransactionSerializer(transactions, many=True).data
    
    def get_days_remaining(self, obj):
        from django.utils import timezone
        if obj.end_date:
            delta = obj.end_date.date() - timezone.now().date()
            return max(0, delta.days)
        return 0
    
    def get_is_expired(self, obj):
        from django.utils import timezone
        return obj.end_date and obj.end_date < timezone.now()

class CreateSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for creating subscriptions."""
    plan_id = serializers.UUIDField()
    payment_method_id = serializers.UUIDField(required=False)
    
    class Meta:
        model = UserSubscription
        fields = [
            'plan_id', 'payment_provider', 'payment_method_id', 'auto_renew'
        ]
    
    def validate_plan_id(self, value):
        try:
            return SubscriptionPlan.objects.get(id=value, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError("Active subscription plan not found.")
    
    def create(self, validated_data):
        from django.utils import timezone
        from datetime import timedelta
        from django.db import transaction
        
        plan = validated_data.pop('plan_id')
        user = self.context['request'].user
        company = user.company
        
        with transaction.atomic():
            # Calculate subscription dates
            start_date = timezone.now()
            if plan.billing_cycle == 'MONTHLY':
                end_date = start_date + timedelta(days=30)
            elif plan.billing_cycle == 'QUARTERLY':
                end_date = start_date + timedelta(days=90)
            elif plan.billing_cycle == 'ANNUAL':
                end_date = start_date + timedelta(days=365)
            
            # Create subscription
            subscription = UserSubscription.objects.create(
                company=company,
                user=user,
                plan=plan,
                start_date=start_date,
                end_date=end_date,
                is_trial=True,
                trial_end=start_date + timedelta(days=14),  # 14-day trial
                **validated_data
            )
            
            # Create initial payment transaction record
            PaymentTransaction.objects.create(
                company=company,
                user=user,
                subscription=subscription,
                amount=0 if subscription.is_trial else plan.price,
                currency='USD',
                status='COMPLETED' if subscription.is_trial else 'PENDING',
                payment_type='SUBSCRIPTION',
                provider=subscription.payment_provider,
                description=f'{"Trial subscription" if subscription.is_trial else "Initial subscription payment"} for plan {plan.name}'
            )
            
            # Set up recurring billing with payment provider
            if not subscription.is_trial:
                try:
                    # TODO: Replace with actual payment provider integration
                    provider_subscription_id = f"sub_{subscription.id}_{plan.id}"
                    subscription.provider_subscription_id = provider_subscription_id
                    subscription.save()
                    
                    # Example integrations:
                    # STRIPE: stripe.Subscription.create(customer=customer_id, items=[{'price': plan.stripe_price_id}])
                    # MPESA: Schedule recurring STK push requests
                    # CRYPTO: Set up wallet monitoring for recurring payments
                    
                except Exception as e:
                    # If provider setup fails, mark subscription as failed
                    subscription.status = 'UNPAID'
                    subscription.save()
                    
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to set up recurring billing for subscription {subscription.id}: {e}")
        
        return subscription