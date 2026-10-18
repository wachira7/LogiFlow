# backend/apps/tenants/views.py
from venv import logger

import resend
import os
from django.conf import settings
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction
from datetime import timedelta
import secrets
from .models import Company, CompanyInvitation, CompanySetting, AuditLog
from .serializers import (
    CompanySerializer, CompanyUpdateSerializer, CompanyInvitationSerializer,
    AcceptInvitationSerializer, CompanySettingSerializer, AuditLogSerializer
)
from utils.permissions import IsCompanyOwnerOrAdmin, IsCompanyMember

User = get_user_model()


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
        return self.request.user.company
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CompanyUpdateSerializer
        return CompanySerializer


@api_view(['POST'])
@permission_classes([IsCompanyOwnerOrAdmin])
@parser_classes([MultiPartParser, FormParser])
def upload_company_logo(request):
    """Upload company logo."""
    company = request.user.company
    logo_file = request.FILES.get('logo')
    
    if not logo_file:
        return Response({
            'error': 'No logo file provided'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate file size (max 10MB)
    if logo_file.size > 10 * 1024 * 1024:
        return Response({
            'error': 'File size exceeds 10MB limit'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate file type
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp','.bmp', '.tiff', '.tif', '.heic', '.heif','.avif', '.svg']
    file_extension = '.' + logo_file.name.split('.')[-1].lower()
    if file_extension not in allowed_extensions:
        return Response({
            'error': 'Invalid file type. Only JPG, PNG, GIF, WEBP, BMP, TIFF, HEIC, HEIF, AVIF and SVG are allowed'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Save logo
    company.logo = logo_file
    company.save()
    company.refresh_from_db() # Ensure we have the latest data from the database-reloads the company instance to get the updated logo URL(cloudinary URL after upload)
    
    return Response({
        'logo_url': company.logo.url if company.logo else None,
        'message': 'Logo uploaded successfully'
    })


class CompanyInvitationsView(generics.ListCreateAPIView):
    """List and create company invitations."""
    serializer_class = CompanyInvitationSerializer
    permission_classes = [IsCompanyOwnerOrAdmin]
    
    def get_queryset(self):
        return CompanyInvitation.objects.filter(
            company=self.request.user.company
        ).select_related('invited_by', 'company').order_by('-created_at')
    
    
    def perform_create(self, serializer):
            token = secrets.token_urlsafe(32)
            expires_at = timezone.now() + timedelta(days=7)
            
            invitation = serializer.save(
                company=self.request.user.company,
                invited_by=self.request.user,
                token=token,
                expires_at=expires_at
            )
            
            invitation_url = f"{settings.FRONTEND_URL}/auth/accept-invitation?token={token}"
            inviter_name = self.request.user.get_full_name() or self.request.user.email
            company_name = invitation.company.name
            role_display = invitation.role.replace('_', ' ').title()

            resend.api_key = os.environ.get("RESEND_API_KEY")
            
            try:
                resend.Emails.send({
                    "from": "LogiFlow <onboarding@resend.dev>",
                    "to": [invitation.email],
                    "subject": f"{inviter_name} has invited you to join {company_name} on LogiFlow",
                    "html": f"""
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: #10b981; padding: 24px; text-align: center;">
                                <h1 style="color: white; margin: 0;">You're Invited!</h1>
                            </div>
                            
                            <div style="padding: 32px; background: #ffffff;">
                                <h2 style="color: #1f2937;">Hi there,</h2>
                                
                                <p style="color: #4b5563; font-size: 16px;">
                                    <strong>{inviter_name}</strong> ({self.request.user.email}) has invited you 
                                    to join <strong>{company_name}</strong> on LogiFlow as 
                                    <strong>{role_display}</strong>.
                                </p>

                                <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
                                    <p style="color: #4b5563; margin: 0; font-size: 14px;">
                                        <strong>What is LogiFlow?</strong><br/>
                                        LogiFlow is a logistics management platform that {company_name} uses 
                                        to manage their inventory, distribution, and operations.
                                    </p>
                                </div>

                                <p style="color: #4b5563; font-size: 15px;">As a team member, you'll be able to:</p>
                                <ul style="color: #4b5563; font-size: 15px; line-height: 1.8;">
                                    <li>View and manage your assigned tasks</li>
                                    <li>Track shipments and inventory in real-time</li>
                                    <li>Collaborate with your team at {company_name}</li>
                                </ul>

                                <div style="text-align: center; margin: 32px 0;">
                                    <a href="{invitation_url}" 
                                    style="background: #10b981; color: white; padding: 14px 32px; 
                                            border-radius: 8px; text-decoration: none; font-size: 16px;
                                            font-weight: bold; display: inline-block;">
                                        Accept Invitation
                                    </a>
                                </div>

                                <p style="color: #6b7280; font-size: 14px;">
                                    Or copy this link: <a href="{invitation_url}" style="color: #10b981;">{invitation_url}</a>
                                </p>

                                <p style="color: #6b7280; font-size: 14px;">
                                    ⏰ This invitation expires on 
                                    <strong>{expires_at.strftime('%B %d, %Y at %H:%M UTC')}</strong>.
                                </p>

                                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>
                                
                                <p style="color: #9ca3af; font-size: 13px;">
                                    If you don't know <strong>{company_name}</strong> or weren't expecting 
                                    this invitation, you can safely ignore this email. No account will be 
                                    created without your action.
                                </p>
                            </div>

                            <div style="background: #f9fafb; padding: 16px; text-align: center;">
                                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                    Sent by LogiFlow on behalf of {company_name}<br/>
                                    © 2025 WaruTech. All rights reserved.
                                </p>
                            </div>
                        </div>
                    """,
                })
                logger.info(f"Invitation email sent to {invitation.email}")
            except Exception as e:
                logger.error(f"Failed to send invitation email to {invitation.email}: {str(e)}")


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
        
        # Set role based on invitation
        role = invitation.role.lower()
        if role == 'company_owner':
            user_data['is_company_owner'] = True
        elif role == 'admin':
            user_data['is_company_owner'] = True
        elif role == 'manager':
            user_data['is_warehouse_manager'] = True
        
        user = User.objects.create_user(**user_data)
        
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
            company=request.user.company,
            accepted_at__isnull=True
        )
    except CompanyInvitation.DoesNotExist:
        return Response({
            'error': 'Invitation not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    invitation.expires_at = timezone.now() + timedelta(days=7)
    invitation.save()
    
    invitation_url = f"{settings.FRONTEND_URL}/auth/accept-invitation?token={invitation.token}"
    inviter_name = request.user.get_full_name() or request.user.email
    company_name = invitation.company.name
    role_display = invitation.role.replace('_', ' ').title()

    resend.api_key = os.environ.get("RESEND_API_KEY")

    try:
        resend.Emails.send({
            "from": "LogiFlow <onboarding@resend.dev>",
            "to": [invitation.email],
            "subject": f"Reminder: {inviter_name} invited you to join {company_name} on LogiFlow",
            "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #10b981; padding: 24px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Invitation Reminder</h1>
                    </div>

                    <div style="padding: 32px; background: #ffffff;">
                        <h2 style="color: #1f2937;">Hi there,</h2>

                        <p style="color: #4b5563; font-size: 16px;">
                            This is a reminder that <strong>{inviter_name}</strong> has invited you 
                            to join <strong>{company_name}</strong> on LogiFlow as 
                            <strong>{role_display}</strong>.
                        </p>

                        <div style="text-align: center; margin: 32px 0;">
                            <a href="{invitation_url}"
                               style="background: #10b981; color: white; padding: 14px 32px;
                                      border-radius: 8px; text-decoration: none; font-size: 16px;
                                      font-weight: bold; display: inline-block;">
                                Accept Invitation
                            </a>
                        </div>

                        <p style="color: #6b7280; font-size: 14px;">
                            ⏰ This invitation now expires on 
                            <strong>{invitation.expires_at.strftime('%B %d, %Y at %H:%M UTC')}</strong>.
                        </p>

                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>

                        <p style="color: #9ca3af; font-size: 13px;">
                            If you don't know <strong>{company_name}</strong> or weren't expecting 
                            this invitation, you can safely ignore this email.
                        </p>
                    </div>

                    <div style="background: #f9fafb; padding: 16px; text-align: center;">
                        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                            Sent by LogiFlow on behalf of {company_name}<br/>
                            © 2025 WaruTech. All rights reserved.
                        </p>
                    </div>
                </div>
            """,
        })
        logger.info(f"Invitation reminder sent to {invitation.email}")
    except Exception as e:
        logger.error(f"Failed to resend invitation: {str(e)}")
        return Response({
            'error': f'Failed to send email: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({
        'message': 'Invitation resent successfully',
        'expires_at': invitation.expires_at
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
            company=request.user.company,
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


class CompanySettingsView(generics.RetrieveUpdateAPIView):
    """Get and update company settings."""
    serializer_class = CompanySettingSerializer
    permission_classes = [IsCompanyOwnerOrAdmin]
    
    def get_object(self):
        company = self.request.user.company
        # Get or create settings for the company
        settings, created = CompanySetting.objects.get_or_create(company=company)
        return settings


class AuditLogView(generics.ListAPIView):
    """Company audit logs."""
    serializer_class = AuditLogSerializer
    permission_classes = [IsCompanyOwnerOrAdmin]
    filterset_fields = ['action', 'resource']
    search_fields = ['action', 'resource', 'user__first_name', 'user__last_name']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        return AuditLog.objects.filter(
            company=self.request.user.company
        ).select_related('user')