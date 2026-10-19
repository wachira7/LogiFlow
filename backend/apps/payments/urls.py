# apps/payments/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ( SubscriptionPlanViewSet, UserSubscriptionViewSet, PaymentTransactionViewSet, PaymentMethodViewSet, 
                     MPesaCallbackView, MPesaResultView, MPesaTimeoutView, CryptoCallbackView,
                    stripe_checkout_success, test_stripe_connection,test_mpesa_connection, test_crypto_connection, initiate_mpesa_payment, 
                    check_mpesa_status, create_crypto_payment, check_crypto_status,get_supported_crypto_currencies,
                    create_stripe_checkout_session, create_stripe_setup_session, stripe_checkout_success, get_exchange_rate_view,
                    complete_stripe_setup )
from .webhooks import StripeWebhookView


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
    
    #Stripe payment endpoints
    path('stripe/setup/', create_stripe_setup_session, name='stripe_setup'),
    path('stripe/setup/complete/', complete_stripe_setup, name='stripe_setup_complete'),
    path('stripe/checkout/', create_stripe_checkout_session, name='stripe_checkout'),
    path('stripe/checkout/success/', stripe_checkout_success, name='stripe_checkout_success'),

    # Stripe webhooks
    path('webhooks/stripe/', StripeWebhookView.as_view(), name='stripe_webhook'),
    
    # M-Pesa payment endpoints
    path('mpesa/pay/', initiate_mpesa_payment, name='mpesa_pay'),
    path('mpesa/status/', check_mpesa_status, name='mpesa_status'),
    
    # Crypto payment endpoints
    path('crypto/pay/', create_crypto_payment, name='crypto_pay'),
    path('crypto/status/', check_crypto_status, name='crypto_status'),
    path('crypto/currencies/', get_supported_crypto_currencies, name='crypto_currencies'),
    
    # M-Pesa callbacks
    path('callbacks/mpesa/', MPesaCallbackView.as_view(), name='mpesa_callback'),
    path('callbacks/mpesa/result/', MPesaResultView.as_view(), name='mpesa_result'),
    path('callbacks/mpesa/timeout/', MPesaTimeoutView.as_view(), name='mpesa_timeout'),
    
    # Crypto callbacks
    path('callbacks/crypto/', CryptoCallbackView.as_view(), name='crypto_callback'),

    # Exchange rate endpoint
    path('exchange-rate/', get_exchange_rate_view, name='exchange_rate'),
]
