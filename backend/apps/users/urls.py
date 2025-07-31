# apps/users/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, logout_view, ProfileView,
    ChangePasswordView, InviteUserView, CompanyUsersView
)

urlpatterns = [
    # Authentication
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', logout_view, name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Profile Management
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # Company User Management
    path('invite/', InviteUserView.as_view(), name='invite_user'),
    path('company-users/', CompanyUsersView.as_view(), name='company_users'),
]