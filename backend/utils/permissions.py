from rest_framework import permissions
from django.core.exceptions import ObjectDoesNotExist

class IsSameCompany(permissions.BasePermission):
    """
    Permission to only allow users to access data from their own company.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and hasattr(request.user, 'company')
    
    def has_object_permission(self, request, view, obj):
        # Check if object belongs to user's company
        if hasattr(obj, 'company'):
            return obj.company == request.user.company
        return False

class IsCompanyOwnerOrAdmin(permissions.BasePermission):
    """
    Permission for company owners and admins only.
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            (request.user.is_company_owner or request.user.is_staff)
        )

class IsPlatformAdmin(permissions.BasePermission):
    """
    Permission for platform administrators only.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_platform_admin

class IsCompanyMember(permissions.BasePermission):
    """
    Permission for any member of the company.
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'company') and 
            request.user.company is not None
        )