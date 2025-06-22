import uuid
from django.db import models
from utils.mixins import TimeStampedModel


class SubscriptionPlan(TimeStampedModel):
    """
    Subscription plans model - matches 'subscription_plans' table
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    BILLING_CYCLE_CHOICES = [
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly'),
        ('ANNUAL', 'Annual'),
    ]
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CYCLE_CHOICES)
    features = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    stripe_price_id = models.CharField(max_length=100, blank=True)
    max_users = models.PositiveIntegerField(default=1)
    max_warehouses = models.PositiveIntegerField(default=1)
    max_products = models.PositiveIntegerField(default=100)
    
    class Meta:
        db_table = 'subscription_plans'
        verbose_name = 'Subscription Plan'
        verbose_name_plural = 'Subscription Plans'
    
    def __str__(self):
        return f"{self.name} - {self.billing_cycle}"


class UserSubscription(TimeStampedModel):
    """
    User subscriptions model - matches 'user_subscriptions' table
    """
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='subscriptions')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='created_subscriptions')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE, related_name='subscriptions')
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('PAST_DUE', 'Past Due'),
        ('CANCELLED', 'Cancelled'),
        ('TRIALING', 'Trialing'),
        ('UNPAID', 'Unpaid'),
        ('EXPIRED', 'Expired'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='TRIALING')
    
    PAYMENT_PROVIDER_CHOICES = [
        ('STRIPE', 'Stripe'),
        ('MPESA', 'M-Pesa'),
        ('CRYPTO', 'Crypto'),
    ]
    payment_provider = models.CharField(max_length=20, choices=PAYMENT_PROVIDER_CHOICES, default='STRIPE')
    provider_subscription_id = models.CharField(max_length=200, blank=True)
    provider_customer_id = models.CharField(max_length=200, blank=True)
    
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    trial_end = models.DateTimeField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)
    is_trial = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'user_subscriptions'
        verbose_name = 'User Subscription'
        verbose_name_plural = 'User Subscriptions'
    
    def __str__(self):
        return f"{self.company.name} - {self.plan.name}"


class PaymentTransaction(TimeStampedModel):
    """
    Payment transactions model - matches 'payment_transactions' table
    """
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='transactions')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='transactions')
    subscription = models.ForeignKey(
        UserSubscription, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='transactions'
    )
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    
    PAYMENT_TYPE_CHOICES = [
        ('SUBSCRIPTION', 'Subscription'),
        ('ONE_TIME', 'One Time'),
    ]
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES)
    
    PROVIDER_CHOICES = [
        ('STRIPE', 'Stripe'),
        ('MPESA', 'M-Pesa'),
        ('CRYPTO', 'Crypto'),
    ]
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    provider_transaction_id = models.CharField(max_length=200, blank=True)
    provider_payment_method = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    receipt_url = models.URLField(blank=True)
    invoice_number = models.CharField(max_length=100, blank=True)
    
    class Meta:
        db_table = 'payment_transactions'
        verbose_name = 'Payment Transaction'
        verbose_name_plural = 'Payment Transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.company.name} - {self.amount} {self.currency}"


class PaymentMethod(TimeStampedModel):
    """
    Payment methods model - matches 'payment_methods' table
    """
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='payment_methods')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='payment_methods')
    
    TYPE_CHOICES = [
        ('CARD', 'Card'),
        ('MPESA', 'M-Pesa'),
        ('CRYPTO', 'Crypto'),
    ]
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    
    PROVIDER_CHOICES = [
        ('STRIPE', 'Stripe'),
        ('MPESA', 'M-Pesa'),
        ('CRYPTO', 'Crypto'),
    ]
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    
    # Card details
    last_four = models.CharField(max_length=4, blank=True)
    expiry_month = models.CharField(max_length=2, blank=True)
    expiry_year = models.CharField(max_length=4, blank=True)
    card_brand = models.CharField(max_length=20, blank=True)
    
    # M-Pesa details
    phone_number = models.CharField(max_length=20, blank=True)
    
    # Crypto details
    wallet_address = models.CharField(max_length=200, blank=True)
    currency = models.CharField(max_length=10, blank=True)
    
    provider_payment_method_id = models.CharField(max_length=200, blank=True)
    is_default = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'payment_methods'
        verbose_name = 'Payment Method'
        verbose_name_plural = 'Payment Methods'
    
    def __str__(self):
        if self.type == 'CARD':
            return f"{self.card_brand} ending in {self.last_four}"
        elif self.type == 'MPESA':
            return f"M-Pesa {self.phone_number}"
        elif self.type == 'CRYPTO':
            return f"Crypto {self.currency}"
        return f"{self.type} payment method"