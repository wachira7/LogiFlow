# apps/users/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password

from rest_framework_simplejwt.tokens import RefreshToken
import uuid
from .models import User, UserNotificationPreferences
from apps.tenants.models import Company, CompanyInvitation

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model with UUID support."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    full_name = serializers.SerializerMethodField()
    role = serializers.CharField(read_only=True)
    profile_picture = serializers.SerializerMethodField()
    company_currency = serializers.SerializerMethodField()
    company_is_demo = serializers.SerializerMethodField()
    demo_expires_at = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone_number', 'profile_picture', 'company_id', 'company_name', 'company_currency', 'company_is_demo', 'demo_expires_at',
            'is_active','is_platform_admin', 'is_company_owner', 'is_warehouse_manager',
            'is_production_manager', 'is_logistics_coordinator',
            'is_inventory_manager', 'is_driver', 'role', 'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'company_id', 'is_platform_admin', 'role']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

    def get_company_currency(self, obj):
        """The company's display currency (Company settings), so every member formats money the same way."""
        settings = getattr(obj.company, 'settings', None) if obj.company_id else None
        return getattr(settings, 'currency', None) or 'USD'

    def get_company_is_demo(self, obj):
        return bool(obj.company_id and obj.company.is_demo)

    def get_demo_expires_at(self, obj):
        return obj.company.demo_expires_at if obj.company_id and obj.company.is_demo else None

    def get_profile_picture(self, obj):
        if obj.profile_picture and obj.profile_picture.name:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None

class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration with UUID support."""
    password = serializers.CharField(
        write_only=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    company_name = serializers.CharField(write_only=True)
    company_industry = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm', 'first_name', 
            'last_name', 'phone_number', 'company_name', 'company_industry'
        ]

    def validate(self, attrs):
        """Validate passwords match."""
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })
        return attrs

    def create(self, validated_data):
        """Create user and company with UUID."""
        # Remove password_confirm and company fields
        validated_data.pop('password_confirm')
        company_name = validated_data.pop('company_name')
        company_industry = validated_data.pop('company_industry', '')

        # Create company first with UUID
        company_slug = company_name.lower().replace(' ', '-').replace('_', '-')
        # Ensure unique slug
        base_slug = company_slug
        counter = 1
        while Company.objects.filter(slug=company_slug).exists():
            company_slug = f"{base_slug}-{counter}"
            counter += 1

        company = Company.objects.create(
            name=company_name,
            slug=company_slug,
            industry=company_industry,
            email=validated_data['email']
        )

        # Create user with company reference
        user = User.objects.create_user(
            username=validated_data['email'], # Use email as username
            company=company,
            is_company_owner=True,  # First user is company owner
            is_platform_admin=False,    # NEVER allow via signup
            is_superuser=False,         # NEVER allow via signup  
            is_staff=False,             # NEVER allow via signup
            **validated_data
        )

        return user

class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})

    def validate(self, attrs):
        """Validate user credentials."""
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(
                request=self.context.get('request'),
                username=email,
                password=password
            )

            if not user:
                raise serializers.ValidationError(
                    'Invalid email or password.',
                    code='authorization'
                )

            if not user.is_active:
                raise serializers.ValidationError(
                    'User account is disabled.',
                    code='authorization'
                )

            if user.company_id and not user.company.is_active and not user.is_platform_admin:
                raise serializers.ValidationError(
                    'Your company’s LogiFlow account is suspended. Please contact support.',
                    code='authorization'
                )

            attrs['user'] = user
            return attrs

        raise serializers.ValidationError(
            'Must include email and password.',
            code='authorization'
        )

class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password."""
    old_password = serializers.CharField(style={'input_type': 'password'})
    new_password = serializers.CharField(
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(style={'input_type': 'password'})

    def validate(self, attrs):
        """Validate passwords."""
        if attrs.get('new_password') != attrs.get('new_password_confirm'):
            raise serializers.ValidationError({
                'new_password_confirm': 'New passwords do not match.'
            })
        return attrs

    def validate_old_password(self, value):
        """Validate old password."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value

class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone_number', 'profile_picture'
        ]

class UserNotificationPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotificationPreferences
        exclude = ['id', 'user', 'updated_at']
