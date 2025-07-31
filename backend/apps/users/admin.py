# apps/users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin with platform admin support."""
    
    # Fields to display in the user list
    list_display = [
        'email', 'first_name', 'last_name', 'company', 'is_platform_admin',
        'is_company_owner', 'is_active', 'date_joined'
    ]
    
    # Filters for the admin list view
    list_filter = [
        'is_platform_admin', 'is_company_owner', 'is_active', 'is_staff',
        'is_warehouse_manager', 'is_production_manager', 'company', 'date_joined'
    ]
    
    # Fields to search
    search_fields = ['email', 'first_name', 'last_name', 'company__name']
    
    # Fields to edit when creating/editing users
    fieldsets = (
        (None, {
            'fields': ('email', 'password')
        }),
        ('Personal info', {
            'fields': ('first_name', 'last_name', 'phone_number', 'profile_picture')
        }),
        ('Company & Platform', {
            'fields': ('company', 'is_platform_admin')
        }),
        ('Company Roles', {
            'fields': (
                'is_company_owner', 'is_warehouse_manager', 'is_production_manager',
                'is_logistics_coordinator', 'is_inventory_manager', 'is_driver'
            )
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Important dates', {
            'fields': ('last_login', 'date_joined')
        }),
        ('Subscription (Legacy)', {
            'fields': ('subscription_plan', 'subscription_active', 'subscription_expires'),
            'classes': ('collapse',)  # Collapsible section
        }),
    )
    
    # Fields to edit when adding new users
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
        ('Personal info', {
            'fields': ('first_name', 'last_name', 'phone_number')
        }),
        ('Company & Platform', {
            'fields': ('company', 'is_platform_admin')
        }),
        ('Company Roles', {
            'fields': ('is_company_owner',)
        }),
    )
    
    # Use email as the main identifier
    ordering = ('email',)
    
    def get_form(self, request, obj=None, **kwargs):
        """Customize form based on user permissions."""
        form = super().get_form(request, obj, **kwargs)
        
        # Only superusers can make other users platform admins
        if not request.user.is_superuser:
            if 'is_platform_admin' in form.base_fields:
                form.base_fields['is_platform_admin'].disabled = True
        
        return form