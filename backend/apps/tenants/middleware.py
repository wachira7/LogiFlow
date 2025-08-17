# apps/tenants/middleware.py
import logging
from django.utils.deprecation import MiddlewareMixin
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from .models import Company
from utils.exceptions import CompanyMismatchError

logger = logging.getLogger(__name__)


class CompanyTenantMiddleware(MiddlewareMixin):
    """
    Enhanced tenant middleware that works with your Company model.
    Sets request.tenant for multi-tenant isolation.
    """
    
    def process_request(self, request):
        """
        Set tenant context based on various methods.
        """
        try:
            tenant = self._resolve_tenant(request)
            if tenant:
                request.tenant = tenant
                request.company = tenant  # Alias for backward compatibility
                
                # Add tenant info to logs
                if hasattr(request, 'request_id'):
                    logger.debug(f"[{request.request_id}] Tenant resolved: {tenant.name} ({tenant.slug})")
            else:
                request.tenant = None
                request.company = None
                
        except Exception as e:
            logger.error(f"Error resolving tenant: {str(e)}")
            request.tenant = None
            request.company = None
        
        return None
    
    def _resolve_tenant(self, request):
        """
        Resolve tenant using multiple strategies in order of priority.
        """
        # Strategy 1: From subdomain (e.g., acme.logiflow.com)
        tenant = self._get_tenant_from_subdomain(request)
        if tenant:
            return tenant
        
        # Strategy 2: From X-Tenant header (for API clients)
        tenant = self._get_tenant_from_header(request)
        if tenant:
            return tenant
        
        # Strategy 3: From authenticated user's company
        tenant = self._get_tenant_from_user(request)
        if tenant:
            return tenant
        
        # Strategy 4: From URL parameter (fallback)
        tenant = self._get_tenant_from_url(request)
        if tenant:
            return tenant
        
        return None
    
    def _get_tenant_from_subdomain(self, request):
        """
        Extract tenant from subdomain.
        """
        try:
            host = request.get_host().lower()
            if '.' in host and not host.startswith('www.'):
                subdomain = host.split('.')[0]
                
                # Skip reserved subdomains
                reserved = {'api', 'www', 'admin', 'app', 'mail', 'ftp', 'staging', 'dev'}
                if subdomain not in reserved:
                    return Company.objects.get(slug=subdomain, is_active=True)
        except (Company.DoesNotExist, ValueError):
            pass
        return None
    
    def _get_tenant_from_header(self, request):
        """
        Extract tenant from X-Tenant header.
        """
        try:
            tenant_slug = request.META.get('HTTP_X_TENANT')
            if tenant_slug:
                return Company.objects.get(slug=tenant_slug, is_active=True)
        except Company.DoesNotExist:
            pass
        return None
    
    def _get_tenant_from_user(self, request):
        """
        Get tenant from authenticated user's company.
        """
        if (hasattr(request, 'user') and 
            request.user.is_authenticated and 
            hasattr(request.user, 'company') and 
            request.user.company):
            return request.user.company
        return None
    
    def _get_tenant_from_url(self, request):
        """
        Extract tenant from URL parameters (fallback method).
        """
        try:
            company_id = request.GET.get('company_id')
            if company_id:
                return Company.objects.get(id=company_id, is_active=True)
        except (Company.DoesNotExist, ValueError):
            pass
        return None
    
    def process_response(self, request, response):
        """
        Add tenant info to response headers for debugging.
        """
        if hasattr(request, 'tenant') and request.tenant:
            response['X-Tenant-Name'] = request.tenant.name
            response['X-Tenant-Slug'] = request.tenant.slug
        
        return response


class TenantValidationMiddleware(MiddlewareMixin):
    """
    Validate that users can only access their tenant's data.
    """
    
    def process_request(self, request):
        """
        Validate tenant access permissions.
        """
        # Skip validation for certain paths
        if self._should_skip_validation(request):
            return None
        
        # Only validate for authenticated users
        if not (hasattr(request, 'user') and request.user.is_authenticated):
            return None
        
        # Platform admins can access any tenant
        if request.user.is_platform_admin:
            return None
        
        # Check if user's company matches the resolved tenant
        if (hasattr(request, 'tenant') and request.tenant and 
            hasattr(request.user, 'company') and request.user.company):
            
            if request.user.company != request.tenant:
                logger.warning(
                    f"Tenant mismatch: User {request.user.email} "
                    f"(company: {request.user.company.slug}) "
                    f"trying to access tenant: {request.tenant.slug}"
                )
                return JsonResponse({
                    'error': 'Access denied',
                    'message': 'You can only access data from your own company',
                    'status_code': 403
                }, status=403)
        
        return None
    
    def _should_skip_validation(self, request):
        """
        Determine if tenant validation should be skipped for this request.
        """
        skip_paths = [
            '/api/health/',
            '/api/docs/',
            '/api/schema/',
            '/admin/',
            '/api/v1/auth/login/',
            '/api/v1/auth/register/',
            '/api/v1/auth/logout/',
            '/api/v1/platform-admin/',  # Platform admin endpoints
        ]
        
        return any(request.path.startswith(path) for path in skip_paths)


class AuditLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to automatically create audit logs for tenant actions.
    """
    
    def process_response(self, request, response):
        """
        Log significant actions for audit trail.
        """
        # Only log for authenticated users
        if not (hasattr(request, 'user') and request.user.is_authenticated):
            return response
        
        # Only log for tenant-specific requests
        if not (hasattr(request, 'tenant') and request.tenant):
            return response
        
        # Only log certain methods and successful responses
        if (request.method in ['POST', 'PUT', 'PATCH', 'DELETE'] and 
            200 <= response.status_code < 300):
            
            try:
                self._create_audit_log(request, response)
            except Exception as e:
                logger.error(f"Failed to create audit log: {str(e)}")
        
        return response
    
    def _create_audit_log(self, request, response):
        """
        Create audit log entry for the request.
        """
        from .models import AuditLog
        
        # Extract resource info from URL
        resource_info = self._extract_resource_info(request)
        
        # Skip if not a significant action
        if not resource_info:
            return
        
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        # Create audit log
        AuditLog.objects.create(
            company=request.tenant,
            user=request.user,
            action=self._get_action_name(request.method),
            resource=resource_info['resource'],
            resource_id=resource_info.get('resource_id'),
            new_values=self._extract_request_data(request),
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
    
    def _extract_resource_info(self, request):
        """
        Extract resource information from request path.
        """
        # Map URL patterns to resources
        resource_mapping = {
            '/api/v1/inventory/products/': 'product',
            '/api/v1/inventory/warehouses/': 'warehouse',
            '/api/v1/distribution/orders/': 'order',
            '/api/v1/production/orders/': 'production_order',
            '/api/v1/warehousing/transfers/': 'transfer',
            '/api/v1/payments/subscriptions/': 'subscription',
            '/api/v1/tenants/company/': 'company',
        }
        
        for pattern, resource in resource_mapping.items():
            if request.path.startswith(pattern):
                # Extract ID from URL if present
                path_parts = request.path.strip('/').split('/')
                resource_id = None
                
                if len(path_parts) > 4 and path_parts[4] not in ['dashboard', 'bulk_update']:
                    resource_id = path_parts[4]
                
                return {
                    'resource': resource,
                    'resource_id': resource_id
                }
        
        return None
    
    def _get_action_name(self, method):
        """
        Convert HTTP method to action name.
        """
        action_mapping = {
            'POST': 'CREATE',
            'PUT': 'UPDATE',
            'PATCH': 'UPDATE',
            'DELETE': 'DELETE'
        }
        return action_mapping.get(method, 'UNKNOWN')
    
    def _extract_request_data(self, request):
        """
        Safely extract request data for audit logging.
        """
        try:
            if hasattr(request, 'data') and request.data:
                # Remove sensitive fields
                sensitive_fields = {'password', 'token', 'secret', 'key', 'cvv', 'pin'}
                data = dict(request.data)
                
                for field in sensitive_fields:
                    if field in data:
                        data[field] = '***REDACTED***'
                
                return data
        except Exception:
            pass
        
        return None