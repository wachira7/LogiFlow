# apps/payments/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ( SubscriptionPlanViewSet, UserSubscriptionViewSet, PaymentTransactionViewSet, PaymentMethodViewSet, test_stripe_connection,test_mpesa_connection, test_crypto_connection, initiate_mpesa_payment, check_mpesa_status,
                    create_crypto_payment, check_crypto_status)
from .webhooks import StripeWebhookView
from .views import MPesaCallbackView, MPesaResultView, MPesaTimeoutView, CryptoCallbackView

router = DefaultRouter()
router.register(r'plans', SubscriptionPlanViewSet, basename='subscriptionplan')
router.register(r'subscriptions', UserSubscriptionViewSet, basename='usersubscription')
router.register(r'transactions', PaymentTransactionViewSet, basename='paymenttransaction')
router.register(r'payment-methods', PaymentMethodViewSet, basename='paymentmethod')

urlpatterns = [
    path('', include(router.urls)),
     # Testing endpoints
    path('test-stripe/', test_stripe_connection, name='test_stripe'),
    path('test-mpesa/', test_mpesa_connection, name='test_mpesa'),
    path('test-crypto/', test_crypto_connection, name='test_crypto'),
    
    # Stripe webhooks
    path('webhooks/stripe/', StripeWebhookView.as_view(), name='stripe_webhook'),
    
    # M-Pesa payment endpoints
    path('mpesa/pay/', initiate_mpesa_payment, name='mpesa_pay'),
    path('mpesa/status/', check_mpesa_status, name='mpesa_status'),
    
    # Crypto payment endpoints
    path('crypto/pay/', create_crypto_payment, name='crypto_pay'),
    path('crypto/status/', check_crypto_status, name='crypto_status'),
    
    # M-Pesa callbacks
    path('callbacks/mpesa/', MPesaCallbackView.as_view(), name='mpesa_callback'),
    path('callbacks/mpesa/result/', MPesaResultView.as_view(), name='mpesa_result'),
    path('callbacks/mpesa/timeout/', MPesaTimeoutView.as_view(), name='mpesa_timeout'),
    
    # Crypto callbacks
    path('callbacks/crypto/', CryptoCallbackView.as_view(), name='crypto_callback'),
]
