# apps/payments/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubscriptionPlanViewSet, UserSubscriptionViewSet, 
    PaymentTransactionViewSet, PaymentMethodViewSet, 
    test_stripe_connection,
)
from .webhooks import StripeWebhookView

router = DefaultRouter()
router.register(r'plans', SubscriptionPlanViewSet, basename='subscriptionplan')
router.register(r'subscriptions', UserSubscriptionViewSet, basename='usersubscription')
router.register(r'transactions', PaymentTransactionViewSet, basename='paymenttransaction')
router.register(r'payment-methods', PaymentMethodViewSet, basename='paymentmethod')

urlpatterns = [
    path('', include(router.urls)),
    path('test-stripe/', test_stripe_connection, name='test_stripe'),  
    path('webhooks/stripe/', StripeWebhookView.as_view(), name='stripe_webhook'),

]