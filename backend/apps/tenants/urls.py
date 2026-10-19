# backend/apps/tenants/urls.py
from django.urls import path
from .views import (
    CompanyDetailView, upload_company_logo, CompanyInvitationsView, 
    accept_invitation, resend_invitation, revoke_invitation, 
    CompanySettingsView, AuditLogView, validate_invitation_token, CompanyMembersView, CompanyMemberDetailView,
)

urlpatterns = [
    # Company Management
    path('company/', CompanyDetailView.as_view(), name='company-detail'),
    path('company/logo/', upload_company_logo, name='upload-logo'),
    
    # Team
    path('members/', CompanyMembersView.as_view(), name='company-members'),
    path('members/<uuid:pk>/', CompanyMemberDetailView.as_view(), name='company-member-detail'),

    # Invitations
    path('invitations/', CompanyInvitationsView.as_view(), name='invitations-list'),
    path('invitations/accept/', accept_invitation, name='accept-invitation'),
    path('invitations/<uuid:invitation_id>/resend/', resend_invitation, name='resend-invitation'),
    path('invitations/<uuid:invitation_id>/revoke/', revoke_invitation, name='revoke-invitation'),
    path('invitations/validate/', validate_invitation_token, name='validate-invitation-token'),
    
    # Settings
    path('settings/', CompanySettingsView.as_view(), name='settings-list'),
        
    # Audit Logs
    path('audit-logs/', AuditLogView.as_view(), name='audit-logs'),
    
]