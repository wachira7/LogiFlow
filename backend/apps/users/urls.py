# apps/users/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .password_reset import ForgotPasswordView, ResetPasswordView
from .views import (
    RegisterView, LoginView, logout_view, ProfileView,
    ChangePasswordView, InviteUserView, CompanyUsersView,
    dashboard_overview, upload_avatar, NotificationPreferencesView,
    get_platform_notifications
)

urlpatterns = [
    # Authentication
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', logout_view, name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    
    # Profile Management
    path('profile/', ProfileView.as_view(), name='profile'),
    path('profile/avatar/', upload_avatar, name='upload_avatar'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    
    # Company User Management
    path('invite/', InviteUserView.as_view(), name='invite_user'),
    path('company-users/', CompanyUsersView.as_view(), name='company_users'),

     # Dashboard
    path('dashboard/overview/', dashboard_overview, name='dashboard_overview'),

    # Notification Preferences
    path('notification-preferences/', NotificationPreferencesView.as_view(), name='notification_preferences'),

    # Platform Notifications
    path('notifications/', get_platform_notifications, name='platform_notifications'),
]