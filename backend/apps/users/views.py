# apps/users/views.py
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import login, logout
from django.conf import settings
from django.http import JsonResponse
from django.views import View
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Q
import json

from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    ChangePasswordSerializer, ProfileUpdateSerializer
)
from .models import User, UserNotificationPreferences
from .dashboard import (
    build_alerts, build_operations_activity, build_performance_metrics, build_recent_order_activity,
    build_setup_progress, build_stats, build_trend,
)
from utils.permissions import IsCompanyOwnerOrAdmin, IsCompanyMember
from django.db import models


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh['user_id'] = str(user.id)  # Convert UUID to string
    refresh['email'] = user.email
    refresh['role'] = user.role  # Now uses the @property
    refresh['is_platform_admin'] = user.is_platform_admin  
    # Add company_id if user has a company
    if hasattr(user, 'company') and user.company:
        refresh['company_id'] = str(user.company.id)
    
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

def set_auth_cookies(response, tokens):
    """Set authentication cookies on response."""
    # Set access token cookie
    response.set_cookie(
        'authToken',
        tokens['access'],
        max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
        httponly=False,  # Frontend needs to read this
        secure=not settings.DEBUG,
        samesite='Lax'
    )
    
    # Set refresh token cookie (httpOnly for security)
    response.set_cookie(
        'refreshToken',
        tokens['refresh'],
        max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(),
        httponly=True,  # More secure, only server can access
        secure=not settings.DEBUG,
        samesite='Lax'
    )
    
    # Set token expiry timestamp
    expiry_time = timezone.now() + settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']
    response.set_cookie(
        'tokenExpiry',
        str(int(expiry_time.timestamp() * 1000)),  # JavaScript timestamp
        max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
        httponly=False,
        secure=not settings.DEBUG,
        samesite='Lax'
    )


def clear_auth_cookies(response):
    """Clear authentication cookies from response."""
    cookie_names = ['authToken', 'refreshToken', 'tokenExpiry']
    for cookie_name in cookie_names:
        response.set_cookie(
            cookie_name,
            '',
            max_age=0,
            expires='Thu, 01 Jan 1970 00:00:00 GMT',
            httponly=False,
            secure=not settings.DEBUG,
            samesite='Lax'
        )


class SetAuthCookiesView(View):
    """Utility view to set authentication cookies from frontend."""
    
    def post(self, request):
        try:
            # Parse JSON body
            data = json.loads(request.body)
            access_token = data.get('access_token')
            refresh_token = data.get('refresh_token')
            
            if not access_token or not refresh_token:
                return JsonResponse({
                    'error': 'Both access_token and refresh_token are required'
                }, status=400)
            
            response = JsonResponse({'success': True})
            
            tokens = {
                'access': access_token,
                'refresh': refresh_token
            }
            
            set_auth_cookies(response, tokens)
            return response
            
        except json.JSONDecodeError:
            return JsonResponse({
                'error': 'Invalid JSON'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'error': 'Failed to set cookies'
            }, status=500)


class RegisterView(generics.CreateAPIView):
    """User registration endpoint."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate tokens
        tokens = get_tokens_for_user(user)
        
        response = Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
            'message': 'Registration successful'
        }, status=status.HTTP_201_CREATED)
        
        # Set authentication cookies
        set_auth_cookies(response, tokens)
        
        return response


class LoginView(generics.GenericAPIView):
    """User login endpoint."""
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # Check if user is active
        if not user.is_active:
            return Response({
                'error': 'User account is disabled'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        login(request, user)
        
        # Generate tokens
        tokens = get_tokens_for_user(user)
        
        response = Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
            'message': 'Login successful'
        })
        
        # Set authentication cookies
        set_auth_cookies(response, tokens)
        
        return response


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """User logout endpoint."""
    try:
        # Try to get refresh token from cookie or request data
        refresh_token = request.COOKIES.get('refreshToken') or request.data.get('refresh_token')
        
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except (TokenError, InvalidToken):
                # Token was already invalid, continue with logout
                pass
        
        logout(request)
        
        response = Response({
            'message': 'Logout successful'
        })
        
        # Clear authentication cookies
        clear_auth_cookies(response)
        
        return response
        
    except Exception as e:
        response = Response({
            'message': 'Logout completed with warnings',
            'warning': str(e)
        })
        
        # Still clear cookies even if there was an error
        clear_auth_cookies(response)
        
        return response

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_avatar(request):
    """Upload user avatar/profile picture."""
    user = request.user
    avatar_file = request.FILES.get('avatar')
    
    if not avatar_file:
        return Response({
            'error': 'No avatar file provided'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate file size (max 10MB)
    if avatar_file.size > 10 * 1024 * 1024:
        return Response({
            'error': 'File size exceeds 10MB limit'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate file type
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp','.bmp', '.tiff', '.tif', '.heic', '.heif','.avif', '.svg']
    file_extension = '.' + avatar_file.name.split('.')[-1].lower()
    if file_extension not in allowed_extensions:
        return Response({
            'error': 'Invalid file type. Only JPG, PNG, GIF, WEBP, BMP, TIFF, HEIC, HEIF, AVIF and SVG are allowed'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Save avatar
    user.profile_picture = avatar_file
    user.save()
    user.refresh_from_db() # Ensure we have the latest data from the database-reloads the user instance to get the updated profile_picture URL(cloudinary URL after upload)

    return Response({
        'profile_picture': user.profile_picture.url if user.profile_picture else None,
        'message': 'Avatar uploaded successfully'
    })        


class ProfileView(generics.RetrieveUpdateAPIView):
    """User profile endpoint."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ProfileUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.save()
        
        return Response({
            'user': UserSerializer(user).data,
            'message': 'Profile updated successfully'
        })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_all_view(request):
    """Sign out of every device, including this one."""
    from apps.tenants.roles import sign_out_everywhere
    sign_out_everywhere(request.user)
    response = Response({'message': 'Signed out of all devices'})
    clear_auth_cookies(response)
    return response


class ChangePasswordView(generics.GenericAPIView):
    """Change password endpoint."""
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user  # the serializer already checked old_password
        # Set new password and sign out every other session
        from apps.tenants.roles import sign_out_everywhere
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        sign_out_everywhere(user)
        tokens = get_tokens_for_user(user)
        
        response = Response({
            'message': 'Password changed successfully',
            'tokens': tokens
        })
        
        # Update authentication cookies with new tokens
        set_auth_cookies(response, tokens)
        
        return response


class CompanyUsersView(generics.ListAPIView):
    """List all users in company."""
    serializer_class = UserSerializer
    permission_classes = [IsCompanyMember]

    def get_queryset(self):
        # Ensure user has a company
        if not hasattr(self.request.user, 'company') or not self.request.user.company:
            return User.objects.none()
            
        return User.objects.filter(
            company=self.request.user.company
        ).select_related('company').order_by('date_joined')


class CustomTokenRefreshView(TokenRefreshView):
    """Custom token refresh view that handles cookies."""
    
    def post(self, request, *args, **kwargs):
        # Try to get refresh token from cookie if not in request data
        if 'refresh' not in request.data:
            refresh_token = request.COOKIES.get('refreshToken')
            if refresh_token:
                request.data['refresh'] = refresh_token
        
        response = super().post(request, *args, **kwargs)
        
        # If successful, update cookies
        if response.status_code == 200:
            tokens = {
                'access': response.data['access'],
                'refresh': request.data['refresh']
            }
            set_auth_cookies(response, tokens)
        
        return response

class NotificationPreferencesView(generics.RetrieveUpdateAPIView):
    """Get and update notification preferences for the authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import UserNotificationPreferencesSerializer
        return UserNotificationPreferencesSerializer

    def get_object(self):
        prefs, _ = UserNotificationPreferences.objects.get_or_create(
            user=self.request.user
        )
        return prefs

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        from .serializers import UserNotificationPreferencesSerializer
        serializer = UserNotificationPreferencesSerializer(
            instance, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'preferences': serializer.data,
            'message': 'Notification preferences updated successfully'
        })
    
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_overview(request):
    """Dashboard overview data for authenticated user."""
    user = request.user
    company = user.company
    
    if not company:
        return Response({
            'error': 'User has no associated company'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get basic company stats
    total_users = company.users.filter(is_active=True).count()
    
    # Calculate days since company creation
    days_since_creation = (timezone.now().date() - company.created_at.date()).days
    
    # Get recent company users (last 7 days)
    recent_users = company.users.filter(
        date_joined__gte=timezone.now() - timedelta(days=7)
    ).order_by('-date_joined')[:5]
    
    # Build recent activity from user registrations
    recent_activity = []
    for recent_user in recent_users:
        recent_activity.append({
            'type': 'user_joined',
            'message': f'{recent_user.get_full_name() or recent_user.email} joined the company',
            'timestamp': recent_user.date_joined.isoformat(),
            'user': {
                'name': recent_user.get_full_name() or recent_user.email,
                'email': recent_user.email
            }
        })
    
    # Add company creation activity if recent
    if days_since_creation <= 7:
        recent_activity.append({
            'type': 'company_created',
            'message': f'Company "{company.name}" was created',
            'timestamp': company.created_at.isoformat(),
            'user': {
                'name': user.get_full_name() or user.email,
                'email': user.email
            }
        })
    
    recent_activity += build_recent_order_activity(company, timezone.now() - timedelta(days=7))
    recent_activity += build_operations_activity(company, timezone.now() - timedelta(days=7))

    # Sort by timestamp descending
    recent_activity = sorted(recent_activity, key=lambda x: x['timestamp'], reverse=True)[:12]
    recent_activity = [{'id': i, **item} for i, item in enumerate(recent_activity, start=1)]

    now = timezone.now()
    setup_progress = build_setup_progress(company, total_users)
    
    # Prepare response data
    data = {
        'company': {
            'id': str(company.id),
            'name': company.name,
            'industry': company.industry or 'Not specified',
            'created_at': company.created_at.isoformat(),
            'logo': company.logo.url if company.logo and company.logo.name else None,
            'email': company.email,
            'currency': getattr(getattr(company, 'settings', None), 'currency', None) or 'USD',
        },
        'user': {
            'id': str(user.id),
            'name': user.get_full_name() or user.email,
            'email': user.email,
            'role': user.role.replace('_', ' ').capitalize() if user.role else 'Member',
            'joined_at': user.date_joined.isoformat(),
        },
        'stats': build_stats(company, total_users, days_since_creation),
        'recent_activity': recent_activity,
        'quick_actions': [
            {
                'id': 1,
                'title': 'Add Team Members',
                'description': 'Invite users to join your company',
                'icon': 'users',
                'href': '/company/users',
                'color': 'blue'
            },
            {
                'id': 2,
                'title': 'Company Settings',
                'description': 'Update company information',
                'icon': 'settings',
                'href': '/company/profile',
                'color': 'green'
            },
            {
                'id': 3,
                'title': 'Inventory Setup',
                'description': 'Add your first products',
                'icon': 'package',
                'href': '/inventory/products',
                'color': 'purple'
            },
            {
                'id': 4,
                'title': 'View Reports',
                'description': 'Access analytics and reports',
                'icon': 'chart',
                'href': '/analytics',
                'color': 'orange'
            }
        ],
        'setup_progress': setup_progress,
        'performance_metrics': build_performance_metrics(company, now),
        'alerts': build_alerts(company, now, setup_progress),
        'trend': build_trend(company, now),
        # When these figures were computed, for "Updated Xs ago" in the UI
        'generated_at': now.isoformat(),
    }
    
    return Response(data, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_platform_notifications(request):
    """
    Returns active platform notifications for the current user.
    Global notifications are shown to all users.
    Company-specific notifications are shown to users of that company.
    """
    from apps.platform_admin.models import PlatformNotification

    now = timezone.now()
    notifications = PlatformNotification.objects.filter(
        is_active=True,
    ).filter(
        models.Q(scheduled_for__isnull=True) | models.Q(scheduled_for__lte=now),
        models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now),
    ).filter(
        models.Q(is_global=True) |
        models.Q(target_companies=request.user.company)
    ).distinct().order_by('-created_at')[:20]

    data = [
        {
            'id': str(n.id),
            'title': n.title,
            'message': n.message,
            'notification_type': n.notification_type,
            'priority': n.priority,
            'created_at': n.created_at,
        }
        for n in notifications
    ]

    return Response(data)    