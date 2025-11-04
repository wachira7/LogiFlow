#backend/utils/permissions.py
from rest_framework import permissions
from django.core.exceptions import ObjectDoesNotExist
import logging

logger = logging.getLogger(__name__)


class IsSameCompany(permissions.BasePermission):
    """
    Permission to only allow users to access data from their own company.
    Enhanced with better validation and logging.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Platform admins can access any company
        if request.user.is_platform_admin:
            return True
        
        # User must have a company
        if not (hasattr(request.user, 'company') and request.user.company):
            logger.warning(f"User {request.user.email} has no company assigned")
            return False
        
        return True
    
    def has_object_permission(self, request, view, obj):
        # Platform admins can access any object
        if request.user.is_platform_admin:
            return True
        
        # Check if object belongs to user's company
        if hasattr(obj, 'company'):
            return obj.company == request.user.company
        
        # For objects that belong to users (check user's company)
        if hasattr(obj, 'user') and hasattr(obj.user, 'company'):
            return obj.user.company == request.user.company
        
        # For tenant-aware objects via request.tenant
        if hasattr(request, 'tenant') and request.tenant:
            if hasattr(obj, 'company'):
                return obj.company == request.tenant
        
        logger.warning(f"Object {obj} has no company relationship")
        return False


class IsCompanyOwnerOrAdmin(permissions.BasePermission):
    """
    Permission for company owners and platform admins only.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return (
            request.user.is_platform_admin or 
            request.user.is_company_owner or 
            request.user.is_staff or
            request.user.is_superuser
        )


class IsPlatformAdmin(permissions.BasePermission):
    """
    Permission for platform administrators only.
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            (request.user.is_platform_admin or request.user.is_superuser)
        )


class IsCompanyMember(permissions.BasePermission):
    """
    Permission for any member of the company.
    Enhanced with better validation.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Platform admins are always allowed
        if request.user.is_platform_admin:
            return True
        
        # User must belong to a company
        if not (hasattr(request.user, 'company') and request.user.company):
            return False
        
        # Company must be active
        if not request.user.company.is_active:
            logger.warning(f"User {request.user.email} belongs to inactive company")
            return False
        
        return True


class IsManagerOrAbove(permissions.BasePermission):
    """
    Permission for managers and above (owners, platform admins).
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return (
            request.user.is_platform_admin or
            request.user.is_company_owner or
            request.user.is_warehouse_manager or
            request.user.is_production_manager or
            request.user.is_logistics_coordinator or
            request.user.is_inventory_manager or
            request.user.is_staff or
            request.user.is_superuser
        )


class IsWarehouseManager(permissions.BasePermission):
    """
    Permission for warehouse managers and above.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return (
            request.user.is_platform_admin or
            request.user.is_company_owner or
            request.user.is_warehouse_manager or
            request.user.is_superuser
        )


class IsProductionManager(permissions.BasePermission):
    """
    Permission for production managers and above.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return (
            request.user.is_platform_admin or
            request.user.is_company_owner or
            request.user.is_production_manager or
            request.user.is_superuser
        )


class IsInventoryManager(permissions.BasePermission):
    """
    Permission for inventory managers and above.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return (
            request.user.is_platform_admin or
            request.user.is_company_owner or
            request.user.is_inventory_manager or
            request.user.is_superuser
        )


class IsLogisticsCoordinator(permissions.BasePermission):
    """
    Permission for logistics coordinators and above.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return (
            request.user.is_platform_admin or
            request.user.is_company_owner or
            request.user.is_logistics_coordinator or
            request.user.is_superuser
        )


class IsDriver(permissions.BasePermission):
    """
    Permission for drivers and above.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return (
            request.user.is_platform_admin or
            request.user.is_company_owner or
            request.user.is_logistics_coordinator or
            request.user.is_warehouse_manager or
            request.user.is_driver or
            request.user.is_superuser
        )


class TenantAwarePermission(permissions.BasePermission):
    """
    Base permission class that respects tenant boundaries.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Platform admins can access everything
        if request.user.is_platform_admin:
            return True
        
        # Check if user has tenant access
        if hasattr(request, 'tenant') and request.tenant:
            # User must belong to the same company as the tenant
            if hasattr(request.user, 'company') and request.user.company:
                return request.user.company == request.tenant
        
        return False


class ReadOnlyOrOwner(permissions.BasePermission):
    """
    Permission that allows read-only access to everyone in company,
    but write access only to owners/managers.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Platform admins can do everything
        if request.user.is_platform_admin:
            return True
        
        # User must belong to a company
        if not (hasattr(request.user, 'company') and request.user.company):
            return False
        
        # Read access for all company members
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write access only for owners/managers
        return (
            request.user.is_company_owner or
            request.user.is_warehouse_manager or
            request.user.is_production_manager or
            request.user.is_logistics_coordinator or
            request.user.is_inventory_manager
        )


# Utility function for manual permission checking
def check_company_access(user, obj):
    """
    Utility function to check if user can access an object based on company.
    """
    if user.is_platform_admin or user.is_superuser:
        return True
    
    if not (hasattr(user, 'company') and user.company):
        return False
    
    if hasattr(obj, 'company'):
        return obj.company == user.company
    
    if hasattr(obj, 'user') and hasattr(obj.user, 'company'):
        return obj.user.company == user.company
    
    return False


def check_role_access(user, required_roles):
    """
    Check if user has any of the required roles.
    
    Args:
        user: User object
        required_roles: List of role names (e.g., ['is_warehouse_manager', 'is_company_owner'])
    
    Returns:
        bool: True if user has any of the required roles
    """
    if user.is_platform_admin or user.is_superuser:
        return True
    
    for role in required_roles:
        if hasattr(user, role) and getattr(user, role):
            return True
    
    return False


def get_user_permissions_summary(user):
    """
    Get a summary of user's permissions for debugging/display.
    
    Returns:
        dict: Summary of user's permissions and roles
    """
    return {
        'is_authenticated': user.is_authenticated,
        'is_platform_admin': getattr(user, 'is_platform_admin', False),
        'is_superuser': user.is_superuser,
        'is_staff': user.is_staff,
        'company': user.company.name if hasattr(user, 'company') and user.company else None,
        'company_roles': {
            'is_company_owner': getattr(user, 'is_company_owner', False),
            'is_warehouse_manager': getattr(user, 'is_warehouse_manager', False),
            'is_production_manager': getattr(user, 'is_production_manager', False),
            'is_logistics_coordinator': getattr(user, 'is_logistics_coordinator', False),
            'is_inventory_manager': getattr(user, 'is_inventory_manager', False),
            'is_driver': getattr(user, 'is_driver', False),
        }
    }