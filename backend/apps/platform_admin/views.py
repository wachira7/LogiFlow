# apps/platform_admin/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count, Sum, Avg, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from datetime import timedelta
from utils.permissions import IsPlatformAdmin
from .models import PlatformSettings, PlatformAuditLog, SystemHealth, PlatformNotification
from .serializers import (
    PlatformSettingsSerializer, 
    PlatformAuditLogSerializer, 
    SystemHealthSerializer, 
    PlatformNotificationSerializer,  
    CompanyManagementSerializer  
)
# Note: CompanyOverviewSerializer, PlatformAnalyticsSerializer, and 
# SystemHealthDashboardSerializer are not used - views build dicts manually

# REMOVED: Duplicate IsPlatformAdmin class definition


class PlatformSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for Platform Settings management."""
    serializer_class = PlatformSettingsSerializer
    permission_classes = [IsPlatformAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['setting_key', 'description']
    ordering_fields = ['setting_key', 'created_at', 'updated_at']
    ordering = ['setting_key']

    def get_queryset(self):
        return PlatformSettings.objects.all()

    def perform_create(self, serializer):
        serializer.save(modified_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(modified_by=self.request.user)

class PlatformAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Platform Audit Logs - read-only for security."""
    serializer_class = PlatformAuditLogSerializer
    permission_classes = [IsPlatformAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'admin_user', 'target_company']
    search_fields = ['description', 'admin_user__email', 'target_company__name']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return PlatformAuditLog.objects.select_related(
            'admin_user', 'target_company', 'target_user'
        )

    @action(detail=False, methods=['get'])
    def security_report(self, request):
        """Get security and audit analytics."""
        queryset = self.get_queryset()
        
        # Recent activity (last 24 hours)
        last_24h = timezone.now() - timedelta(hours=24)
        recent_actions = queryset.filter(created_at__gte=last_24h)
        
        # Action breakdown
        action_breakdown = {}
        for action_choice in PlatformAuditLog.ACTION_CHOICES:
            action_key = action_choice[0]
            count = queryset.filter(action=action_key).count()
            action_breakdown[action_key.lower()] = count
        
        # Most active admins
        active_admins = queryset.values(
            'admin_user__email'
        ).annotate(
            action_count=Count('id')
        ).order_by('-action_count')[:10]
        
        return Response({
            'total_audit_entries': queryset.count(),
            'recent_activity_24h': recent_actions.count(),
            'action_breakdown': action_breakdown,
            'most_active_admins': list(active_admins),
            'security_alerts': []  # TODO: Implement security alerting
        })

class SystemHealthViewSet(viewsets.ModelViewSet):
    """ViewSet for System Health monitoring."""
    serializer_class = SystemHealthSerializer
    permission_classes = [IsPlatformAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'metric_name', 'auto_generated']
    search_fields = ['metric_name', 'description']
    ordering_fields = ['metric_name', 'metric_value', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return SystemHealth.objects.all()

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get system health dashboard."""
        queryset = self.get_queryset()
        
        # Get latest metrics by name (SQLite compatible)
        latest_metrics = {}
        
        # Get distinct metric names first
        metric_names = queryset.values_list('metric_name', flat=True).distinct()
        
        # Get latest metric for each name
        for metric_name in metric_names:
            latest_metric = queryset.filter(
                metric_name=metric_name
            ).order_by('-created_at').first()
            
            if latest_metric:
                latest_metrics[metric_name] = {
                    'value': latest_metric.metric_value,
                    'unit': latest_metric.metric_unit,
                    'status': latest_metric.status
                }
        
        # Overall system status
        critical_count = queryset.filter(status='CRITICAL').count()
        warning_count = queryset.filter(status='WARNING').count()
        
        if critical_count > 0:
            overall_status = 'CRITICAL'
        elif warning_count > 0:
            overall_status = 'WARNING'
        else:
            overall_status = 'HEALTHY'
        
        # Mock system metrics (in production, these would come from monitoring tools)
        dashboard_data = {
            'overall_status': overall_status,
            'cpu_usage': latest_metrics.get('cpu_usage', {}).get('value', 45.2),
            'memory_usage': latest_metrics.get('memory_usage', {}).get('value', 67.8),
            'disk_usage': latest_metrics.get('disk_usage', {}).get('value', 34.5),
            'active_connections': int(latest_metrics.get('active_connections', {}).get('value', 156)),
            'response_time_avg': latest_metrics.get('response_time_avg', {}).get('value', 245.7),
            'error_rate': latest_metrics.get('error_rate', {}).get('value', 0.02),
            'uptime_percentage': latest_metrics.get('uptime', {}).get('value', 99.97)
        }
        
        return Response(dashboard_data)

    @action(detail=False, methods=['post'])
    def generate_test_metrics(self, request):
        """Generate test system health metrics."""
        import random
        
        test_metrics = [
            {'name': 'cpu_usage', 'value': random.uniform(20, 80), 'unit': '%'},
            {'name': 'memory_usage', 'value': random.uniform(40, 90), 'unit': '%'},
            {'name': 'disk_usage', 'value': random.uniform(10, 70), 'unit': '%'},
            {'name': 'active_connections', 'value': random.randint(50, 300), 'unit': 'count'},
            {'name': 'response_time_avg', 'value': random.uniform(100, 500), 'unit': 'ms'},
            {'name': 'error_rate', 'value': random.uniform(0, 0.1), 'unit': '%'},
            {'name': 'uptime', 'value': random.uniform(99.5, 100), 'unit': '%'},
        ]
        
        created_metrics = []
        for metric in test_metrics:
            health_metric = SystemHealth.objects.create(
                metric_name=metric['name'],
                metric_value=metric['value'],
                metric_unit=metric['unit'],
                threshold_warning=70 if metric['unit'] == '%' else None,
                threshold_critical=90 if metric['unit'] == '%' else None,
                description=f"Test metric for {metric['name']}"
            )
            created_metrics.append(health_metric)
        
        return Response({
            'message': f'Generated {len(created_metrics)} test metrics',
            'metrics': [f"{m.metric_name}: {m.metric_value}{m.metric_unit}" for m in created_metrics]
        })

class PlatformAnalyticsViewSet(viewsets.ViewSet):
    """ViewSet for Platform Analytics and Insights."""
    permission_classes = [IsPlatformAdmin]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get platform overview analytics."""
        from apps.tenants.models import Company
        from apps.users.models import User
        from apps.payments.models import UserSubscription, PaymentTransaction
        
        # Company metrics
        companies = Company.objects.all()
        total_companies = companies.count()
        active_companies = companies.filter(is_active=True).count()
        
        # User metrics
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        
        # Revenue metrics
        total_revenue = PaymentTransaction.objects.filter(
            status='COMPLETED'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Monthly revenue (last 12 months)
        monthly_revenue = []
        for i in range(12):
            month_start = timezone.now().replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            ) - timedelta(days=30*i)
            month_end = month_start + timedelta(days=30)
            
            revenue = PaymentTransaction.objects.filter(
                status='COMPLETED',
                created_at__gte=month_start,
                created_at__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            monthly_revenue.append({
                'month': month_start.strftime('%Y-%m'),
                'revenue': revenue
            })
        
        # Subscription breakdown
        subscription_breakdown = {}
        for status_choice in UserSubscription.STATUS_CHOICES:
            status_key = status_choice[0]
            count = UserSubscription.objects.filter(status=status_key).count()
            subscription_breakdown[status_key.lower()] = count
        
        # System health
        critical_health = SystemHealth.objects.filter(status='CRITICAL').exists()
        warning_health = SystemHealth.objects.filter(status='WARNING').exists()
        
        if critical_health:
            system_health_status = 'CRITICAL'
        elif warning_health:
            system_health_status = 'WARNING'
        else:
            system_health_status = 'HEALTHY'
        
        # Recent platform activity
        recent_activity = PlatformAuditLog.objects.select_related(
            'admin_user', 'target_company'
        ).order_by('-created_at')[:10]
        
        return Response({
            'total_companies': total_companies,
            'active_companies': active_companies,
            'total_users': total_users,
            'active_users': active_users,
            'total_revenue': total_revenue,
            'monthly_revenue': list(reversed(monthly_revenue)),
            'subscription_breakdown': subscription_breakdown,
            'system_health_status': system_health_status,
            'recent_activity': [
                {
                    'action': activity.action,
                    'admin': activity.admin_user.email,
                    'description': activity.description,
                    'timestamp': activity.created_at
                }
                for activity in recent_activity
            ]
        })

    @action(detail=False, methods=['get'])
    def company_overview(self, request):
        """Get detailed company analytics."""
        from apps.tenants.models import Company
        from apps.users.models import User
        from apps.payments.models import UserSubscription, PaymentTransaction
        
        companies_data = []
        
        for company in Company.objects.all():
            # Get latest subscription
            latest_subscription = UserSubscription.objects.filter(
                company=company
            ).order_by('-created_at').first()
            
            # Calculate revenue
            company_revenue = PaymentTransaction.objects.filter(
                company=company,
                status='COMPLETED'
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            # Get user count
            user_count = User.objects.filter(company=company).count()
            
            # Last activity
            last_activity = User.objects.filter(
                company=company
            ).order_by('-last_login').first()
            
            companies_data.append({
                'company_id': company.id,
                'company_name': company.name,
                'is_active': company.is_active,
                'subscription_status': latest_subscription.status if latest_subscription else 'NONE',
                'user_count': user_count,
                'total_revenue': company_revenue,
                'last_activity': last_activity.last_login if last_activity and last_activity.last_login else company.created_at,
                'created_at': company.created_at
            })
        
        return Response({
            'companies': companies_data,
            'total_count': len(companies_data)
        })

    @action(detail=False, methods=['post'])
    def manage_company(self, request):
        """Manage company operations (suspend, activate, etc.)."""
        serializer = CompanyManagementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from apps.tenants.models import Company
        
        company_id = serializer.validated_data['company_id']
        action = serializer.validated_data['action']
        reason = serializer.validated_data['reason']
        notify_users = serializer.validated_data['notify_users']
        
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({
                'error': 'Company not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        with transaction.atomic():
            # Perform the action
            if action == 'ACTIVATE':
                company.is_active = True
                company.save()
                action_description = f"Activated company {company.name}"
                
            elif action == 'SUSPEND':
                company.is_active = False
                company.save()
                action_description = f"Suspended company {company.name}"
                
            elif action == 'DELETE':
                company_name = company.name
                company.delete()
                action_description = f"Deleted company {company_name}"
                
            elif action == 'RESET_TRIAL':
                # Reset trial for company's subscriptions
                from apps.payments.models import UserSubscription
                from datetime import timedelta
                
                UserSubscription.objects.filter(
                    company=company,
                    is_trial=True
                ).update(
                    trial_end=timezone.now() + timedelta(days=14),
                    status='TRIALING'
                )
                action_description = f"Reset trial for company {company.name}"
            
            # Log the action
            PlatformAuditLog.objects.create(
                admin_user=request.user,
                action='COMPANY_SUSPENDED' if action == 'SUSPEND' else 'COMPANY_ACTIVATED',
                target_company=company if action != 'DELETE' else None,
                description=f"{action_description}. Reason: {reason}",
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                metadata={'action': action, 'reason': reason, 'notify_users': notify_users}
            )
            
            # Send notifications to company users if notify_users is True
            if notify_users and action != 'DELETE':
                self._send_company_notification(company, action, reason, request.user)
        
        return Response({
            'message': action_description,
            'company_status': 'active' if action == 'ACTIVATE' else 'suspended' if action == 'SUSPEND' else 'deleted'
        })
    
    def _send_company_notification(self, company, action, reason, admin_user):
        """Send notification to all company users about the action."""
        from apps.users.models import User
        from django.core.mail import send_mail
        from django.conf import settings
        
        try:
            # Get all active users in the company
            company_users = User.objects.filter(
                company=company,
                is_active=True
            ).exclude(email='')
            
            if not company_users.exists():
                return
            
            # Prepare notification content
            action_messages = {
                'ACTIVATE': 'activated and restored',
                'SUSPEND': 'temporarily suspended',
                'RESET_TRIAL': 'trial period has been reset'
            }
            
            action_message = action_messages.get(action, action.lower())
            
            subject = f"Important: Your {company.name} account has been {action_message}"
            
            message = f"""
Dear {company.name} team,

Your company account on LogiFlow has been {action_message} by our platform administrator.

Reason: {reason}

{"Your account is now active and you can continue using all features." if action == 'ACTIVATE' else ""}
{"Your account access has been temporarily suspended. Please contact support for assistance." if action == 'SUSPEND' else ""}
{"Your trial period has been extended. You can continue using LogiFlow with full access." if action == 'RESET_TRIAL' else ""}

If you have any questions, please contact our support team.

Best regards,
The LogiFlow Platform Team
Administrator: {admin_user.get_full_name()} ({admin_user.email})
            """.strip()
            
            # Send email to all company users
            recipient_emails = list(company_users.values_list('email', flat=True))
            
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@logiflow.com'),
                recipient_list=recipient_emails,
                fail_silently=True,  # Don't break the operation if email fails
            )
            
            # Create platform notification record
            PlatformNotification.objects.create(
                title=f"Company {action_message.title()}",
                message=f"Company {company.name} has been {action_message}. Reason: {reason}",
                notification_type='GENERAL',
                priority='HIGH' if action == 'SUSPEND' else 'MEDIUM',
                is_global=False,
                created_by=admin_user
            ).target_companies.add(company)
            
            # Log successful notification
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Sent {action} notification to {len(recipient_emails)} users in company {company.name}")
            
        except Exception as e:
            # Log notification failure but don't break the company action
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send notification for company {company.name} action {action}: {str(e)}")


class PlatformNotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Platform Notifications management.
    Allows platform admins to create, view, update, and delete notifications.
    """
    serializer_class = PlatformNotificationSerializer
    permission_classes = [IsPlatformAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['notification_type', 'priority', 'is_active', 'is_global']
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'priority', 'scheduled_for']
    ordering = ['-created_at']

    def get_queryset(self):
        """Get all platform notifications."""
        return PlatformNotification.objects.select_related(
            'created_by'
        ).prefetch_related('target_companies', 'target_users')

    def perform_create(self, serializer):
        """Set the created_by user when creating a notification."""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_sent(self, request, pk=None):
        """Mark a notification as sent."""
        notification = self.get_object()
        notification.is_sent = True
        notification.sent_at = timezone.now()
        notification.save()
        
        return Response({
            'message': 'Notification marked as sent',
            'sent_at': notification.sent_at
        })

    @action(detail=True, methods=['post'])
    def send_now(self, request, pk=None):
        """Send a notification immediately."""
        notification = self.get_object()
        
        # TODO: Implement actual notification sending logic
        # This could integrate with email, SMS, push notifications, etc.
        
        notification.is_sent = True
        notification.sent_at = timezone.now()
        notification.save()
        
        return Response({
            'message': f'Notification "{notification.title}" sent successfully',
            'sent_at': notification.sent_at
        })

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active notifications."""
        queryset = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending (not sent) notifications."""
        queryset = self.get_queryset().filter(is_sent=False, is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)