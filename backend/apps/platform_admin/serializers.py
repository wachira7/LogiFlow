# apps/platform_admin/serializers.py
from rest_framework import serializers
from django.db.models import Count, Sum, Avg
from apps.tenants.models import Company

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
    target_company_ids = serializers.PrimaryKeyRelatedField(source='target_companies', many=True, required=False, queryset=Company.objects.all())
    target_company_names = serializers.SerializerMethodField()

    class Meta:
        model = PlatformNotification
        fields = [
            'id', 'title', 'message', 'notification_type', 'priority',
            'is_global', 'is_active', 'scheduled_for', 'expires_at','is_sent', 'sent_at',
            'created_by_email', 'target_company_count', 'target_company_ids', 'target_company_names', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_target_company_names(self, obj):
        return [c.name for c in obj.target_companies.all()[:10]]

    def validate(self, attrs):
        is_global = attrs.get('is_global', getattr(self.instance, 'is_global', False))
        targets = attrs.get('target_companies')
        if targets is None and self.instance is not None:
            targets = list(self.instance.target_companies.all())
        if not is_global and not targets:
            raise serializers.ValidationError('Send it to everyone or pick at least one company.')
        start = attrs.get('scheduled_for', getattr(self.instance, 'scheduled_for', None))
        end = attrs.get('expires_at', getattr(self.instance, 'expires_at', None))
        if start and end and end <= start:
            raise serializers.ValidationError({'expires_at': 'It must expire after it starts showing.'})
        return attrs

    def get_target_company_count(self, obj):
        if obj.is_global:
            from apps.tenants.models import Company
            return Company.objects.filter(is_active=True).count()
        return obj.target_companies.count()

    
class CompanyManagementSerializer(serializers.Serializer):
    """Activate, suspend, extend a trial or delete a company. Deleting needs the company name typed back."""
    company_id = serializers.UUIDField()
    action = serializers.ChoiceField(choices=[
        ('ACTIVATE', 'Activate'), ('SUSPEND', 'Suspend'), ('EXTEND_TRIAL', 'Extend trial'),
        ('RESET_TRIAL', 'Extend trial (old name)'), ('DELETE', 'Delete'),
    ])
    reason = serializers.CharField(max_length=500)
    notify_users = serializers.BooleanField(default=False)
    days = serializers.IntegerField(min_value=1, max_value=90, default=14)
    confirm_name = serializers.CharField(required=False, allow_blank=True)

    def validate_reason(self, value):
        value = value.strip()
        if len(value) < 5:
            raise serializers.ValidationError('Give a short reason (it’s kept in the audit log).')
        return value
