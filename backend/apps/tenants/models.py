# backend/apps/tenants/models.py
import uuid
from django.db import models
from utils.mixins import TimeStampedModel


class Company(TimeStampedModel):
    """
    Company/Tenant model - matches 'companies' table from schema
    """
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=100)
    domain = models.CharField(max_length=255, unique=True, null=True, blank=True)
    logo = models.CharField(max_length=500, blank=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField()
    website = models.URLField(blank=True)
    industry = models.CharField(max_length=100, blank=True)
    company_size = models.CharField(max_length=20, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    
    # TODO: Add subscription relationship after all payment models are complete
    # subscription = models.ForeignKey('payments.UserSubscription', ...)
    
    is_active = models.BooleanField(default=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    onboarding_completed = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'companies'
        verbose_name = 'Company'
        verbose_name_plural = 'Companies'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class CompanyInvitation(TimeStampedModel):
    """
    Company invitation model - matches 'company_invitations' table
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    invited_by = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='sent_invitations')
    role = models.CharField(max_length=50)
    token = models.CharField(max_length=255, unique=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        db_table = 'company_invitations'
        verbose_name = 'Company Invitation'
        verbose_name_plural = 'Company Invitations'
    
    def __str__(self):
        return f"Invitation to {self.email} for {self.company.name}"


class PlatformAnalytics(TimeStampedModel):
    """
    Platform analytics model - matches 'platform_analytics' table
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='analytics', null=True, blank=True)
    metric_name = models.CharField(max_length=100)
    metric_value = models.DecimalField(max_digits=15, decimal_places=2)
    metric_date = models.DateField()
    
    class Meta:
        db_table = 'platform_analytics'
        verbose_name = 'Platform Analytics'
        verbose_name_plural = 'Platform Analytics'
        unique_together = [['company', 'metric_name', 'metric_date']]
    
    def __str__(self):
        return f"{self.metric_name}: {self.metric_value} ({self.metric_date})"


class AuditLog(models.Model):
    """
    Audit log model - matches 'audit_logs' table
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='audit_logs', null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='audit_logs', null=True, blank=True)
    action = models.CharField(max_length=50)
    resource = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=100, null=True, blank=True)  # Changed to CharField for UUIDs
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.action} on {self.resource} by {self.user}"


class CompanySetting(TimeStampedModel):
    """
    Company setting model - matches 'company_settings' table
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='settings')
    setting_key = models.CharField(max_length=100)
    setting_value = models.TextField()
    
    SETTING_TYPE_CHOICES = [
        ('STRING', 'String'),
        ('INTEGER', 'Integer'),
        ('BOOLEAN', 'Boolean'),
        ('JSON', 'JSON'),
    ]
    setting_type = models.CharField(max_length=20, choices=SETTING_TYPE_CHOICES)
    is_encrypted = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'company_settings'
        verbose_name = 'Company Setting'
        verbose_name_plural = 'Company Settings'
        unique_together = [['company', 'setting_key']]
    
    def __str__(self):
        return f"{self.company.name} - {self.setting_key}"


# Keep Tenant as an alias for backward compatibility
Tenant = Company