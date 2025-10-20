# backend/apps/tenants/admin.py
from django.contrib import admin
from .models import Company, CompanyInvitation, PlatformAnalytics, AuditLog, CompanySetting


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'email', 'industry', 'company_size', 'is_active', 'created_at']
    list_filter = ['is_active', 'company_size', 'industry', 'created_at']
    search_fields = ['name', 'slug', 'email', 'domain']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'email', 'logo', 'industry', 'company_size')
        }),
        ('Contact Details', {
            'fields': ('phone', 'website', 'address', 'domain')
        }),
        ('Settings', {
            'fields': ('timezone', 'is_active', 'trial_ends_at', 'onboarding_completed')
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at')
        }),
    )


@admin.register(CompanyInvitation)
class CompanyInvitationAdmin(admin.ModelAdmin):
    list_display = ['email', 'company', 'role', 'invited_by', 'accepted_at', 'expires_at', 'created_at']
    list_filter = ['role', 'accepted_at', 'created_at']
    search_fields = ['email', 'company__name', 'invited_by__email']
    readonly_fields = ['id', 'token', 'created_at', 'updated_at']


@admin.register(CompanySetting)
class CompanySettingAdmin(admin.ModelAdmin):
    list_display = ['company', 'timezone', 'currency', 'language', 'require_2fa', 'created_at']
    list_filter = ['currency', 'language', 'require_2fa', 'created_at']
    search_fields = ['company__name']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('General Settings', {
            'fields': ('company', 'timezone', 'currency', 'date_format', 'time_format', 'language')
        }),
        ('Notifications', {
            'fields': ('email_notifications', 'push_notifications', 'marketing_emails')
        }),
        ('Business Settings', {
            'fields': ('fiscal_year_start', 'working_days', 'working_hours_start', 'working_hours_end')
        }),
        ('Security', {
            'fields': ('require_2fa', 'session_timeout')
        }),
        ('API & Integrations', {
            'fields': ('api_access_enabled', 'webhook_url')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(PlatformAnalytics)
class PlatformAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['metric_name', 'company', 'metric_value', 'metric_date', 'created_at']
    list_filter = ['metric_name', 'metric_date', 'created_at']
    search_fields = ['metric_name', 'company__name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'resource', 'user', 'company', 'timestamp']
    list_filter = ['action', 'resource', 'timestamp']
    search_fields = ['action', 'resource', 'user__email', 'company__name']
    readonly_fields = ['id', 'timestamp']
    
    def has_add_permission(self, request):
        return False  # Audit logs should not be manually added
    
    def has_delete_permission(self, request, obj=None):
        return False  # Audit logs should not be deleted