# apps/users/password_reset.py
"""Forgot-password and reset-password endpoints."""
import logging
from html import escape

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from utils.emails import send_email

from .models import User

logger = logging.getLogger(__name__)

GENERIC_FORGOT_MESSAGE = 'If an account exists for that email, we have sent a link to reset the password.'
INVALID_LINK_MESSAGE = 'This reset link is invalid or has expired. Please request a new one.'


def make_reset_token(user) -> str:
    """One opaque token for the link: "<uidb64>.<signed token>"."""
    return f"{urlsafe_base64_encode(force_bytes(user.pk))}.{default_token_generator.make_token(user)}"


def user_from_reset_token(token: str):
    """Return the user a valid token belongs to, or None."""
    try:
        uidb64, signed = token.split('.', 1)
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(uidb64)), is_active=True)
    except (ValueError, TypeError, OverflowError, User.DoesNotExist, DjangoValidationError):
        return None
    return user if default_token_generator.check_token(user, signed) else None


def send_reset_email(user):
    link = f"{settings.FRONTEND_URL.rstrip('/')}/auth/reset-password?token={make_reset_token(user)}"
    minutes = settings.PASSWORD_RESET_TIMEOUT // 60
    name = escape(user.first_name or 'there')
    text = (
        f"Hi {user.first_name or 'there'},\n\n"
        f"We received a request to reset your LogiFlow password. Use this link within {minutes} minutes:\n\n"
        f"{link}\n\nIf you didn't ask for this, you can ignore this email; your password won't change.\n"
    )
    html = f"""
        <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
          <h2 style="margin: 0 0 16px;">Reset your password</h2>
          <p>Hi {name},</p>
          <p>We received a request to reset your LogiFlow password. This link works for {minutes} minutes.</p>
          <p style="margin: 28px 0;">
            <a href="{escape(link)}" style="background: #0e7c86; color: #fff; padding: 12px 22px; border-radius: 8px;
               text-decoration: none; font-weight: 600;">Reset password</a>
          </p>
          <p style="color: #64748b; font-size: 14px;">If you didn't ask for this, you can ignore this email;
             your password won't change.</p>
        </div>
    """
    return send_email(user.email, 'Reset your LogiFlow password', html, text)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'})
    password_confirm = serializers.CharField(style={'input_type': 'password'})

    def validate(self, attrs):
        user = user_from_reset_token(attrs['token'])
        if user is None:
            raise serializers.ValidationError({'token': INVALID_LINK_MESSAGE})
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        try:
            validate_password(attrs['password'], user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)})
        attrs['user'] = user
        return attrs


class ForgotPasswordView(APIView):
    """Always answers the same way, so it can't be used to find out which emails have accounts."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data['email'], is_active=True).first()
        if user:
            send_reset_email(user)
        return Response({'message': GENERIC_FORGOT_MESSAGE})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        user.set_password(serializer.validated_data['password'])
        user.save(update_fields=['password'])

        # Sign out everywhere: existing refresh tokens can no longer be used
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)

        logger.info('Password reset for user %s', user.pk)
        return Response({'message': 'Your password has been reset. You can now sign in.'}, status=status.HTTP_200_OK)
