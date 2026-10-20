# backend/apps/tenants/serializers.py
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Company, CompanyInvitation, CompanySetting, PlatformAnalytics, AuditLog
from apps.users.models import User
from datetime import timedelta
from django.utils import timezone
from zoneinfo import available_timezones

from .roles import ROLE_CHOICES, normalize_role, seats

# Currencies offered for display (ISO 4217); East Africa first
CURRENCIES = ['KES', 'UGX', 'TZS', 'RWF', 'ETB', 'NGN', 'GHS', 'ZAR', 'EGP', 'MAD', 'USD', 'EUR', 'GBP', 'AED', 'INR', 'CNY']


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

    def validate_currency(self, value):
        value = (value or '').upper()
        if value not in CURRENCIES:
            raise serializers.ValidationError(f'Choose one of: {", ".join(CURRENCIES)}.')
        return value

    def validate_timezone(self, value):
        if value not in available_timezones() and value != 'UTC':
            raise serializers.ValidationError('Choose a time zone from the list, e.g. Africa/Nairobi.')
        return value

    def validate_working_days(self, value):
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        cleaned = [d.lower() for d in value or []]
        if not cleaned or any(d not in days for d in cleaned):
            raise serializers.ValidationError('Pick at least one day of the week.')
        return [d for d in days if d in cleaned]

    def validate_session_timeout(self, value):
        if not 15 <= value <= 24 * 60:
            raise serializers.ValidationError('Between 15 minutes and 24 hours.')
        return value

    def validate(self, attrs):
        start = attrs.get('working_hours_start', getattr(self.instance, 'working_hours_start', None))
        end = attrs.get('working_hours_end', getattr(self.instance, 'working_hours_end', None))
        if start and end and str(end) <= str(start):
            raise serializers.ValidationError({'working_hours_end': 'The day must end after it starts.'})
        return attrs

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        # Company.timezone mirrors the settings so older code reading it stays right
        if 'timezone' in validated_data and instance.company.timezone != instance.timezone:
            instance.company.timezone = instance.timezone
            instance.company.save(update_fields=['timezone'])
        return instance


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model."""
    users_count = serializers.SerializerMethodField()
    subscription_status = serializers.SerializerMethodField()
    subscription_plan = serializers.SerializerMethodField()
    seats_used = serializers.SerializerMethodField()
    seats_limit = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    logo = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'slug', 'domain', 'logo', 'address', 'phone',
            'email', 'website', 'industry', 'company_size', 'timezone',
            'is_active', 'trial_ends_at', 'onboarding_completed',
            'users_count', 'subscription_status', 'subscription_plan', 'seats_used', 'seats_limit', 'currency',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_users_count(self, obj):
        return obj.users.filter(is_active=True).count()

    def _live(self, obj):
        if not hasattr(self, '_live_cache'):
            from apps.payments.billing import live_subscription
            self._live_cache = live_subscription(obj)
        return self._live_cache

    def get_subscription_status(self, obj):
        sub = self._live(obj)
        return sub.status if sub else None

    def get_subscription_plan(self, obj):
        sub = self._live(obj)
        return sub.plan.name if sub else None

    def get_seats_used(self, obj):
        return seats(obj)[0]

    def get_seats_limit(self, obj):
        return seats(obj)[1]

    def get_currency(self, obj):
        return getattr(getattr(obj, 'settings', None), 'currency', None) or 'USD'

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
            'name', 'logo', 'address', 'phone', 'email', 'website',
            'industry', 'company_size', 'onboarding_completed'
        ]

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Enter your company name.')
        return value


class CompanyInvitationSerializer(serializers.ModelSerializer):
    """Serializer for Company Invitations."""
    invited_by_name = serializers.CharField(source='invited_by.get_full_name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    invitation_url = serializers.SerializerMethodField()
    # Included in the invitation email only; not stored
    message = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=500)
    is_expired = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    role = serializers.CharField(max_length=50)
    expires_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = CompanyInvitation
        fields = [
            'id', 'email', 'role', 'token', 'invitation_url', 'invited_by_name',
            'company_name', 'accepted_at', 'expires_at', 'is_expired',
            'status', 'created_at', 'message'
        ]
        read_only_fields = ['id', 'token', 'created_at']

    def validate_role(self, value):
        role = normalize_role(value)
        if role not in dict(ROLE_CHOICES):
            raise serializers.ValidationError('Choose a role from the list.')
        return role

    def validate(self, attrs):
        used, limit = seats(self.context['request'].user.company)
        if limit is not None and used >= limit:
            raise serializers.ValidationError(
                f'Your plan includes {limit} users and all are taken (members plus pending invitations). '
                'Upgrade your plan or revoke an invitation to invite someone new.'
            )
        return attrs

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('This person already has a LogiFlow account.')
        company = self.context['request'].user.company
        if CompanyInvitation.objects.filter(
            company=company, email__iexact=email, accepted_at__isnull=True, expires_at__gt=timezone.now(),
        ).exists():
            raise serializers.ValidationError('This person already has a pending invitation. Resend it instead.')
        return email

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

    def get_invitation_url(self, obj):
        from .emails import invitation_url
        return invitation_url(obj)


class AcceptInvitationSerializer(serializers.Serializer):
    """Serializer for accepting company invitations."""
    token = serializers.CharField()
    # Same password rules as registration
    password = serializers.CharField(write_only=True, validators=[validate_password])
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


class MemberSerializer(serializers.ModelSerializer):
    """A company member as the team page shows it; owners change role and active status."""
    full_name = serializers.SerializerMethodField()
    role = serializers.ChoiceField(choices=ROLE_CHOICES, required=False)
    is_you = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'phone_number', 'profile_picture',
                  'role', 'is_active', 'is_you', 'date_joined', 'last_login']
        read_only_fields = ['id', 'email', 'first_name', 'last_name', 'phone_number', 'date_joined', 'last_login']

    def get_full_name(self, obj):
        return obj.get_full_name() if (obj.first_name or obj.last_name) else obj.email

    def get_is_you(self, obj):
        return obj.pk == self.context['request'].user.pk

    def get_profile_picture(self, obj):
        if obj.profile_picture and obj.profile_picture.name:
            return self.context['request'].build_absolute_uri(obj.profile_picture.url)
        return None

    def to_representation(self, obj):
        data = super().to_representation(obj)
        data['role'] = obj.role if obj.role != 'user' else 'member'
        return data


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