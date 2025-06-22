from django.contrib import admin
from .models import Company, CompanyInvitation, PlatformAnalytics, AuditLog, CompanySetting


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'email', 'industry', 'company_size', 'is_active', 'created_at']
    list_filter = ['is_active', 'company_size', 'industry', 'created_at']
    search_fields = ['name', 'slug', 'email', 'domain']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(CompanyInvitation)
class CompanyInvitationAdmin(admin.ModelAdmin):
    list_display = ['email', 'company', 'role', 'invited_by', 'accepted_at', 'expires_at', 'created_at']
    list_filter = ['role', 'accepted_at', 'created_at']
    search_fields = ['email', 'company__name', 'invited_by__email']
    readonly_fields = ['id', 'token', 'created_at', 'updated_at']


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


@admin.register(CompanySetting)
class CompanySettingAdmin(admin.ModelAdmin):
    list_display = ['company', 'setting_key', 'setting_type', 'is_encrypted', 'created_at']
    list_filter = ['setting_type', 'is_encrypted', 'created_at']
    search_fields = ['company__name', 'setting_key']
    readonly_fields = ['id', 'created_at', 'updated_at']