# backend/apps/tenants/views.py

from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction
from datetime import timedelta
import logging
import secrets
from rest_framework.exceptions import NotFound
from .models import CompanyInvitation, CompanySetting, AuditLog
from .roles import apply_role, sign_out_everywhere
from .serializers import (
    CompanySerializer, CompanyUpdateSerializer, CompanyInvitationSerializer,
    AcceptInvitationSerializer, CompanySettingSerializer, AuditLogSerializer, MemberSerializer,
)
from utils.permissions import IsCompanyOwnerOrAdmin, IsCompanyMember
from .emails import invitation_url, send_invitation_email

User = get_user_model()
logger = logging.getLogger(__name__)


def company_of(request):
    """The signed-in user's company, or a clear 404 (e.g. platform admins have none)."""
    company = getattr(request.user, 'company', None)
    if company is None:
        raise NotFound('This account isn’t part of a company.')
    return company


class CompanyDetailView(generics.RetrieveUpdateAPIView):
    """Company detail (any member) and update (owners/admins) endpoint."""
    permission_classes = [IsCompanyMember]
    # The frontend sends JSON; multipart stays supported for form posts
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH'):
            return [IsCompanyMember(), IsCompanyOwnerOrAdmin()]
        return super().get_permissions()
    
    def get_object(self):
        return company_of(self.request)

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        return Response(CompanySerializer(company_of(request), context={'request': request}).data)

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CompanyUpdateSerializer
        return CompanySerializer


@api_view(['POST'])
@permission_classes([IsCompanyOwnerOrAdmin])
@parser_classes([MultiPartParser, FormParser])
def upload_company_logo(request):
    """Upload company logo."""
    company = company_of(request)
    logo_file = request.FILES.get('logo')
    if not logo_file:
        return Response({'error': 'Choose an image to upload.'}, status=status.HTTP_400_BAD_REQUEST)
    if logo_file.size > 5 * 1024 * 1024:
        return Response({'error': 'The image must be 5 MB or smaller.'}, status=status.HTTP_400_BAD_REQUEST)
    # Raster images only (SVG can carry scripts); confirm it really is an image, not just its name
    from PIL import Image, UnidentifiedImageError
    try:
        with Image.open(logo_file) as img:
            kind = (img.format or '').upper()
            img.verify()
    except (UnidentifiedImageError, OSError, ValueError):
        return Response({'error': 'That file isn’t an image we can use.'}, status=status.HTTP_400_BAD_REQUEST)
    if kind not in ('PNG', 'JPEG', 'WEBP', 'GIF'):
        return Response({'error': 'Use a PNG, JPG, WEBP or GIF image.'}, status=status.HTTP_400_BAD_REQUEST)
    logo_file.seek(0)
    company.logo = logo_file
    company.save()
    company.refresh_from_db()
    return Response({'logo_url': company.logo.url if company.logo else None, 'message': 'Logo updated'})


class CompanyInvitationsView(generics.ListCreateAPIView):
    """List and create company invitations."""
    serializer_class = CompanyInvitationSerializer
    permission_classes = [IsCompanyOwnerOrAdmin]
    
 
    def get_queryset(self):
        return CompanyInvitation.objects.filter(
            company=company_of(self.request), accepted_at__isnull=True,
        ).select_related('invited_by', 'company').order_by('-created_at')

    
    def perform_create(self, serializer):
        message = serializer.validated_data.pop('message', '')
        invitation = serializer.save(
            company=company_of(self.request),
            invited_by=self.request.user,
            token=secrets.token_urlsafe(32),
            expires_at=timezone.now() + timedelta(days=7),
        )
        self.email_sent = send_invitation_email(invitation, message=message)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        # Tell the inviter whether the email actually went out; the link lets them share it another way
        response.data['email_sent'] = self.email_sent
        return response


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def accept_invitation(request):
    """Accept company invitation and create user account."""
    serializer = AcceptInvitationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    token = serializer.validated_data['token']
    
    try:
        invitation = CompanyInvitation.objects.get(
            token=token,
            accepted_at__isnull=True,
            expires_at__gt=timezone.now()
        )
    except CompanyInvitation.DoesNotExist:
        return Response({
            'error': 'Invalid or expired invitation token'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user already exists
    if User.objects.filter(email=invitation.email).exists():
        return Response({
            'error': 'User with this email already exists'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create user account
    with transaction.atomic():
        user_data = {
            'email': invitation.email,
            'username': invitation.email,  # email doubles as username, as in registration
            'first_name': serializer.validated_data['first_name'],
            'last_name': serializer.validated_data['last_name'],
            'phone_number': serializer.validated_data.get('phone_number', ''),
            'company': invitation.company,
            'password': serializer.validated_data['password']
        }
        
        user = User(**{k: v for k, v in user_data.items() if k != 'password'})
        user.set_password(user_data['password'])
        apply_role(user, invitation.role)
        user.save()
        
        # Mark invitation as accepted
        invitation.accepted_at = timezone.now()
        invitation.save()
    
    return Response({
        'message': 'Invitation accepted successfully',
        'user_id': str(user.id),
        'email': user.email
    })


@api_view(['POST'])
@permission_classes([IsCompanyOwnerOrAdmin])
def resend_invitation(request, invitation_id):
    try:
        invitation = CompanyInvitation.objects.get(
            id=invitation_id,
            company=company_of(request),
            accepted_at__isnull=True
        )
    except CompanyInvitation.DoesNotExist:
        return Response({
            'error': 'Invitation not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    invitation.expires_at = timezone.now() + timedelta(days=7)
    invitation.save(update_fields=['expires_at'])
    email_sent = send_invitation_email(invitation, reminder=True)

    return Response({
        'message': 'Invitation resent' if email_sent else 'Invitation renewed, but the email could not be sent',
        'email_sent': email_sent,
        'invitation_url': invitation_url(invitation),
        'expires_at': invitation.expires_at,
    })

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def validate_invitation_token(request):
    """Validate invitation token and return invitation details."""
    token = request.query_params.get('token')
    
    if not token:
        return Response({
            'error': 'Token is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        invitation = CompanyInvitation.objects.select_related(
            'company', 'invited_by'
        ).get(
            token=token,
            accepted_at__isnull=True,
            expires_at__gt=timezone.now()
        )
    except CompanyInvitation.DoesNotExist:
        return Response({
            'error': 'This invitation is invalid or has expired.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'email': invitation.email,
        'company_name': invitation.company.name,
        'role': invitation.role,
        'invited_by_name': invitation.invited_by.get_full_name() or invitation.invited_by.email,
        'expires_at': invitation.expires_at,
        'is_expired': False,
    })

@api_view(['DELETE'])
@permission_classes([IsCompanyOwnerOrAdmin])
def revoke_invitation(request, invitation_id):
    """Revoke/delete company invitation."""
    try:
        invitation = CompanyInvitation.objects.get(
            id=invitation_id,
            company=company_of(request),
            accepted_at__isnull=True
        )
        invitation.delete()
        return Response({
            'message': 'Invitation revoked successfully'
        })
    except CompanyInvitation.DoesNotExist:
        return Response({
            'error': 'Invitation not found'
        }, status=status.HTTP_404_NOT_FOUND)


class CompanyMembersView(generics.ListAPIView):
    """Everyone in the company (any member can see the team)."""
    serializer_class = MemberSerializer
    permission_classes = [IsCompanyMember]

    def get_queryset(self):
        return User.objects.filter(company=company_of(self.request)).order_by('-is_active', 'date_joined')


class CompanyMemberDetailView(generics.RetrieveUpdateAPIView):
    """Owners change a member's role or deactivate/reactivate them. You can't change yourself or the last owner."""
    serializer_class = MemberSerializer
    http_method_names = ['get', 'patch']

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsCompanyMember(), IsCompanyOwnerOrAdmin()]
        return [IsCompanyMember()]

    def get_queryset(self):
        return User.objects.filter(company=company_of(self.request))

    def partial_update(self, request, *args, **kwargs):
        member = self.get_object()
        if member.pk == request.user.pk:
            return Response({'error': 'You can’t change your own role or access. Ask another owner.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(member, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data.get('role')
        active = serializer.validated_data.get('is_active', member.is_active)
        losing_owner = member.is_company_owner and ((role and role != 'company_owner') or not active)
        if losing_owner and not User.objects.filter(company=member.company, is_company_owner=True, is_active=True).exclude(pk=member.pk).exists():
            return Response({'error': 'A company needs at least one active owner.'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            if role:
                apply_role(member, role)
            if member.is_active and not active:
                sign_out_everywhere(member)
            member.is_active = active
            member.save()
        return Response(self.get_serializer(member).data)


class CompanySettingsView(generics.RetrieveUpdateAPIView):
    """Get and update company settings."""
    serializer_class = CompanySettingSerializer
    permission_classes = [IsCompanyOwnerOrAdmin]
    
    def get_object(self):
        company_settings, _ = CompanySetting.objects.get_or_create(company=company_of(self.request))
        return company_settings


class AuditLogView(generics.ListAPIView):
    """Company audit logs."""
    serializer_class = AuditLogSerializer
    permission_classes = [IsCompanyOwnerOrAdmin]
    filterset_fields = ['action', 'resource']
    search_fields = ['action', 'resource', 'user__first_name', 'user__last_name']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        return AuditLog.objects.filter(company=company_of(self.request)).select_related('user')