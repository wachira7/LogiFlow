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
            'is_global', 'is_active', 'scheduled_for', 'expires_at','is_sent', 'sent_at',
            'created_by_email', 'target_company_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_target_company_count(self, obj):
        if obj.is_global:
            from apps.tenants.models import Company
            return Company.objects.filter(is_active=True).count()
        return obj.target_companies.count()

    
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