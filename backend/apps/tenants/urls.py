from django.urls import path
from .views import (
    CompanyDetailView, CompanyInvitationsView, accept_invitation, 
    revoke_invitation, CompanySettingsView, CompanySettingDetailView,
    AuditLogView
)

urlpatterns = [
    # Company Management
    path('company/', CompanyDetailView.as_view(), name='company_detail'),
    
    # Invitations
    path('invitations/', CompanyInvitationsView.as_view(), name='company_invitations'),
    path('invitations/accept/', accept_invitation, name='accept_invitation'),
    path('invitations/<uuid:invitation_id>/revoke/', revoke_invitation, name='revoke_invitation'),
    
    # Settings
    path('settings/', CompanySettingsView.as_view(), name='company_settings'),
    path('settings/<uuid:id>/', CompanySettingDetailView.as_view(), name='company_setting_detail'),
    
    # Audit Logs
    path('audit-logs/', AuditLogView.as_view(), name='audit_logs'),
]