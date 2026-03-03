# backend/apps/tenants/serializers.py
from rest_framework import serializers
from .models import Company, CompanyInvitation, CompanySetting, PlatformAnalytics, AuditLog
from apps.users.models import User


class CompanySettingSerializer(serializers.ModelSerializer):
    """Serializer for structured CompanySetting model."""
    
    class Meta:
        model = CompanySetting
        fields = [
            'timezone', 'currency', 'date_format', 'time_format', 'language',
            'email_notifications', 'push_notifications', 'marketing_emails',
            'fiscal_year_start', 'working_days', 'working_hours_start', 
            'working_hours_end', 'require_2fa', 'session_timeout',
            'api_access_enabled', 'webhook_url', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model."""
    users_count = serializers.SerializerMethodField()
    subscription_status = serializers.CharField(source='subscription.status', read_only=True)
    subscription_plan = serializers.CharField(source='subscription.plan.name', read_only=True)
    logo = serializers.SerializerMethodField() 
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'slug', 'domain', 'logo', 'address', 'phone',
            'email', 'website', 'industry', 'company_size', 'timezone',
            'is_active', 'trial_ends_at', 'onboarding_completed',
            'users_count', 'subscription_status', 'subscription_plan',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_users_count(self, obj):
        return obj.users.filter(is_active=True).count()

    def get_logo(self, obj):
        if obj.logo and obj.logo.name:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None    


class CompanyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating company information."""
    logo = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = Company
        fields = [
            'name', 'logo', 'address', 'phone', 'website', 
            'industry', 'company_size', 'timezone'
        ]


class CompanyInvitationSerializer(serializers.ModelSerializer):
    """Serializer for Company Invitations."""
    invited_by_name = serializers.CharField(source='invited_by.get_full_name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    is_expired = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = CompanyInvitation
        fields = [
            'id', 'email', 'role', 'token', 'invited_by_name',
            'company_name', 'accepted_at', 'expires_at', 'is_expired',
            'status', 'created_at'
        ]
        read_only_fields = ['id', 'token', 'created_at']

    def get_is_expired(self, obj):
        from django.utils import timezone
        return timezone.now() > obj.expires_at
    
    def get_status(self, obj):
        """Compute invitation status."""
        from django.utils import timezone
        
        if obj.accepted_at:
            return 'accepted'
        elif timezone.now() > obj.expires_at:
            return 'expired'
        else:
            return 'pending'


class AcceptInvitationSerializer(serializers.Serializer):
    """Serializer for accepting company invitations."""
    token = serializers.CharField()
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    phone_number = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })
        return attrs


class PlatformAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for Platform Analytics."""
    
    class Meta:
        model = PlatformAnalytics
        fields = [
            'id', 'metric_name', 'metric_value', 'metric_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for Audit Logs."""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_name', 'action', 'resource', 'resource_id',
            'old_values', 'new_values', 'ip_address', 'user_agent',
            'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']