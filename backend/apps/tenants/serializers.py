# apps/tenants/serializers.py
from rest_framework import serializers
from .models import Company, CompanyInvitation, CompanySetting, PlatformAnalytics, AuditLog
from apps.users.models import User

class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model."""
    users_count = serializers.SerializerMethodField()
    subscription_status = serializers.CharField(source='subscription.status', read_only=True)
    subscription_plan = serializers.CharField(source='subscription.plan.name', read_only=True)

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

class CompanyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating company information."""
    
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

    class Meta:
        model = CompanyInvitation
        fields = [
            'id', 'email', 'role', 'token', 'invited_by_name',
            'company_name', 'accepted_at', 'expires_at', 'is_expired',
            'created_at'
        ]
        read_only_fields = ['id', 'token', 'created_at']

    def get_is_expired(self, obj):
        from django.utils import timezone
        return timezone.now() > obj.expires_at

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

class CompanySettingSerializer(serializers.ModelSerializer):
    """Serializer for Company Settings."""
    
    class Meta:
        model = CompanySetting
        fields = [
            'id', 'setting_key', 'setting_value', 'setting_type',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

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
