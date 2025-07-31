# apps/platform_admin/serializers.py
from rest_framework import serializers
from django.db.models import Count, Sum, Avg
from .models import PlatformSettings, PlatformAuditLog, SystemHealth, PlatformNotification

class PlatformSettingsSerializer(serializers.ModelSerializer):
    """Serializer for Platform Settings."""
    modified_by_email = serializers.CharField(source='modified_by.email', read_only=True)
    
    class Meta:
        model = PlatformSettings
        fields = [
            'id', 'setting_key', 'setting_value', 'description', 'is_active',
            'modified_by_email', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class PlatformAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for Platform Audit Logs."""
    admin_user_email = serializers.CharField(source='admin_user.email', read_only=True)
    target_company_name = serializers.CharField(source='target_company.name', read_only=True)
    target_user_email = serializers.CharField(source='target_user.email', read_only=True)
    
    class Meta:
        model = PlatformAuditLog
        fields = [
            'id', 'admin_user_email', 'action', 'target_company_name', 
            'target_user_email', 'description', 'ip_address', 'metadata',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class SystemHealthSerializer(serializers.ModelSerializer):
    """Serializer for System Health metrics."""
    
    class Meta:
        model = SystemHealth
        fields = [
            'id', 'metric_name', 'metric_value', 'metric_unit', 'status',
            'threshold_warning', 'threshold_critical', 'description',
            'auto_generated', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'created_at']

class PlatformNotificationSerializer(serializers.ModelSerializer):
    """Serializer for Platform Notifications."""
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    target_company_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PlatformNotification
        fields = [
            'id', 'title', 'message', 'notification_type', 'priority',
            'is_global', 'is_active', 'scheduled_for', 'expires_at',
            'created_by_email', 'target_company_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_target_company_count(self, obj):
        if obj.is_global:
            from apps.tenants.models import Company
            return Company.objects.filter(is_active=True).count()
        return obj.target_companies.count()

class CompanyOverviewSerializer(serializers.Serializer):
    """Serializer for company overview analytics."""
    company_id = serializers.UUIDField()
    company_name = serializers.CharField()
    is_active = serializers.BooleanField()
    subscription_status = serializers.CharField()
    user_count = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    last_activity = serializers.DateTimeField()
    created_at = serializers.DateTimeField()

class PlatformAnalyticsSerializer(serializers.Serializer):
    """Serializer for platform-wide analytics."""
    total_companies = serializers.IntegerField()
    active_companies = serializers.IntegerField()
    total_users = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    monthly_revenue = serializers.ListField()
    subscription_breakdown = serializers.DictField()
    system_health_status = serializers.CharField()
    recent_activity = serializers.ListField()

class SystemHealthDashboardSerializer(serializers.Serializer):
    """Serializer for system health dashboard."""
    overall_status = serializers.CharField()
    cpu_usage = serializers.DecimalField(max_digits=5, decimal_places=2)
    memory_usage = serializers.DecimalField(max_digits=5, decimal_places=2)
    disk_usage = serializers.DecimalField(max_digits=5, decimal_places=2)
    active_connections = serializers.IntegerField()
    response_time_avg = serializers.DecimalField(max_digits=8, decimal_places=2)
    error_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    uptime_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    
class CompanyManagementSerializer(serializers.Serializer):
    """Serializer for company management operations."""
    company_id = serializers.UUIDField()
    action = serializers.ChoiceField(choices=[
        ('ACTIVATE', 'Activate'),
        ('SUSPEND', 'Suspend'),
        ('DELETE', 'Delete'),
        ('RESET_TRIAL', 'Reset Trial'),
    ])
    reason = serializers.CharField(max_length=500)
    notify_users = serializers.BooleanField(default=True)