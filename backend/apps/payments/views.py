# apps/payments/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes as api_permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from .providers.stripe import StripeService
from django.db import transaction
from django.db.models import Q, Sum, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils.decorators import method_decorator
from django.views import View
from django.http import HttpResponse, JsonResponse
from drf_spectacular.utils import extend_schema
from .serializers import MPesaPaymentSerializer, MPesaStatusCheckSerializer, CryptoPaymentSerializer, CryptoStatusCheckSerializer
import json
import logging
from .models import SubscriptionPlan, UserSubscription, PaymentTransaction, PaymentMethod
from .serializers import (
    SubscriptionPlanSerializer, UserSubscriptionListSerializer, 
    UserSubscriptionDetailSerializer, CreateSubscriptionSerializer,
    PaymentTransactionSerializer, PaymentMethodSerializer
)
from utils.mixins import TenantViewSetMixin, BulkActionMixin
from utils.permissions import IsCompanyMember, IsSameCompany
from .providers.mpesa import MPesaService
from .providers.crypto import CryptoService 
from django.conf import settings

logger = logging.getLogger(__name__)

class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for SubscriptionPlan - read-only for customers."""
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['billing_cycle', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'price', 'created_at']
    ordering = ['price']

    def get_queryset(self):
        return SubscriptionPlan.objects.filter(is_active=True)

class UserSubscriptionViewSet(TenantViewSetMixin, BulkActionMixin, viewsets.ModelViewSet):
    """ViewSet for UserSubscription management."""
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_provider', 'is_trial']
    search_fields = ['plan__name', 'company__name']
    ordering_fields = ['start_date', 'end_date', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return UserSubscription.objects.filter(
            company=self.request.user.company
        ).select_related('plan', 'company', 'user').prefetch_related('transactions')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateSubscriptionSerializer
        elif self.action == 'retrieve':
            return UserSubscriptionDetailSerializer
        return UserSubscriptionListSerializer

    @transaction.atomic
    @action(detail=True, methods=['post'])
    def cancel_subscription(self, request, pk=None):
        """Cancel a subscription."""
        subscription = self.get_object()
        
        if subscription.status == 'CANCELLED':
            return Response({
                'error': 'Subscription is already cancelled'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        subscription.status = 'CANCELLED'
        subscription.auto_renew = False
        subscription.save()
        
        # Process refund if applicable
        if subscription.is_trial:
            # No refund needed for trial subscriptions
            refund_amount = 0
        else:
            # Calculate prorated refund
            from datetime import datetime
            days_used = (timezone.now().date() - subscription.start_date.date()).days
            total_days = (subscription.end_date.date() - subscription.start_date.date()).days
            if total_days > 0:
                days_remaining = max(0, total_days - days_used)
                refund_amount = (subscription.plan.price * days_remaining) / total_days
            else:
                refund_amount = 0
            
            # Create refund transaction record
            if refund_amount > 0:
                PaymentTransaction.objects.create(
                    company=subscription.company,
                    user=request.user,
                    subscription=subscription,
                    amount=refund_amount,
                    currency='USD',
                    status='PENDING',
                    payment_type='SUBSCRIPTION',
                    provider=subscription.payment_provider,
                    description=f'Prorated refund for cancelled subscription {subscription.id}'
                )
        
        # Update payment provider subscription
        try:
            if subscription.provider_subscription_id:
                # TODO: Call payment provider API to cancel recurring billing
                # Example: stripe.Subscription.modify(subscription.provider_subscription_id, cancel_at_period_end=True)
                pass
        except Exception as e:
            # Log the error but don't fail the cancellation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to cancel provider subscription {subscription.provider_subscription_id}: {e}")
        
        return Response({
            'message': 'Subscription cancelled successfully',
            'status': subscription.status,
            'refund_amount': refund_amount if 'refund_amount' in locals() else 0
        })

    @transaction.atomic
    @action(detail=True, methods=['post'])
    def reactivate_subscription(self, request, pk=None):
        """Reactivate a cancelled subscription."""
        subscription = self.get_object()
        
        if subscription.status != 'CANCELLED':
            return Response({
                'error': 'Only cancelled subscriptions can be reactivated'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if subscription hasn't expired
        if subscription.end_date < timezone.now():
            return Response({
                'error': 'Subscription has expired and cannot be reactivated'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        subscription.status = 'ACTIVE'
        subscription.auto_renew = True
        subscription.save()
        
        # Update payment provider subscription
        try:
            if subscription.provider_subscription_id:
                # TODO: Call payment provider API to reactivate billing
                # Example: stripe.Subscription.modify(subscription.provider_subscription_id, cancel_at_period_end=False)
                pass
            else:
                # Create new provider subscription if none exists
                # TODO: Set up new recurring billing with payment provider
                pass
        except Exception as e:
            # Rollback status change if provider update fails
            subscription.status = 'CANCELLED'
            subscription.auto_renew = False
            subscription.save()
            
            return Response({
                'error': f'Failed to reactivate subscription with payment provider: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'message': 'Subscription reactivated successfully',
            'status': subscription.status
        })

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get subscription dashboard data."""
        queryset = self.get_queryset()
        
        total_subscriptions = queryset.count()
        active_subscriptions = queryset.filter(status='ACTIVE').count()
        trial_subscriptions = queryset.filter(is_trial=True, status='TRIALING').count()
        cancelled_subscriptions = queryset.filter(status='CANCELLED').count()
        expired_subscriptions = queryset.filter(status='EXPIRED').count()
        
        # Revenue calculations
        total_transactions = PaymentTransaction.objects.filter(
            company=request.user.company,
            status='COMPLETED'
        )
        total_revenue = total_transactions.aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        # Monthly revenue
        this_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_revenue = total_transactions.filter(
            created_at__gte=this_month
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Next billing
        next_billing = queryset.filter(
            status='ACTIVE',
            end_date__gt=timezone.now()
        ).order_by('end_date').first()
        
        return Response({
            'total_subscriptions': total_subscriptions,
            'active_subscriptions': active_subscriptions,
            'trial_subscriptions': trial_subscriptions,
            'cancelled_subscriptions': cancelled_subscriptions,
            'expired_subscriptions': expired_subscriptions,
            'total_revenue': total_revenue,
            'monthly_revenue': monthly_revenue,
            'next_billing_date': next_billing.end_date if next_billing else None
        })

class PaymentTransactionViewSet(TenantViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet for PaymentTransaction - read-only for security."""
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_type', 'provider', 'currency']
    search_fields = ['provider_transaction_id', 'invoice_number', 'description']
    ordering_fields = ['amount', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return PaymentTransaction.objects.filter(
            company=self.request.user.company
        ).select_related('company', 'user', 'subscription')

    @action(detail=False, methods=['get'])
    def revenue_report(self, request):
        """Get revenue analysis report."""
        queryset = self.get_queryset().filter(status='COMPLETED')
        
        # Total revenue
        total_revenue = queryset.aggregate(total=Sum('amount'))['total'] or 0
        
        # Revenue by provider
        provider_revenue = {}
        for provider in ['STRIPE', 'MPESA', 'CRYPTO']:
            revenue = queryset.filter(provider=provider).aggregate(
                total=Sum('amount')
            )['total'] or 0
            provider_revenue[provider.lower()] = revenue
        
        # Monthly revenue trend (last 6 months)
        from datetime import timedelta
        monthly_revenue = []
        for i in range(6):
            month_start = timezone.now().replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            ) - timedelta(days=30*i)
            month_end = month_start + timedelta(days=30)
            
            revenue = queryset.filter(
                created_at__gte=month_start,
                created_at__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            monthly_revenue.append({
                'month': month_start.strftime('%Y-%m'),
                'revenue': revenue
            })
        
        return Response({
            'total_revenue': total_revenue,
            'provider_revenue': provider_revenue,
            'monthly_revenue': list(reversed(monthly_revenue)),
            'transaction_count': queryset.count()
        })

class PaymentMethodViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet for PaymentMethod management."""
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'provider', 'is_default']
    search_fields = ['last_four', 'phone_number', 'card_brand']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return PaymentMethod.objects.filter(
            company=self.request.user.company
        ).select_related('company', 'user')

    @transaction.atomic
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set payment method as default."""
        payment_method = self.get_object()
        
        # Remove default from other methods
        PaymentMethod.objects.filter(
            company=request.user.company,
            is_default=True
        ).update(is_default=False)
        
        # Set this method as default
        payment_method.is_default = True
        payment_method.save()
        
        return Response({
            'message': 'Payment method set as default',
            'is_default': payment_method.is_default
        })
    
@api_view(['GET'])
@api_permission_classes([IsAuthenticated])
def test_stripe_connection(request):
        """Test Stripe API connection."""
        try:
            from .providers.stripe import StripeService
            
            stripe_service = StripeService()
            
            # Test creating a customer
            test_customer = stripe_service.create_customer(
                user=request.user,
                company=request.user.company
            )
            
            # Clean up test customer immediately
            import stripe
            stripe.Customer.delete(test_customer.id)
            
            return Response({
                'message': 'Stripe connection successful!',
                'stripe_customer_created': test_customer.id,
                'test_passed': True
            })
            
        except Exception as e:
            return Response({
                'error': f'Stripe connection failed: {str(e)}',
                'test_passed': False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)  
        

@api_view(['GET'])
@api_permission_classes([IsAuthenticated])
def test_mpesa_connection(request):
    """Test M-Pesa API connection."""
    try:
        mpesa_service = MPesaService()
        
        # Test getting access token
        access_token = mpesa_service.get_access_token()
        
        return Response({
            'message': 'M-Pesa connection successful!',
            'access_token_received': bool(access_token),
            'test_passed': True,
            'environment': mpesa_service.environment,
            'shortcode': mpesa_service.shortcode
        })
        
    except Exception as e:
        return Response({
            'error': f'M-Pesa connection failed: {str(e)}',
            'test_passed': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@extend_schema(
    request=MPesaPaymentSerializer,
    responses={
        200: {
            "type": "object",
            "properties": {
                "message": {"type": "string"},
                "checkout_request_id": {"type": "string"},
                "merchant_request_id": {"type": "string"},
                "customer_message": {"type": "string"},
                "response_description": {"type": "string"},
                "phone_number": {"type": "string"},
                "amount": {"type": "number"}
            }
        },
        400: {
            "type": "object", 
            "properties": {
                "error": {"type": "string"}
            }
        }
    },
    description="Initiate M-Pesa STK Push payment"
)
@api_view(['POST'])
@api_permission_classes([IsAuthenticated])
def initiate_mpesa_payment(request):
    """Initiate M-Pesa STK Push payment."""
    try:
        # Validate request data using serializer
        serializer = MPesaPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'error': 'Invalid request data',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        
        # Get payment data from validated serializer
        phone_number = validated_data['phone_number']
        amount = validated_data['amount']
        account_reference = validated_data.get('account_reference', f'LogiFlow-{request.user.id}')
        transaction_desc = validated_data.get('description', 'LogiFlow Payment')
        
        # Initiate STK Push
        mpesa_service = MPesaService()
        response = mpesa_service.initiate_stk_push(
            phone_number=phone_number,
            amount=float(amount),
            account_reference=account_reference,
            transaction_desc=transaction_desc,
            user=request.user,
            company=request.user.company
        )
        
        return Response({
            'message': 'STK Push initiated successfully',
            'checkout_request_id': response.get('CheckoutRequestID'),
            'merchant_request_id': response.get('MerchantRequestID'),
            'customer_message': response.get('CustomerMessage'),
            'response_description': response.get('ResponseDescription'),
            'phone_number': phone_number,
            'amount': float(amount)
        })
        
    except Exception as e:
        logger.error(f"STK Push initiation failed: {str(e)}")
        return Response({
            'error': f'Failed to initiate payment: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@extend_schema(
    request=MPesaStatusCheckSerializer,
    responses={
        200: {
            "type": "object",
            "properties": {
                "transaction_status": {"type": "object"},
                "checkout_request_id": {"type": "string"}
            }
        }
    },
    description="Check M-Pesa transaction status"
)
@api_view(['POST'])
@api_permission_classes([IsAuthenticated])
def check_mpesa_status(request):
    """Check M-Pesa transaction status."""
    try:
        # Validate request data
        serializer = MPesaStatusCheckSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'error': 'Invalid request data',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        checkout_request_id = serializer.validated_data['checkout_request_id']
        
        mpesa_service = MPesaService()
        response = mpesa_service.check_transaction_status(checkout_request_id)
        
        return Response({
            'transaction_status': response,
            'checkout_request_id': checkout_request_id
        })
        
    except Exception as e:
        logger.error(f"Transaction status check failed: {str(e)}")
        return Response({
            'error': f'Failed to check transaction status: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@method_decorator(csrf_exempt, name='dispatch')
class MPesaCallbackView(View):
    """Handle M-Pesa payment callbacks."""
    
    def post(self, request):
        """Handle M-Pesa STK Push callback."""
        try:
            # Parse JSON data
            callback_data = json.loads(request.body)
            
            logger.info(f"Received M-Pesa callback: {callback_data}")
            
            # Process the callback
            mpesa_service = MPesaService()
            success = mpesa_service.handle_callback(callback_data)
            
            if success:
                logger.info("M-Pesa callback processed successfully")
                return JsonResponse({
                    'ResultCode': 0,
                    'ResultDesc': 'Callback processed successfully'
                })
            else:
                logger.warning("M-Pesa callback processing failed")
                return JsonResponse({
                    'ResultCode': 1,
                    'ResultDesc': 'Callback processing failed'
                })
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON in M-Pesa callback")
            return JsonResponse({
                'ResultCode': 1,
                'ResultDesc': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            logger.error(f"Error processing M-Pesa callback: {str(e)}")
            return JsonResponse({
                'ResultCode': 1,
                'ResultDesc': f'Error: {str(e)}'
            }, status=500)
    
    def get(self, request):
        """Handle GET request (for testing)."""
        return JsonResponse({
            'message': 'M-Pesa callback endpoint is active',
            'endpoint': 'POST to this URL for callbacks'
        })

@method_decorator(csrf_exempt, name='dispatch')
class MPesaResultView(View):
    """Handle M-Pesa result callbacks (for account balance, etc.)."""
    
    def post(self, request):
        """Handle M-Pesa result callback."""
        try:
            result_data = json.loads(request.body)
            logger.info(f"Received M-Pesa result: {result_data}")
            
            # Process result (account balance, etc.)
            # You can extend this based on your needs
            
            return JsonResponse({
                'ResultCode': 0,
                'ResultDesc': 'Result received successfully'
            })
            
        except Exception as e:
            logger.error(f"Error processing M-Pesa result: {str(e)}")
            return JsonResponse({
                'ResultCode': 1,
                'ResultDesc': f'Error: {str(e)}'
            }, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class MPesaTimeoutView(View):
    """Handle M-Pesa timeout callbacks."""
    
    def post(self, request):
        """Handle M-Pesa timeout callback."""
        try:
            timeout_data = json.loads(request.body)
            logger.info(f"Received M-Pesa timeout: {timeout_data}")
            
            # Handle timeout scenarios
            # You can update transaction status to timeout/failed
            
            return JsonResponse({
                'ResultCode': 0,
                'ResultDesc': 'Timeout handled successfully'
            })
            
        except Exception as e:
            logger.error(f"Error processing M-Pesa timeout: {str(e)}")
            return JsonResponse({
                'ResultCode': 1,
                'ResultDesc': f'Error: {str(e)}'
            }, status=500)        
        


# 2. Update create_crypto_payment view response:
@extend_schema(
    request=CryptoPaymentSerializer,
    responses={
        200: {
            "type": "object",
            "properties": {
                "message": {"type": "string"},
                "payment_id": {"type": "string"},
                "payment_url": {"type": "string"},
                "payment_address": {"type": "string"},
                "pay_currency": {"type": "string"},
                "pay_amount": {"type": "string"},
                "price_amount": {"type": "number"},
                "price_currency": {"type": "string"},
                "expires_at": {"type": "string"},
                "status": {"type": "string"}
            }
        },
        400: {
            "type": "object",
            "properties": {
                "error": {"type": "string"},
                "details": {"type": "object"}
            }
        }
    },
    description="Create crypto payment with NOWPayments"
)
@api_view(['POST'])
@api_permission_classes([IsAuthenticated])
def create_crypto_payment(request):
    """
    ✅ IMPROVED: Create a crypto payment using normalized responses.
    """
    try:
        # Validate request data using serializer
        serializer = CryptoPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'error': 'Invalid request data',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        
        # Get payment data from validated serializer
        amount = validated_data['amount']
        currency = validated_data.get('currency', 'USD')
        pay_currency = validated_data.get('pay_currency')
        order_description = validated_data.get('order_description', 'LogiFlow crypto payment')
        
        # Create crypto payment with NOWPayments
        crypto_service = CryptoService()
        
        # ✅ Use normalized response from improved service
        payment = crypto_service.create_payment(
            amount=float(amount),
            currency=currency,
            pay_currency=pay_currency,
            order_id=f"LogiFlow-{request.user.id}-{int(timezone.now().timestamp())}",
            order_description=order_description,
            user=request.user,
            company=request.user.company
        )
        
        logger.info(f"✅ Created crypto payment: {payment['payment_id']}")
        
        # ✅ Return normalized response - no more field inconsistencies!
        return Response({
            'message': 'Crypto payment created successfully',
            'payment_id': payment['payment_id'],
            'payment_url': payment['payment_url'],
            'payment_address': payment['pay_address'],
            'pay_currency': payment['pay_currency'],
            'pay_amount': payment['pay_amount'],
            'price_amount': float(amount),
            'price_currency': currency,
            'expires_at': payment['expiration_estimate_date'],
            'status': payment['payment_status'] or 'waiting',
            'order_id': payment['order_id']
        })
        
    except ValueError as e:
        # Validation errors (e.g., invalid amount)
        logger.error(f"Validation error: {str(e)}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        # Other errors (API errors, connection issues, etc.)
        logger.error(f"Crypto payment creation failed: {str(e)}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    request=CryptoStatusCheckSerializer,
    responses={
        200: {
            "type": "object",
            "properties": {
                "payment_id": {"type": "string"},
                "status": {"type": "string"},
                "payment_address": {"type": "string"},
                "pay_currency": {"type": "string"},
                "pay_amount": {"type": "string"},
                "price_amount": {"type": "string"},
                "price_currency": {"type": "string"},
                "created_at": {"type": "string"},
                "updated_at": {"type": "string"}
            }
        },
        400: {
            "type": "object",
            "properties": {
                "error": {"type": "string"}
            }
        },
        404: {
            "type": "object",
            "properties": {
                "error": {"type": "string"}
            }
        }
    },
    description="Check crypto payment status"
)
@api_view(['POST'])
@api_permission_classes([IsAuthenticated])
def check_crypto_status(request):
    """
    ✅ IMPROVED: Check crypto payment status using normalized responses.
    """
    try:
        # Validate request data using serializer
        serializer = CryptoStatusCheckSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'error': 'Invalid request data',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        payment_id = serializer.validated_data['payment_id']
        
        crypto_service = CryptoService()
        
        # ✅ Use normalized response
        payment = crypto_service.get_payment_status(payment_id)
        
        logger.info(f"✅ Retrieved payment status: {payment_id} - {payment['payment_status']}")
        
        # ✅ Return normalized, consistent response
        return Response({
            'payment_id': payment['payment_id'],
            'status': payment['payment_status'],
            'payment_address': payment['pay_address'],
            'pay_currency': payment['pay_currency'],
            'pay_amount': payment['pay_amount'],
            'price_amount': payment['price_amount'],
            'price_currency': payment['price_currency'],
            'created_at': payment['created_at'],
            'updated_at': payment['updated_at'],
            'order_id': payment['order_id']
        })
        
    except Exception as e:
        error_message = str(e)
        logger.error(f"Crypto status check failed: {error_message}")
        
        # Return appropriate status code
        if 'not found' in error_message.lower():
            return Response({
                'error': error_message
            }, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({
                'error': error_message
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@api_permission_classes([IsAuthenticated])
def test_crypto_connection(request):
    """
    ✅ IMPROVED: Test Crypto API connection with better feedback.
    """
    try:
        crypto_service = CryptoService()
        
        # Test connection
        connection_test = crypto_service.test_connection()
        
        if not connection_test:
            return Response({
                'error': 'Failed to connect to NOWPayments API',
                'test_passed': False,
                'suggestion': 'Please check your API credentials in settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Get supported currencies
        try:
            supported_currencies = crypto_service.get_supported_currencies()
            currencies_count = len(supported_currencies)
        except:
            supported_currencies = []
            currencies_count = 0
        
        return Response({
            'message': 'Crypto connection successful!',
            'test_passed': True,
            'provider': 'NOWPayments',
            'environment': settings.NOWPAYMENTS_ENVIRONMENT,
            'supported_currencies_count': currencies_count,
            'sample_currencies': supported_currencies[:10] if supported_currencies else []
        })
        
    except Exception as e:
        logger.error(f"Crypto connection test failed: {str(e)}")
        return Response({
            'error': f'Crypto connection failed: {str(e)}',
            'test_passed': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class CryptoCallbackView(View):
    """
    ✅ IMPROVED: Handle Crypto payment callbacks with better logging.
    """
    
    def post(self, request):
        """Handle NOWPayments IPN webhook."""
        try:
            # Get signature from headers
            signature = request.META.get('HTTP_X_NOWPAYMENTS_SIG', '')
            
            # Get raw payload
            payload = request.body
            
            logger.info(f"📥 Received NOWPayments webhook")
            logger.debug(f"Signature present: {bool(signature)}")
            
            # Process the callback using improved service
            crypto_service = CryptoService()
            success = crypto_service.handle_webhook(payload, signature)
            
            if success:
                logger.info("✅ NOWPayments webhook processed successfully")
                return JsonResponse({
                    'status': 'success',
                    'message': 'IPN processed successfully'
                })
            else:
                logger.warning("⚠️ NOWPayments webhook processing failed")
                return JsonResponse({
                    'status': 'error',
                    'message': 'IPN processing failed'
                }, status=400)
                
        except Exception as e:
            logger.error(f"❌ Error processing NOWPayments webhook: {str(e)}")
            return JsonResponse({
                'status': 'error',
                'message': f'Error: {str(e)}'
            }, status=500)
    
    def get(self, request):
        """Handle GET request (for testing)."""
        return JsonResponse({
            'message': 'NOWPayments webhook endpoint is active',
            'endpoint': 'POST to this URL for IPN callbacks',
            'provider': 'NOWPayments',
            'note': 'Webhook signature verification is enabled'
        })


# ✅ NEW: Additional utility endpoint for getting supported currencies
@api_view(['GET'])
@api_permission_classes([IsAuthenticated])
def get_supported_crypto_currencies(request):
    """
    Get list of supported cryptocurrencies from NOWPayments.
    """
    try:
        crypto_service = CryptoService()
        currencies = crypto_service.get_supported_currencies()
        
        return Response({
            'currencies': currencies,
            'count': len(currencies)
        })
        
    except Exception as e:
        logger.error(f"Failed to get supported currencies: {str(e)}")
        return Response({
            'error': 'Failed to retrieve supported currencies',
            'fallback_currencies': ['btc', 'eth', 'usdt', 'ltc', 'bch']
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)