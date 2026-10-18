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

class SubscriptionDatesMixin:
    """Shared date computation methods for subscription serializers."""

    def get_days_remaining(self, obj):
        from django.utils import timezone
        if obj.end_date:
            delta = obj.end_date.date() - timezone.now().date()
            return max(0, delta.days)
        return 0

    def get_is_expired(self, obj):
        from django.utils import timezone
        return obj.end_date and obj.end_date < timezone.now()        

class UserSubscriptionListSerializer(SubscriptionDatesMixin, serializers.ModelSerializer):
    """Lightweight serializer for subscription lists."""
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_price = serializers.DecimalField(source='plan.price', max_digits=10, decimal_places=2, read_only=True)
    plan_id = serializers.UUIDField(source='plan.id', read_only=True) 
    company_name = serializers.CharField(source='company.name', read_only=True)
    days_remaining = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSubscription
        fields = [
            'id', 'company_name', 'plan_name', 'plan_price', 'plan_id', 'status',
            'payment_provider', 'start_date', 'end_date', 'is_trial',
            'days_remaining', 'is_expired', 'auto_renew'
        ]
    
class UserSubscriptionDetailSerializer(SubscriptionDatesMixin, serializers.ModelSerializer):
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
    
class MPesaPaymentSerializer(serializers.Serializer):
        """Serializer for M-Pesa payment requests."""
        phone_number = serializers.CharField(
            max_length=15,
            help_text="Phone number in format 254XXXXXXXX or 07XXXXXXXX"
        )
        amount = serializers.DecimalField(
            max_digits=10, 
            decimal_places=2,
            min_value=1,
            help_text="Payment amount in KES"
        )
        account_reference = serializers.CharField(
            max_length=50,
            required=False,
            help_text="Account reference (optional)"
        )
        description = serializers.CharField(
            max_length=200,
            required=False,
            default="LogiFlow Payment",
            help_text="Payment description"
        )

class MPesaStatusCheckSerializer(serializers.Serializer):
    """Serializer for M-Pesa status check requests."""
    checkout_request_id = serializers.CharField(
        max_length=100,
        help_text="Checkout Request ID from STK Push response"
    )

class CreateSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for creating subscriptions with proper currency conversion."""
    plan_id = serializers.UUIDField()
    payment_method_id = serializers.UUIDField(required=False, allow_null=True)
    
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
        """Create subscription with proper company handling and payment method linking."""
        from django.utils import timezone
        from datetime import timedelta
        from django.db import transaction
        
        # ✅ FIX: Extract and remove 'company' from validated_data if it exists
        company = validated_data.pop('company', None)
        
        # Extract other data
        plan = validated_data.pop('plan_id')
        payment_method_id = validated_data.pop('payment_method_id', None)
        
        # Get user and company from context if not provided
        user = self.context['request'].user
        if not company:
            company = user.company
        
        payment_provider = validated_data.get('payment_provider', 'STRIPE')
        
        # ✅ Validate and get payment method if provided
        payment_method = None
        if payment_method_id:
            try:
                payment_method = PaymentMethod.objects.get(
                    id=payment_method_id,
                    company=company,
                    provider=payment_provider
                )
            except PaymentMethod.DoesNotExist:
                raise serializers.ValidationError({
                    'payment_method_id': 'Invalid payment method or does not match selected provider.'
                })
        
        # Import currency converter
        try:
            from .utils.currency_converter import get_payment_amount_display
        except ImportError:
            # Fallback if currency converter not available
            def get_payment_amount_display(amount, provider):
                if provider == 'MPESA':
                    return {'amount': float(amount) * 150, 'currency': 'KES', 'display': f'KES {float(amount) * 150:,.0f}'}
                return {'amount': float(amount), 'currency': 'USD', 'display': f'${float(amount):.2f}'}
        
        with transaction.atomic():
            # Calculate subscription dates
            start_date = timezone.now()
            if plan.billing_cycle == 'MONTHLY':
                end_date = start_date + timedelta(days=30)
            elif plan.billing_cycle == 'QUARTERLY':
                end_date = start_date + timedelta(days=90)
            elif plan.billing_cycle == 'ANNUAL':
                end_date = start_date + timedelta(days=365)
            else:
                end_date = start_date + timedelta(days=30)  # Default to monthly
            
            # Create subscription with explicit company parameter
            subscription = UserSubscription.objects.create(
                company=company,  # Explicitly set
                user=user,
                plan=plan,
                start_date=start_date,
                end_date=end_date,
                is_trial=True,
                trial_end=start_date + timedelta(days=14),  # 14-day trial
                status='TRIALING',
                **validated_data  # Now without 'company', 'plan_id', and 'payment_method_id'
            )
            
            # Get payment amount in correct currency
            payment_info = get_payment_amount_display(
                plan.price, 
                payment_provider
            )
            
            # Build transaction description
            description = f'Trial subscription for {plan.name} - {payment_info["display"]}'
            if payment_method:
                description += f' (Payment method: {payment_method.display_info})'
            
            # Create initial payment transaction record
            transaction_obj = PaymentTransaction.objects.create(
                company=company,
                user=user,
                subscription=subscription,
                amount=payment_info['amount'],
                currency=payment_info['currency'],
                status='COMPLETED',  # Trial is free
                payment_type='SUBSCRIPTION',
                provider=payment_provider,
                description=description
            )
            
            # Link payment method to transaction if provided
            if payment_method:
                # Store payment method reference in transaction
                transaction_obj.provider_payment_method = payment_method.display_info
                transaction_obj.save(update_fields=['provider_payment_method'])
            
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"✅ Created subscription {subscription.id} for {company.name} - Plan: {plan.name}")
            if payment_method:
                logger.info(f"   💳 Linked payment method: {payment_method.display_info} ({payment_method.provider})")

             
            # Example (if you have celery tasks set up):
            # from .tasks import charge_subscription_after_trial
            # charge_subscription_after_trial.apply_async(
            #     args=[str(subscription.id), str(payment_method.id) if payment_method else None],
            #     eta=subscription.trial_end
            # )
            
            # Note: When trial ends, you should:
            # 1. Use the linked payment method to charge the customer
            # 2. Update subscription status based on payment success/failure
            # 3. Send email notification to user
        
        return subscription
            
           
    
class CryptoPaymentSerializer(serializers.Serializer):
    """Serializer for crypto payment requests."""
    amount = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2,
        min_value=1,
        help_text="Payment amount in USD"
    )
    currency = serializers.CharField(
        max_length=3,
        default="USD",
        help_text="Payment currency (USD, EUR, etc.)"
    )
    pay_currency = serializers.CharField(
        max_length=10,
        required=False,
        help_text="Crypto currency to pay in (btc, eth, usdt, etc.) - optional"
    )
    order_description = serializers.CharField(
        max_length=200,
        required=False,
        default="LogiFlow crypto payment",
        help_text="Payment description"
    )

class CryptoStatusCheckSerializer(serializers.Serializer):
    """Serializer for crypto status check requests."""
    payment_id = serializers.CharField(  
        max_length=100,
        help_text="NOWPayments payment ID from payment creation response"
    )