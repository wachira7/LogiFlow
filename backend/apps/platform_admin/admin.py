# apps/platform_admin/admin.py
from django.contrib import admin
from .models import PlatformSettings, PlatformAuditLog, SystemHealth, PlatformNotification

@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ['setting_key', 'setting_value_preview', 'is_active', 'modified_by', 'updated_at']
    list_filter = ['is_active', 'created_at', 'updated_at']
    search_fields = ['setting_key', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    def setting_value_preview(self, obj):
        return obj.setting_value[:50] + "..." if len(obj.setting_value) > 50 else obj.setting_value
    setting_value_preview.short_description = 'Setting Value'

@admin.register(PlatformAuditLog)
class PlatformAuditLogAdmin(admin.ModelAdmin):
    list_display = ['admin_user', 'action', 'target_company', 'target_user', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['admin_user__email', 'target_company__name', 'target_user__email', 'description']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        return False  # Audit logs should only be created programmatically
    
    def has_change_permission(self, request, obj=None):
        return False  # Audit logs should be immutable

@admin.register(SystemHealth)
class SystemHealthAdmin(admin.ModelAdmin):
    list_display = ['metric_name', 'metric_value', 'metric_unit', 'status', 'auto_generated', 'created_at']
    list_filter = ['status', 'auto_generated', 'metric_name', 'created_at']
    search_fields = ['metric_name', 'description']
    readonly_fields = ['status', 'created_at', 'updated_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).order_by('-created_at')

@admin.register(PlatformNotification)
class PlatformNotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'notification_type', 'priority', 'is_global', 'is_active', 'created_by', 'created_at']
    list_filter = ['notification_type', 'priority', 'is_global', 'is_active', 'created_at']
    search_fields = ['title', 'message']
    readonly_fields = ['created_at', 'updated_at']
    filter_horizontal = ['target_companies']
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if obj is None:  # Creating new notification
            form.base_fields['created_by'].initial = request.user
        return form