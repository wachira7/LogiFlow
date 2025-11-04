# backend/apps/users/models.py
import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model - with UUID primary key
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    profile_picture = models.CharField(max_length=500, blank=True)
    
    # Company relationship - NULL for platform admins
    # Make this nullable initially to avoid circular dependency
    company = models.ForeignKey(
        'tenants.Company',
        on_delete=models.SET_NULL,
        related_name='users',
        null=True,
        blank=True
    )
    
    # Platform and company-level permissions (from schema)
    is_platform_admin = models.BooleanField(default=False)
    is_company_owner = models.BooleanField(default=False)
    
    # Company-level roles (from schema)
    is_warehouse_manager = models.BooleanField(default=False)
    is_production_manager = models.BooleanField(default=False)
    is_logistics_coordinator = models.BooleanField(default=False)
    is_inventory_manager = models.BooleanField(default=False)
    is_driver = models.BooleanField(default=False)
    
    # Subscription info (from schema - for backward compatibility)
    subscription_plan = models.CharField(max_length=50, blank=True)
    subscription_active = models.BooleanField(default=False)
    subscription_expires = models.DateTimeField(null=True, blank=True)
    
    # Use email as the username field
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def get_full_name(self):
        """Return the full name for the user."""
        return f"{self.first_name} {self.last_name}".strip() or self.username
    
    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name or self.username
    
    @property
    def is_admin(self):
        """Check if user is an admin."""
        return self.is_platform_admin or self.is_company_owner or self.is_superuser
    
    @property
    def is_manager(self):
        """Check if user is a manager or above."""
        return (self.is_platform_admin or self.is_company_owner or 
                self.is_warehouse_manager or self.is_production_manager or 
                self.is_logistics_coordinator or self.is_inventory_manager or 
                self.is_superuser)
    
    @property
    def company_roles(self):
        """Get list of company roles for this user."""
        roles = []
        if self.is_company_owner:
            roles.append('Company Owner')
        if self.is_warehouse_manager:
            roles.append('Warehouse Manager')
        if self.is_production_manager:
            roles.append('Production Manager')
        if self.is_logistics_coordinator:
            roles.append('Logistics Coordinator')
        if self.is_inventory_manager:
            roles.append('Inventory Manager')
        if self.is_driver:
            roles.append('Driver')
        return roles
    
    @property
    def role(self):
        """Get the primary role of the user for JWT tokens."""
        if self.is_platform_admin:
            return 'platform_admin'
        elif self.is_company_owner:
            return 'company_owner'
        elif self.is_warehouse_manager:
            return 'warehouse_manager'
        elif self.is_production_manager:
            return 'production_manager'
        elif self.is_logistics_coordinator:
            return 'logistics_coordinator'
        elif self.is_inventory_manager:
            return 'inventory_manager'
        elif self.is_driver:
            return 'driver'
        else:
            return 'user'