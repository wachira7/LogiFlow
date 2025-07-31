# apps/platform_admin/models.py
import uuid
from django.db import models
from utils.mixins import TimeStampedModel

class PlatformSettings(TimeStampedModel):
    """
    Platform-wide settings and configuration
    """
    setting_key = models.CharField(max_length=100, unique=True)
    setting_value = models.TextField()
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    modified_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'platform_settings'
        verbose_name = 'Platform Setting'
        verbose_name_plural = 'Platform Settings'
        ordering = ['setting_key']
    
    def __str__(self):
        return f"{self.setting_key}: {self.setting_value[:50]}"

class PlatformAuditLog(TimeStampedModel):
    """
    Platform-level audit logging for admin actions
    """
    ACTION_CHOICES = [
        ('COMPANY_CREATED', 'Company Created'),
        ('COMPANY_SUSPENDED', 'Company Suspended'),
        ('COMPANY_ACTIVATED', 'Company Activated'),
        ('SUBSCRIPTION_MODIFIED', 'Subscription Modified'),
        ('USER_IMPERSONATED', 'User Impersonated'),
        ('SETTINGS_CHANGED', 'Settings Changed'),
        ('SYSTEM_MAINTENANCE', 'System Maintenance'),
    ]
    
    admin_user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='admin_actions')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    target_company = models.ForeignKey('tenants.Company', on_delete=models.SET_NULL, null=True, blank=True)
    target_user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='admin_targets')
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'platform_audit_logs'
        verbose_name = 'Platform Audit Log'
        verbose_name_plural = 'Platform Audit Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['admin_user', 'created_at']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['target_company', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.admin_user.email} - {self.action} - {self.created_at}"

class SystemHealth(TimeStampedModel):
    """
    System health and monitoring metrics
    """
    metric_name = models.CharField(max_length=100)
    metric_value = models.DecimalField(max_digits=15, decimal_places=4)
    metric_unit = models.CharField(max_length=20, blank=True)  # %, MB, seconds, etc.
    
    STATUS_CHOICES = [
        ('HEALTHY', 'Healthy'),
        ('WARNING', 'Warning'),
        ('CRITICAL', 'Critical'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='HEALTHY')
    
    threshold_warning = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    threshold_critical = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    description = models.TextField(blank=True)
    auto_generated = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'system_health'
        verbose_name = 'System Health Metric'
        verbose_name_plural = 'System Health Metrics'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['metric_name', 'created_at']),
            models.Index(fields=['status', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.metric_name}: {self.metric_value} {self.metric_unit} [{self.status}]"
    
    def save(self, *args, **kwargs):
        # Auto-determine status based on thresholds
        if self.threshold_critical and self.metric_value >= self.threshold_critical:
            self.status = 'CRITICAL'
        elif self.threshold_warning and self.metric_value >= self.threshold_warning:
            self.status = 'WARNING'
        else:
            self.status = 'HEALTHY'
        super().save(*args, **kwargs)

class PlatformNotification(TimeStampedModel):
    """
    Platform-wide notifications and announcements
    """
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    TYPE_CHOICES = [
        ('MAINTENANCE', 'Maintenance'),
        ('FEATURE', 'New Feature'),
        ('SECURITY', 'Security Update'),
        ('BILLING', 'Billing'),
        ('GENERAL', 'General'),
    ]
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='GENERAL')
    
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    
    target_companies = models.ManyToManyField('tenants.Company', blank=True)
    is_global = models.BooleanField(default=False)  # Send to all companies
    is_active = models.BooleanField(default=True)
    scheduled_for = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'platform_notifications'
        verbose_name = 'Platform Notification'
        verbose_name_plural = 'Platform Notifications'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} [{self.priority}]"