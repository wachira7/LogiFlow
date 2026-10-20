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
from .analytics import get_company_detail, get_company_overview, get_platform_overview
from .health import system_health


def audit(request, action, description, company=None, **metadata):
    PlatformAuditLog.objects.create(
        admin_user=request.user, action=action, target_company=company, description=description,
        ip_address=request.META.get('REMOTE_ADDR'), user_agent=request.META.get('HTTP_USER_AGENT', '')[:500], metadata=metadata,
    )


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
        setting = serializer.save(modified_by=self.request.user)
        audit(self.request, 'SETTINGS_CHANGED', f'Created platform setting {setting.setting_key}')

    def perform_update(self, serializer):
        setting = serializer.save(modified_by=self.request.user)
        audit(self.request, 'SETTINGS_CHANGED', f'Changed platform setting {setting.setting_key}')

    def perform_destroy(self, instance):
        audit(self.request, 'SETTINGS_CHANGED', f'Deleted platform setting {instance.setting_key}')
        instance.delete()


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


class SystemHealthViewSet(viewsets.ReadOnlyModelViewSet):
    """Live health checks (dashboard) plus any stored metric history (read-only)."""
    pagination_class = None
    serializer_class = SystemHealthSerializer
    permission_classes = [IsPlatformAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'metric_name']
    ordering = ['-created_at']

    def get_queryset(self):
        return SystemHealth.objects.all()[:500]

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        return Response(system_health())


class PlatformAnalyticsViewSet(viewsets.ViewSet):
    permission_classes = [IsPlatformAdmin]
    pagination_class = None

    @action(detail=False, methods=['get'])
    def overview(self, request):
        return Response(get_platform_overview())

    @action(detail=False, methods=['get'])
    def company_overview(self, request):
        return Response(get_company_overview(request.query_params.get('search', '').strip(), request.query_params.get('status', '')))

    @action(detail=False, methods=['get'])
    def company_detail(self, request):
        from apps.tenants.models import Company
        company = Company.objects.filter(id=request.query_params.get('company_id')).first()
        if company is None:
            return Response({'error': 'Company not found', 'message': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(get_company_detail(company))

    @action(detail=False, methods=['post'])
    def manage_company(self, request):
        from django.db.models import ProtectedError, RestrictedError

        from apps.payments.billing import BillingError, extend_trial
        from apps.tenants.models import Company
        from apps.tenants.roles import sign_out_everywhere

        serializer = CompanyManagementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        action_name, reason = data['action'], data['reason']
        company = Company.objects.filter(id=data['company_id']).first()
        if company is None:
            return Response({'error': 'Company not found', 'message': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

        def fail(message):
            return Response({'error': message, 'message': message}, status=status.HTTP_400_BAD_REQUEST)

        if action_name == 'ACTIVATE':
            if company.is_active:
                return fail('This company is already active.')
            company.is_active = True
            company.save(update_fields=['is_active', 'updated_at'])
            audit(request, 'COMPANY_ACTIVATED', f'Activated {company.name}. Reason: {reason}', company, reason=reason)
            result, message = 'active', f'{company.name} is active again'
        elif action_name == 'SUSPEND':
            if not company.is_active:
                return fail('This company is already suspended.')
            with transaction.atomic():
                company.is_active = False
                company.save(update_fields=['is_active', 'updated_at'])
                for user in company.users.all():
                    sign_out_everywhere(user)
                audit(request, 'COMPANY_SUSPENDED', f'Suspended {company.name}. Reason: {reason}', company, reason=reason)
            result, message = 'suspended', f'{company.name} is suspended and its users were signed out'
        elif action_name in ('EXTEND_TRIAL', 'RESET_TRIAL'):
            try:
                sub = extend_trial(company, data['days'])
            except BillingError as exc:
                return fail(str(exc))
            except Exception as exc:  # Stripe unreachable
                return Response({'error': f'Stripe didn’t accept the change: {exc}', 'message': 'Stripe is unavailable right now.'},
                                status=status.HTTP_502_BAD_GATEWAY)
            audit(request, 'TRIAL_EXTENDED', f'Extended {company.name}’s trial by {data["days"]} days to {sub.end_date:%d %b %Y}. Reason: {reason}',
                  company, reason=reason, days=data['days'])
            result, message = 'trialing', f'Trial extended to {sub.end_date:%d %b %Y}'
        else:  # DELETE
            if data.get('confirm_name', '').strip() != company.name:
                return fail('Type the company’s exact name to confirm deleting it.')
            name = company.name
            try:
                with transaction.atomic():
                    audit(request, 'COMPANY_DELETED', f'Deleted {name}. Reason: {reason}', None, reason=reason, company_id=str(company.id))
                    company.users.all().delete()
                    company.delete()
            except (ProtectedError, RestrictedError):
                return fail(f'{name} has stock and order history that must be kept, so it can’t be deleted. Suspend it instead.')
            return Response({'message': f'{name} was deleted', 'company_status': 'deleted'})

        if data['notify_users']:
            self._send_company_notification(company, 'RESET_TRIAL' if action_name == 'EXTEND_TRIAL' else action_name, reason, request.user)
        return Response({'message': message, 'company_status': result})

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
        notification = serializer.save(created_by=self.request.user)
        audit(self.request, 'NOTIFICATION_PUBLISHED', f'Created notification “{notification.title}”')

    @action(detail=True, methods=['post'])
    def mark_sent(self, request, pk=None):
        notification = self.get_object()
        notification.is_sent = True
        notification.sent_at = timezone.now()
        notification.save()
        return Response({'message': 'Notification marked as sent', 'sent_at': notification.sent_at})

    @action(detail=True, methods=['post'])
    def send_now(self, request, pk=None):
        """Publish now: it appears in users' notification bell immediately (and until it expires)."""
        notification = self.get_object()
        notification.is_active = True
        notification.is_sent = True
        notification.sent_at = timezone.now()
        notification.scheduled_for = None
        notification.save()
        audit(request, 'NOTIFICATION_PUBLISHED', f'Published notification “{notification.title}”')
        return Response({'message': f'“{notification.title}” is now showing to users', 'sent_at': notification.sent_at})

    @action(detail=False, methods=['get'])
    def active(self, request):
        queryset = self.get_queryset().filter(is_active=True)
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        queryset = self.get_queryset().filter(is_sent=False, is_active=True)
        return Response(self.get_serializer(queryset, many=True).data)