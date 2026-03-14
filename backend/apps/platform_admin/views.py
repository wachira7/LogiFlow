# apps/platform_admin/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from utils.permissions import IsPlatformAdmin
from .models import PlatformSettings, PlatformAuditLog, SystemHealth, PlatformNotification
from .serializers import ( PlatformSettingsSerializer, PlatformAuditLogSerializer, SystemHealthSerializer, PlatformNotificationSerializer, CompanyManagementSerializer )
from .analytics import get_platform_overview, get_company_overview
from .dashboard import get_system_health_dashboard


class PlatformSettingsViewSet(viewsets.ModelViewSet):
    pagination_class = None
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
    pagination_class = None
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
        from datetime import timedelta
        queryset = self.get_queryset()
        last_24h = timezone.now() - timedelta(hours=24)

        action_breakdown = {
            action_key.lower(): queryset.filter(action=action_key).count()
            for action_key, _ in PlatformAuditLog.ACTION_CHOICES
        }

        active_admins = queryset.values(
            'admin_user__email'
        ).annotate(action_count=Count('id')).order_by('-action_count')[:10]

        return Response({
            'total_audit_entries': queryset.count(),
            'recent_activity_24h': queryset.filter(created_at__gte=last_24h).count(),
            'action_breakdown': action_breakdown,
            'most_active_admins': list(active_admins),
            'security_alerts': [],
        })


class SystemHealthViewSet(viewsets.ModelViewSet):
    pagination_class = None
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
        return Response(get_system_health_dashboard())

    @action(detail=False, methods=['post'])
    def generate_test_metrics(self, request):
        import random

        test_metrics = [
            {'name': 'cpu_usage',         'value': random.uniform(20, 80),  'unit': '%'},
            {'name': 'memory_usage',      'value': random.uniform(40, 90),  'unit': '%'},
            {'name': 'disk_usage',        'value': random.uniform(10, 70),  'unit': '%'},
            {'name': 'active_connections','value': random.randint(50, 300), 'unit': 'count'},
            {'name': 'response_time_avg', 'value': random.uniform(100, 500),'unit': 'ms'},
            {'name': 'error_rate',        'value': random.uniform(0, 0.1),  'unit': '%'},
            {'name': 'uptime',            'value': random.uniform(99.5,100),'unit': '%'},
        ]

        created = []
        for m in test_metrics:
            metric = SystemHealth.objects.create(
                metric_name=m['name'],
                metric_value=m['value'],
                metric_unit=m['unit'],
                threshold_warning=70 if m['unit'] == '%' else None,
                threshold_critical=90 if m['unit'] == '%' else None,
                description=f"Test metric for {m['name']}",
            )
            created.append(metric)

        return Response({
            'message': f'Generated {len(created)} test metrics',
            'metrics': [f"{m.metric_name}: {m.metric_value}{m.metric_unit}" for m in created],
        })


class PlatformAnalyticsViewSet(viewsets.ViewSet):
    permission_classes = [IsPlatformAdmin]
    pagination_class = None

    @action(detail=False, methods=['get'])
    def overview(self, request):
        return Response(get_platform_overview())

    @action(detail=False, methods=['get'])
    def company_overview(self, request):
        return Response(get_company_overview())

    @action(detail=False, methods=['post'])
    def manage_company(self, request):
        serializer = CompanyManagementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.tenants.models import Company

        company_id  = serializer.validated_data['company_id']
        action      = serializer.validated_data['action']
        reason      = serializer.validated_data['reason']
        notify_users = serializer.validated_data['notify_users']

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
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
                from apps.payments.models import UserSubscription
                from datetime import timedelta
                UserSubscription.objects.filter(
                    company=company, is_trial=True
                ).update(
                    trial_end=timezone.now() + timedelta(days=14),
                    status='TRIALING',
                )
                action_description = f"Reset trial for company {company.name}"

            PlatformAuditLog.objects.create(
                admin_user=request.user,
                action='COMPANY_SUSPENDED' if action == 'SUSPEND' else 'COMPANY_ACTIVATED',
                target_company=company if action != 'DELETE' else None,
                description=f"{action_description}. Reason: {reason}",
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                metadata={'action': action, 'reason': reason, 'notify_users': notify_users},
            )

            if notify_users and action != 'DELETE':
                self._send_company_notification(company, action, reason, request.user)

        return Response({
            'message': action_description,
            'company_status': (
                'active' if action == 'ACTIVATE'
                else 'suspended' if action == 'SUSPEND'
                else 'deleted'
            ),
        })

    def _send_company_notification(self, company, action, reason, admin_user):
        from apps.users.models import User
        from django.core.mail import send_mail
        from django.conf import settings
        import logging
        logger = logging.getLogger(__name__)

        try:
            company_users = User.objects.filter(
                company=company, is_active=True
            ).exclude(email='')

            if not company_users.exists():
                return

            action_messages = {
                'ACTIVATE':     'activated and restored',
                'SUSPEND':      'temporarily suspended',
                'RESET_TRIAL':  'trial period has been reset',
            }
            action_message = action_messages.get(action, action.lower())
            subject = f"Important: Your {company.name} account has been {action_message}"

            message = f"""
Dear {company.name} team,

Your company account on LogiFlow has been {action_message} by our platform administrator.

Reason: {reason}

{"Your account is now active and you can continue using all features." if action == 'ACTIVATE' else ""}
{"Your account access has been temporarily suspended. Please contact support." if action == 'SUSPEND' else ""}
{"Your trial period has been extended. You can continue using LogiFlow with full access." if action == 'RESET_TRIAL' else ""}

If you have any questions, please contact our support team.

Best regards,
The LogiFlow Platform Team
Administrator: {admin_user.get_full_name()} ({admin_user.email})
            """.strip()

            recipient_emails = list(company_users.values_list('email', flat=True))
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@logiflow.com'),
                recipient_list=recipient_emails,
                fail_silently=True,
            )

            PlatformNotification.objects.create(
                title=f"Company {action_message.title()}",
                message=f"Company {company.name} has been {action_message}. Reason: {reason}",
                notification_type='GENERAL',
                priority='HIGH' if action == 'SUSPEND' else 'MEDIUM',
                is_global=False,
                created_by=admin_user,
            ).target_companies.add(company)

            logger.info(f"Sent {action} notification to {len(recipient_emails)} users in {company.name}")

        except Exception as e:
            logger.error(f"Failed to send notification for {company.name} action {action}: {str(e)}")


class PlatformNotificationViewSet(viewsets.ModelViewSet):
    pagination_class = None 
    serializer_class = PlatformNotificationSerializer
    permission_classes = [IsPlatformAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['notification_type', 'priority', 'is_active', 'is_global']
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'priority', 'scheduled_for']
    ordering = ['-created_at']

    def get_queryset(self):
        return PlatformNotification.objects.select_related(
            'created_by'
        ).prefetch_related('target_companies')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_sent(self, request, pk=None):
        notification = self.get_object()
        notification.is_sent = True
        notification.sent_at = timezone.now()
        notification.save()
        return Response({'message': 'Notification marked as sent', 'sent_at': notification.sent_at})

    @action(detail=True, methods=['post'])
    def send_now(self, request, pk=None):
        notification = self.get_object()
        notification.is_sent = True
        notification.sent_at = timezone.now()
        notification.save()
        return Response({
            'message': f'Notification "{notification.title}" sent successfully',
            'sent_at': notification.sent_at,
        })

    @action(detail=False, methods=['get'])
    def active(self, request):
        queryset = self.get_queryset().filter(is_active=True)
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        queryset = self.get_queryset().filter(is_sent=False, is_active=True)
        return Response(self.get_serializer(queryset, many=True).data)