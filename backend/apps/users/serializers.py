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

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone_number', 'profile_picture', 'company_id', 'company_name',
            'is_active','is_platform_admin', 'is_company_owner', 'is_warehouse_manager',
            'is_production_manager', 'is_logistics_coordinator',
            'is_inventory_manager', 'is_driver', 'role', 'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'company_id', 'is_platform_admin', 'role']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

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

class InviteUserSerializer(serializers.ModelSerializer):
    """Serializer for inviting users to company with UUID support."""
    id = serializers.UUIDField(read_only=True)
    role = serializers.ChoiceField(choices=[
        ('ADMIN', 'Admin'),
        ('MANAGER', 'Manager'), 
        ('USER', 'User')
    ])

    class Meta:
        model = CompanyInvitation
        fields = ['id', 'email', 'role']

    # Replace the TODO in InviteUserSerializer.create() method

def create(self, validated_data):
    """Create company invitation with UUID."""
    company = self.context['request'].user.company
    invited_by = self.context['request'].user
    
    # Generate unique token
    invitation_token = str(uuid.uuid4())
    
    invitation = CompanyInvitation.objects.create(
        company=company,
        invited_by=invited_by,
        token=invitation_token,
        **validated_data
    )
    
    # Send invitation email
    self._send_invitation_email(invitation)
    return invitation

def _send_invitation_email(self, invitation):
    """Send invitation email to the invitee."""
    from django.core.mail import send_mail
    from django.conf import settings
    from django.template.loader import render_to_string
    
    try:
        # Create invitation URL
        invitation_url = f"{settings.FRONTEND_URL}/invitations/accept/{invitation.token}/"
        
        # Email context
        context = {
            'invitation': invitation,
            'company_name': invitation.company.name,
            'invited_by_name': invitation.invited_by.get_full_name(),
            'invitation_url': invitation_url,
            'role': invitation.role
        }
        
        # Email content
        subject = f"You're invited to join {invitation.company.name} on LogiFlow"
        
        # HTML email template (you'd create this template file)
        html_message = render_to_string('emails/invitation.html', context)
        
        # Plain text fallback
        plain_message = f"""
        Hi there!
        
        {invitation.invited_by.get_full_name()} has invited you to join {invitation.company.name} on LogiFlow.
        
        Role: {invitation.role}
        
        To accept this invitation, click here: {invitation_url}
        
        This invitation will expire in 7 days.
        
        Best regards,
        The LogiFlow Team
        """
        
        # Send email
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invitation.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        # Log successful email
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Invitation email sent to {invitation.email} for company {invitation.company.name}")
        
    except Exception as e:
        # Log email failure but don't break the invitation creation
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send invitation email to {invitation.email}: {str(e)}")
        
        # You might want to set a flag on the invitation model
        # invitation.email_sent = False
        # invitation.save()

class UserNotificationPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotificationPreferences
        exclude = ['id', 'user', 'updated_at']
