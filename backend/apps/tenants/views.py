# apps/tenants/views.py
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Company, CompanyInvitation, CompanySetting, AuditLog
from .serializers import (
    CompanySerializer, CompanyUpdateSerializer, CompanyInvitationSerializer,
    AcceptInvitationSerializer, CompanySettingSerializer, AuditLogSerializer
)
from utils.permissions import IsCompanyOwnerOrAdmin, IsCompanyMember, IsPlatformAdmin

User = get_user_model()

class CompanyDetailView(generics.RetrieveUpdateAPIView):
    """Company detail and update endpoint."""
    permission_classes = [IsCompanyMember]
    
    def get_object(self):
        return self.request.user.company
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CompanyUpdateSerializer
        return CompanySerializer

class CompanyInvitationsView(generics.ListCreateAPIView):
    """List and create company invitations."""
    serializer_class = CompanyInvitationSerializer
    permission_classes = [IsCompanyOwnerOrAdmin]
    
    def get_queryset(self):
        return CompanyInvitation.objects.filter(
            company=self.request.user.company
        ).select_related('invited_by', 'company')
    
    def perform_create(self, serializer):
        serializer.save(
            company=self.request.user.company,
            invited_by=self.request.user
        )

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
            'first_name': serializer.validated_data['first_name'],
            'last_name': serializer.validated_data['last_name'],
            'phone_number': serializer.validated_data.get('phone_number', ''),
            'company': invitation.company,
            'password': serializer.validated_data['password']
        }
        
        # Set role based on invitation
        role = invitation.role.lower()
        if role == 'admin':
            user_data['is_company_owner'] = True
        elif role == 'manager':
            user_data['is_warehouse_manager'] = True
        
        user = User.objects.create_user(**user_data)
        
        # Mark invitation as accepted
        invitation.accepted_at = timezone.now()
        invitation.save()
    
    return Response({
        'message': 'Invitation accepted successfully',
        'user_id': user.id
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
        return Response({'message': 'Invitation revoked successfully'})
    except CompanyInvitation.DoesNotExist:
        return Response({
            'error': 'Invitation not found'
        }, status=status.HTTP_404_NOT_FOUND)

class CompanySettingsView(generics.ListCreateAPIView):
    """Company settings management."""
    serializer_class = CompanySettingSerializer
    permission_classes = [IsCompanyOwnerOrAdmin]
    
    def get_queryset(self):
        return CompanySetting.objects.filter(
            company=self.request.user.company
        )
    
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

class CompanySettingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Individual company setting management with UUID support."""
    serializer_class = CompanySettingSerializer
    permission_classes = [IsCompanyOwnerOrAdmin]
    lookup_field = 'id'  # UUID field
    
    def get_queryset(self):
        return CompanySetting.objects.filter(
            company=self.request.user.company
        )

class AuditLogView(generics.ListAPIView):
    """Company audit logs with UUID support."""
    serializer_class = AuditLogSerializer
    permission_classes = [IsCompanyOwnerOrAdmin]
    filterset_fields = ['action', 'resource', 'user_id']
    search_fields = ['action', 'resource', 'user__first_name', 'user__last_name']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        return AuditLog.objects.filter(
            company=self.request.user.company
        ).select_related('user')