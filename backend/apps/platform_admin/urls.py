# apps/platform_admin/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PlatformSettingsViewSet, 
    PlatformAuditLogViewSet, 
    SystemHealthViewSet, 
    PlatformAnalyticsViewSet,
    PlatformNotificationViewSet  
)

router = DefaultRouter()
router.register(r'settings', PlatformSettingsViewSet, basename='platformsettings')
router.register(r'audit-logs', PlatformAuditLogViewSet, basename='platformauditlog')
router.register(r'system-health', SystemHealthViewSet, basename='systemhealth')
router.register(r'analytics', PlatformAnalyticsViewSet, basename='platformanalytics')
router.register(r'notifications', PlatformNotificationViewSet, basename='platformnotification')  

urlpatterns = [
    path('', include(router.urls)),
]