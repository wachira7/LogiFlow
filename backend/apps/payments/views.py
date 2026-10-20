# apps/payments/views.py
"""
Billing API. Plans are visible to any signed-in user; everything else (subscriptions, payments, payment
methods, checkout) is for company owners. All state changes go through billing.py / stripe_flow.py.
"""
import json
import logging
from collections import defaultdict
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.http import JsonResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes as api_permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from utils.mixins import TenantViewSetMixin
from utils.permissions import IsCompanyOwnerOrAdmin, IsPlatformAdmin, IsSameCompany

from . import billing
from .billing import BillingError
from .models import PaymentMethod, PaymentTransaction, SubscriptionPlan, UserSubscription
from .providers.crypto import CryptoService
from .providers.mpesa import MPesaService
from .serializers import (
    CreateSubscriptionSerializer, CryptoPaymentSerializer, CryptoStatusCheckSerializer, MPesaPaymentSerializer,
    MPesaStatusCheckSerializer, PaymentMethodSerializer, PaymentTransactionSerializer, SubscriptionPlanSerializer,
    UserSubscriptionDetailSerializer, UserSubscriptionListSerializer,
)
from . import stripe_flow

logger = logging.getLogger(__name__)

OWNER = [IsAuthenticated, IsCompanyOwnerOrAdmin]


def error(message, status_code=status.HTTP_400_BAD_REQUEST, **extra):
    return Response({'error': message, 'message': message, **extra}, status=status_code)


def provider_down(exc, what):
    logger.error('%s failed: %s', what, exc)
    return error(f'{what} is unavailable right now. Please try again in a few minutes.', status.HTTP_502_BAD_GATEWAY)


def totals_by_currency(qs):
    return {row['currency']: float(row['total'] or 0) for row in qs.values('currency').annotate(total=Sum('amount'))}


class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['billing_cycle']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'price', 'created_at']
    ordering = ['price']

    def get_queryset(self):
        return SubscriptionPlan.objects.filter(is_active=True)


class UserSubscriptionViewSet(TenantViewSetMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                              mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Subscriptions can be started, cancelled and resumed; never edited directly."""
    permission_classes = OWNER + [IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_provider', 'is_trial']
    ordering_fields = ['start_date', 'end_date', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return UserSubscription.objects.filter(company=self.request.user.company).select_related('plan', 'company', 'user')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateSubscriptionSerializer
        if self.action == 'retrieve':
            return UserSubscriptionDetailSerializer
        return UserSubscriptionListSerializer

    def create(self, request, *args, **kwargs):
        """M-Pesa / crypto: start the free trial (once per company) or subscribe and pay now."""
        serializer = CreateSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = serializer.validated_data['plan']
        provider = serializer.validated_data['payment_provider']
        pay_now = serializer.validated_data['pay_now']
        company = request.user.company
        try:
            if not pay_now and billing.trial_available(company):
                sub = billing.start_local_trial(company, request.user, plan, provider)
            else:
                if billing.live_subscription(company) and not pay_now:
                    raise BillingError('You already have a subscription. Use “Change plan” to switch.')
                sub = billing.start_paid_local(company, request.user, plan, provider)
        except BillingError as exc:
            return error(str(exc))
        data = UserSubscriptionDetailSerializer(sub, context={'request': request}).data
        return Response(data, status=status.HTTP_201_CREATED)

    def _run(self, step, message):
        try:
            sub = step(self.get_object())
        except BillingError as exc:
            return error(str(exc))
        except Exception as exc:  # Stripe unreachable: nothing was changed locally
            return provider_down(exc, 'Stripe')
        return Response({'message': message, 'subscription': UserSubscriptionDetailSerializer(sub, context={'request': self.request}).data,
                         'status': sub.status})

    @action(detail=True, methods=['post'])
    def cancel_subscription(self, request, pk=None):
        """Stop renewal; access continues until the end of the current period."""
        return self._run(billing.cancel, 'Your subscription won’t renew. You keep access until the end of the period.')

    @action(detail=True, methods=['post'])
    def reactivate_subscription(self, request, pk=None):
        """Undo a cancellation before the period ends."""
        return self._run(billing.resume, 'Your subscription will renew as normal.')

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Everything the billing page needs in one call."""
        company = request.user.company
        sub = billing.live_subscription(company)
        completed = PaymentTransaction.objects.filter(company=company, status='COMPLETED')
        month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        default_method = PaymentMethod.objects.filter(company=company).order_by('-is_default', '-created_at').first()
        return Response({
            'subscription': UserSubscriptionDetailSerializer(sub, context={'request': request}).data if sub else None,
            'trial_available': billing.trial_available(company),
            'spent_total': totals_by_currency(completed),
            'spent_this_month': totals_by_currency(completed.filter(created_at__gte=month)),
            'completed_payments': completed.count(),
            'pending_payments': PaymentTransaction.objects.filter(company=company, status='PENDING').count(),
            'default_payment_method': PaymentMethodSerializer(default_method).data if default_method else None,
            'payment_methods': PaymentMethod.objects.filter(company=company).count(),
            'recent_transactions': PaymentTransactionSerializer(
                PaymentTransaction.objects.filter(company=company).select_related('subscription__plan')[:5], many=True).data,
            'stripe_enabled': bool(settings.STRIPE_SECRET_KEY),
        })

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Older summary shape, kept for compatibility."""
        qs = self.get_queryset()
        sub = billing.live_subscription(request.user.company)
        return Response({
            'total_subscriptions': qs.count(),
            'active_subscriptions': qs.filter(status='ACTIVE').count(),
            'trial_subscriptions': qs.filter(status='TRIALING').count(),
            'cancelled_subscriptions': qs.filter(status='CANCELLED').count(),
            'expired_subscriptions': qs.filter(status='EXPIRED').count(),
            'spent_total': totals_by_currency(PaymentTransaction.objects.filter(company=request.user.company, status='COMPLETED')),
            'next_billing_date': sub.end_date if sub and sub.auto_renew else None,
        })


class PaymentTransactionViewSet(TenantViewSetMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentTransactionSerializer
    permission_classes = OWNER + [IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_type', 'provider', 'currency', 'subscription']
    search_fields = ['provider_transaction_id', 'invoice_number', 'description']
    ordering_fields = ['amount', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return PaymentTransaction.objects.filter(company=self.request.user.company).select_related('company', 'user', 'subscription__plan')

    @action(detail=False, methods=['get'])
    def revenue_report(self, request):
        """Completed payments by provider and by calendar month (last 12), per currency."""
        qs = self.get_queryset().filter(status='COMPLETED')
        by_provider = defaultdict(dict)
        for row in qs.values('provider', 'currency').annotate(total=Sum('amount')):
            by_provider[row['provider'].lower()][row['currency']] = float(row['total'] or 0)
        since = (timezone.now().replace(day=1) - timedelta(days=330)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        months = defaultdict(dict)
        for row in qs.filter(created_at__gte=since).annotate(m=TruncMonth('created_at')).values('m', 'currency').annotate(total=Sum('amount')):
            months[row['m'].strftime('%Y-%m')][row['currency']] = float(row['total'] or 0)
        return Response({
            'total_by_currency': totals_by_currency(qs),
            'provider_revenue': dict(by_provider),
            'monthly_revenue': [{'month': m, 'totals': t} for m, t in sorted(months.items())],
            'transaction_count': qs.count(),
        })


class PaymentMethodViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """M-Pesa numbers and crypto preferences are added here; cards come from Stripe setup checkout."""
    serializer_class = PaymentMethodSerializer
    permission_classes = OWNER + [IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['type', 'provider', 'is_default']
    ordering = ['-is_default', '-created_at']

    def get_queryset(self):
        return PaymentMethod.objects.filter(company=self.request.user.company).select_related('company', 'user')

    def perform_create(self, serializer):
        company = self.request.user.company
        first = not PaymentMethod.objects.filter(company=company).exists()
        serializer.save(company=company, user=self.request.user, is_default=first)

    def destroy(self, request, *args, **kwargs):
        method = self.get_object()
        with transaction.atomic():
            was_default = method.is_default
            if method.provider == 'STRIPE' and method.provider_payment_method_id:
                try:
                    billing._stripe().PaymentMethod.detach(method.provider_payment_method_id)
                except Exception as exc:  # already detached or Stripe down: still remove it here
                    logger.warning('Could not detach Stripe card %s: %s', method.provider_payment_method_id, exc)
            method.delete()
            if was_default:
                nxt = PaymentMethod.objects.filter(company=request.user.company).order_by('-created_at').first()
                if nxt:
                    nxt.is_default = True
                    nxt.save(update_fields=['is_default'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        method = self.get_object()
        with transaction.atomic():
            PaymentMethod.objects.filter(company=request.user.company, is_default=True).update(is_default=False)
            method.is_default = True
            method.save(update_fields=['is_default'])
        return Response({'message': 'Default payment method updated', 'is_default': True})


# --- Stripe -------------------------------------------------------------------

def _frontend(path):
    return f"{settings.FRONTEND_URL}{path}"


@api_view(['POST'])
@api_permission_classes(OWNER)
def create_stripe_setup_session(request):
    """Save a card for later without charging it (Stripe-hosted page)."""
    try:
        company = request.user.company
        customer = stripe_flow.ensure_customer(company, request.user)
        session = billing._stripe().checkout.Session.create(
            customer=customer, payment_method_types=['card'], mode='setup',
            success_url=_frontend('/billing/payment-methods?setup=success&session_id={CHECKOUT_SESSION_ID}'),
            cancel_url=_frontend('/billing/payment-methods?setup=cancelled'),
            metadata={'user_id': str(request.user.id), 'company_id': str(company.id)},
        )
        return Response({'checkout_url': session.url, 'session_id': session.id})
    except Exception as exc:
        return provider_down(exc, 'Card setup')


@api_view(['POST'])
@api_permission_classes(OWNER)
def complete_stripe_setup(request):
    """Called when the user comes back from card setup; the webhook does the same, whichever runs first."""
    session_id = request.data.get('session_id')
    if not session_id:
        return error('session_id is required')
    try:
        session = billing._stripe().checkout.Session.retrieve(session_id)
    except Exception as exc:
        return provider_down(exc, 'Stripe')
    if (session.metadata or {}).get('company_id') != str(request.user.company.id) or session.mode != 'setup':
        return error('This setup session isn’t yours.', status.HTTP_403_FORBIDDEN)
    if session.status != 'complete':
        return error('Card setup wasn’t finished.')
    method = stripe_flow.save_card_from_setup(session, request.user)
    return Response({'message': 'Card saved', 'payment_method': PaymentMethodSerializer(method).data})


@api_view(['POST'])
@api_permission_classes(OWNER)
def create_stripe_checkout_session(request):
    """Subscribe with a card on Stripe's hosted page. Free trial only if the company never had one."""
    plan = SubscriptionPlan.objects.filter(id=request.data.get('plan_id'), is_active=True).first()
    if plan is None:
        return error('Choose an available plan.', status.HTTP_404_NOT_FOUND)
    company = request.user.company
    live = billing.live_subscription(company)
    if live and live.plan_id == plan.id and live.auto_renew:
        return error('You’re already on this plan.')
    try:
        stripe = billing._stripe()
        line_item = {'price': plan.stripe_price_id, 'quantity': 1} if plan.stripe_price_id else {
            'price_data': {
                'currency': 'usd',
                'product_data': {'name': f'LogiFlow {plan.name}', 'description': plan.description or None},
                'unit_amount': int(round(float(plan.price) * 100)),
                'recurring': {'interval': 'year' if plan.billing_cycle == 'ANNUAL' else 'month',
                              'interval_count': 3 if plan.billing_cycle == 'QUARTERLY' else 1},
            },
            'quantity': 1,
        }
        meta = {'user_id': str(request.user.id), 'company_id': str(company.id), 'plan_id': str(plan.id)}
        sub_data = {'metadata': meta}
        if billing.trial_available(company):
            sub_data['trial_period_days'] = billing.TRIAL_DAYS
        session = stripe.checkout.Session.create(
            mode='subscription', customer=stripe_flow.ensure_customer(company, request.user),
            line_items=[line_item], client_reference_id=str(request.user.id), metadata=meta, subscription_data=sub_data,
            success_url=_frontend('/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}'),
            cancel_url=_frontend('/billing/plans?checkout=cancelled'),
        )
        return Response({'checkout_url': session.url, 'session_id': session.id, 'trial': 'trial_period_days' in sub_data})
    except Exception as exc:
        return provider_down(exc, 'Checkout')


@api_view(['POST'])
@api_permission_classes(OWNER)
def stripe_checkout_success(request):
    """Called when the user comes back from checkout. Safe to call repeatedly; the webhook does the same."""
    session_id = request.data.get('session_id')
    if not session_id:
        return error('session_id is required')
    try:
        session = billing._stripe().checkout.Session.retrieve(session_id, expand=['subscription'])
    except Exception as exc:
        return provider_down(exc, 'Stripe')
    if (session.metadata or {}).get('company_id') != str(request.user.company.id):
        return error('This checkout session isn’t yours.', status.HTTP_403_FORBIDDEN)
    if session.status != 'complete' or session.payment_status not in ('paid', 'no_payment_required'):
        return error('Checkout wasn’t completed.', payment_status=session.payment_status)
    sub = stripe_flow.complete_subscription_checkout(session, request.user)
    return Response({
        'message': 'Subscription started' if sub.status == 'TRIALING' else 'Subscription active',
        'subscription': UserSubscriptionDetailSerializer(sub, context={'request': request}).data,
        'subscription_id': str(sub.id), 'status': sub.status, 'is_trial': sub.is_trial,
    })


# --- M-Pesa / crypto: pay for a subscription -------------------------------------

def _subscription_to_pay(request, subscription_id, provider):
    company = request.user.company
    qs = UserSubscription.objects.filter(company=company, payment_provider=provider).select_related('plan')
    sub = qs.filter(id=subscription_id).first() if subscription_id else qs.filter(status__in=billing.LIVE).order_by('-created_at').first()
    if sub is None:
        raise BillingError(f'No {dict(UserSubscription.PAYMENT_PROVIDER_CHOICES)[provider]} subscription to pay for.')
    if sub.status not in billing.LIVE:
        raise BillingError('This subscription has ended. Start a new one from Plans.')
    return sub


@api_view(['POST'])
@api_permission_classes(OWNER)
def initiate_mpesa_payment(request):
    """Send an STK push for the subscription's next period, priced from the plan (in KES)."""
    serializer = MPesaPaymentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        sub = _subscription_to_pay(request, serializer.validated_data.get('subscription_id'), 'MPESA')
    except BillingError as exc:
        return error(str(exc))
    phone = serializer.validated_data.get('phone_number')
    if not phone:
        method = PaymentMethod.objects.filter(company=request.user.company, type='MPESA').order_by('-is_default').first()
        phone = method.phone_number if method else None
    if not phone:
        return error('Enter the M-Pesa number to charge.', details={'phone_number': 'Required'})
    amount, _ = billing.provider_amount(sub.plan, 'MPESA')
    try:
        res = MPesaService().initiate_stk_push(
            phone_number=phone, amount=amount, account_reference=f'SUB-{str(sub.id)[:8]}',
            transaction_desc=f'LogiFlow {sub.plan.name}', user=request.user, company=request.user.company, subscription=sub,
        )
    except Exception as exc:
        return provider_down(exc, 'M-Pesa')
    return Response({
        'message': 'Check your phone and enter your M-Pesa PIN to pay.',
        'checkout_request_id': res.get('CheckoutRequestID'), 'customer_message': res.get('CustomerMessage'),
        'phone_number': phone, 'amount': int(amount), 'currency': 'KES',
    })


@api_view(['POST'])
@api_permission_classes(OWNER)
def check_mpesa_status(request):
    serializer = MPesaStatusCheckSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    checkout_id = serializer.validated_data['checkout_request_id']
    tx = PaymentTransaction.objects.filter(company=request.user.company, provider='MPESA', provider_transaction_id=checkout_id).first()
    if tx is None:
        return error('Payment not found.', status.HTTP_404_NOT_FOUND)
    return Response({'checkout_request_id': checkout_id, 'status': tx.status, 'transaction': PaymentTransactionSerializer(tx).data})


@api_view(['POST'])
@api_permission_classes(OWNER)
def create_crypto_payment(request):
    """Create a crypto invoice for the subscription's next period, priced from the plan (in USD)."""
    serializer = CryptoPaymentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        sub = _subscription_to_pay(request, serializer.validated_data.get('subscription_id'), 'CRYPTO')
    except BillingError as exc:
        return error(str(exc))
    amount, currency = billing.provider_amount(sub.plan, 'CRYPTO')
    try:
        payment = CryptoService().create_payment(
            amount=amount, currency=currency, pay_currency=serializer.validated_data.get('pay_currency'),
            order_id=f'sub-{sub.id}-{int(timezone.now().timestamp())}', order_description=f'LogiFlow {sub.plan.name}',
            user=request.user, company=request.user.company, subscription=sub,
        )
    except Exception as exc:
        return provider_down(exc, 'Crypto payments')
    return Response({
        'message': 'Send the exact amount to the address below.',
        'payment_id': payment['payment_id'], 'payment_url': payment['payment_url'], 'payment_address': payment['pay_address'],
        'pay_currency': payment['pay_currency'], 'pay_amount': payment['pay_amount'],
        'price_amount': amount, 'price_currency': currency, 'expires_at': payment['expiration_estimate_date'],
        'status': payment['payment_status'] or 'waiting', 'order_id': payment['order_id'],
    })


@api_view(['POST'])
@api_permission_classes(OWNER)
def check_crypto_status(request):
    serializer = CryptoStatusCheckSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payment_id = serializer.validated_data['payment_id']
    tx = PaymentTransaction.objects.filter(company=request.user.company, provider='CRYPTO', provider_transaction_id=payment_id).first()
    if tx is None:
        return error('Payment not found.', status.HTTP_404_NOT_FOUND)
    return Response({'payment_id': payment_id, 'status': tx.status, 'transaction': PaymentTransactionSerializer(tx).data})


@api_view(['GET'])
@api_permission_classes([IsAuthenticated])
def get_supported_crypto_currencies(request):
    try:
        currencies = CryptoService().get_supported_currencies()
        return Response({'currencies': currencies, 'count': len(currencies)})
    except Exception as exc:
        logger.error('Could not load crypto currencies: %s', exc)
        return Response({'currencies': ['usdttrc20', 'btc', 'eth', 'ltc'], 'count': 4, 'fallback': True})


@api_view(['GET'])
@api_permission_classes([IsAuthenticated])
def get_exchange_rate_view(request):
    from .utils.currency_converter import convert_currency, get_exchange_rate
    src = request.query_params.get('from', 'USD').upper()
    dst = request.query_params.get('to', 'KES').upper()
    try:
        return Response({'from': src, 'to': dst, 'rate': get_exchange_rate(src, dst),
                         'example': {'input': f'100 {src}', 'output': f'{convert_currency(100, src, dst)} {dst}'}})
    except Exception as exc:
        return provider_down(exc, 'Exchange rates')


# --- provider callbacks (no user session) ----------------------------------------

@method_decorator(csrf_exempt, name='dispatch')
class MPesaCallbackView(View):
    """STK push results from Safaricom. Requires the secret token we put in the callback URL (when configured)."""

    def post(self, request):
        token = getattr(settings, 'MPESA_CALLBACK_TOKEN', '')
        if token and request.GET.get('token') != token:
            logger.warning('Rejected M-Pesa callback with a wrong or missing token')
            return JsonResponse({'ResultCode': 1, 'ResultDesc': 'Rejected'}, status=403)
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'ResultCode': 1, 'ResultDesc': 'Invalid JSON'}, status=400)
        try:
            ok = MPesaService().handle_callback(data)
        except Exception as exc:
            logger.error('M-Pesa callback failed: %s', exc)
            ok = False
        # Safaricom only needs an acknowledgement; failures are logged for follow-up
        return JsonResponse({'ResultCode': 0 if ok else 1, 'ResultDesc': 'Accepted' if ok else 'Not processed'})

    def get(self, request):
        return JsonResponse({'message': 'M-Pesa callback endpoint is active'})


@method_decorator(csrf_exempt, name='dispatch')
class MPesaResultView(View):
    def post(self, request):
        logger.info('M-Pesa result callback received')
        return JsonResponse({'ResultCode': 0, 'ResultDesc': 'Received'})


@method_decorator(csrf_exempt, name='dispatch')
class MPesaTimeoutView(View):
    def post(self, request):
        logger.info('M-Pesa timeout callback received')
        return JsonResponse({'ResultCode': 0, 'ResultDesc': 'Received'})


@method_decorator(csrf_exempt, name='dispatch')
class CryptoCallbackView(View):
    """NOWPayments IPN; rejected unless the signature verifies."""

    def post(self, request):
        ok = CryptoService().handle_webhook(request.body, request.META.get('HTTP_X_NOWPAYMENTS_SIG', ''))
        return JsonResponse({'status': 'ok' if ok else 'rejected'}, status=200 if ok else 400)

    def get(self, request):
        return JsonResponse({'message': 'NOWPayments IPN endpoint is active'})


# --- connection tests (platform admins) ------------------------------------------

@api_view(['GET'])
@api_permission_classes([IsAuthenticated, IsPlatformAdmin])
def test_stripe_connection(request):
    try:
        billing._stripe().Balance.retrieve()
        return Response({'message': 'Stripe connection successful', 'test_passed': True})
    except Exception as exc:
        return Response({'error': f'Stripe connection failed: {exc}', 'test_passed': False}, status=status.HTTP_502_BAD_GATEWAY)


@api_view(['GET'])
@api_permission_classes([IsAuthenticated, IsPlatformAdmin])
def test_mpesa_connection(request):
    try:
        service = MPesaService()
        token = service.get_access_token()
        return Response({'message': 'M-Pesa connection successful', 'access_token_received': bool(token),
                         'test_passed': True, 'environment': service.environment, 'shortcode': service.shortcode})
    except Exception as exc:
        return Response({'error': f'M-Pesa connection failed: {exc}', 'test_passed': False}, status=status.HTTP_502_BAD_GATEWAY)


@api_view(['GET'])
@api_permission_classes([IsAuthenticated, IsPlatformAdmin])
def test_crypto_connection(request):
    service = CryptoService()
    if not service.test_connection():
        return Response({'error': 'Failed to connect to NOWPayments', 'test_passed': False}, status=status.HTTP_502_BAD_GATEWAY)
    try:
        currencies = service.get_supported_currencies()
    except Exception:
        currencies = []
    return Response({'message': 'Crypto connection successful', 'test_passed': True, 'provider': 'NOWPayments',
                     'environment': settings.NOWPAYMENTS_ENVIRONMENT, 'supported_currencies_count': len(currencies),
                     'sample_currencies': currencies[:10]})
