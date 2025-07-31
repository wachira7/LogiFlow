# apps/payments/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Sum, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from .models import SubscriptionPlan, UserSubscription, PaymentTransaction, PaymentMethod
from .serializers import (
    SubscriptionPlanSerializer, UserSubscriptionListSerializer, 
    UserSubscriptionDetailSerializer, CreateSubscriptionSerializer,
    PaymentTransactionSerializer, PaymentMethodSerializer
)
from utils.mixins import TenantViewSetMixin, BulkActionMixin
from utils.permissions import IsCompanyMember, IsSameCompany

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