# utils/middleware.py
import time
import json
import logging
import uuid
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta
from collections import defaultdict
import threading
from django.db import connection


logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log API requests for monitoring and debugging.
    Logs request method, path, user, response time, and status code.
    """
    
    def process_request(self, request):
        """
        Log incoming request details.
        """
        request.start_time = time.time()
        request.request_id = str(uuid.uuid4())[:8]
        
        # Log request details
        user_info = "Anonymous"
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_info = f"{request.user.email} (ID: {request.user.id})"
        
        logger.info(f"[{request.request_id}] {request.method} {request.path} - User: {user_info}")
        
        # Log request body for POST/PUT/PATCH (excluding sensitive data)
        if request.method in ['POST', 'PUT', 'PATCH'] and request.content_type == 'application/json':
            try:
                body = json.loads(request.body.decode('utf-8'))
                # Remove sensitive fields
                sanitized_body = self._sanitize_request_body(body)
                logger.debug(f"[{request.request_id}] Request Body: {json.dumps(sanitized_body)}")
            except (json.JSONDecodeError, UnicodeDecodeError):
                logger.debug(f"[{request.request_id}] Request Body: <non-json data>")
    
    def process_response(self, request, response):
        """
        Log response details and performance metrics.
        """
        if hasattr(request, 'start_time'):
            response_time = time.time() - request.start_time
            request_id = getattr(request, 'request_id', 'unknown')
            
            # Log response details
            logger.info(
                f"[{request_id}] {response.status_code} {request.method} {request.path} "
                f"- {response_time:.3f}s"
            )
            
            # Log slow requests
            if response_time > 2.0:  # Slow request threshold
                logger.warning(
                    f"[{request_id}] SLOW REQUEST: {request.method} {request.path} "
                    f"took {response_time:.3f}s"
                )
            
            # Log errors
            if response.status_code >= 400:
                logger.error(
                    f"[{request_id}] ERROR: {response.status_code} {request.method} {request.path} "
                    f"- User: {getattr(request.user, 'email', 'Anonymous')}"
                )
        
        return response
    
    def _sanitize_request_body(self, body):
        """
        Remove sensitive data from request body for logging.
        """
        sensitive_fields = {
            'password', 'token', 'secret', 'key', 'api_key',
            'credit_card', 'card_number', 'cvv', 'pin'
        }
        
        if isinstance(body, dict):
            sanitized = {}
            for key, value in body.items():
                if any(field in key.lower() for field in sensitive_fields):
                    sanitized[key] = '***REDACTED***'
                elif isinstance(value, dict):
                    sanitized[key] = self._sanitize_request_body(value)
                else:
                    sanitized[key] = value
            return sanitized
        return body


class RateLimitMiddleware(MiddlewareMixin):
    """
    Rate limiting middleware to prevent API abuse.
    Implements different rate limits for different user types.
    """
    
    # Rate limits: (requests, period_in_seconds)
    RATE_LIMITS = {
        'anonymous': (100, 3600),      # 100 requests per hour
        'authenticated': (800, 3600), 
        'premium': (2000, 3600),       
        'enterprise': (5000, 3600),   
    }
    
    def process_request(self, request):
        """
        Check rate limits before processing request.
        """
        if not self._should_rate_limit(request):
            return None
        
        user_type = self._get_user_type(request)
        limit, period = self.RATE_LIMITS[user_type]
        
        # Create cache key
        if request.user.is_authenticated:
            cache_key = f"rate_limit_user_{request.user.id}"
        else:
            cache_key = f"rate_limit_ip_{self._get_client_ip(request)}"
        
        # Check current request count
        current_requests = cache.get(cache_key, 0)
        
        if current_requests >= limit:
            logger.warning(
                f"Rate limit exceeded for {cache_key}: {current_requests}/{limit} "
                f"requests in {period}s"
            )
            return JsonResponse({
                'error': 'Rate limit exceeded',
                'detail': f'Maximum {limit} requests per hour allowed',
                'retry_after': period
            }, status=429)
        
        # Increment request count
        cache.set(cache_key, current_requests + 1, period)
        
        return None
    
    def _should_rate_limit(self, request):
        """
        Determine if request should be rate limited.
        """
        # Skip rate limiting for certain paths
        exempt_paths = ['/api/v1/auth/logout/', '/api/v1/health/']
        if request.path in exempt_paths:
            return False
        
        # Skip rate limiting in development
        if settings.DEBUG and not getattr(settings, 'ENABLE_RATE_LIMITING', False):
            return False
        
        return True
    
    def _get_user_type(self, request):
        """
        Determine user type for rate limiting.
        """
        if not request.user.is_authenticated:
            return 'anonymous'
        
        # Check subscription level (you can customize this logic)
        if hasattr(request.user, 'company') and hasattr(request.user.company, 'subscriptions'):
            # Get active subscription
            active_subscription = request.user.company.subscriptions.filter(
                status='ACTIVE'
            ).first()
            
            if active_subscription:
                plan_name = active_subscription.plan.name.lower()
                if 'enterprise' in plan_name:
                    return 'enterprise'
                elif 'professional' in plan_name or 'pro' in plan_name:
                    return 'premium'
        
        return 'authenticated'
    
    def _get_client_ip(self, request):
        """
        Get client IP address from request.
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PerformanceMonitoringMiddleware(MiddlewareMixin):
    """
    Monitor application performance and database queries.
    """
    
    def process_request(self, request):
        """
        Initialize performance monitoring.
        """
        request.performance_start = time.time()
        request.queries_before = len(connection.queries)
    
    def process_response(self, request, response):
        """
        Log performance metrics.
        """
        if hasattr(request, 'performance_start'):
            total_time = time.time() - request.performance_start
            queries_count = len(connection.queries) - getattr(request, 'queries_before', 0)
            
            # Log performance metrics
            if total_time > 1.0 or queries_count > 20:  # Performance thresholds
                logger.warning(
                    f"PERFORMANCE: {request.method} {request.path} - "
                    f"Time: {total_time:.3f}s, DB Queries: {queries_count}"
                )
            
            # Store metrics for analytics (optional)
            if hasattr(settings, 'STORE_PERFORMANCE_METRICS') and settings.STORE_PERFORMANCE_METRICS:
                self._store_performance_metrics(request, total_time, queries_count)
        
        return response
    
    def _store_performance_metrics(self, request, response_time, query_count):
        """
        Store performance metrics for analytics.
        """
        try:
            # You can implement custom storage logic here
            # For example, send to analytics service or store in database
            metrics = {
                'timestamp': timezone.now().isoformat(),
                'method': request.method,
                'path': request.path,
                'response_time': response_time,
                'query_count': query_count,
                'user_id': request.user.id if request.user.is_authenticated else None,
            }
            
            #  Store in cache for batch processing
            cache_key = f"performance_metrics_{timezone.now().strftime('%Y%m%d_%H')}"
            existing_metrics = cache.get(cache_key, [])
            existing_metrics.append(metrics)
            cache.set(cache_key, existing_metrics, 3600)  # Store for 1 hour
            
        except Exception as e:
            logger.error(f"Failed to store performance metrics: {e}")


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Add security headers to all responses.
    """
    
    def process_response(self, request, response):
        """
        Add security headers to response.
        """
        # Prevent clickjacking
        response['X-Frame-Options'] = 'DENY'
        
        # Prevent MIME type sniffing
        response['X-Content-Type-Options'] = 'nosniff'
        
        # Enable XSS protection
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Referrer policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Content Security Policy (adjust based on your needs)
        if not settings.DEBUG:
            response['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' https:; "
                "connect-src 'self' https:;"
                
            )
        
        # HTTPS enforcement (only in production)
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response


class HealthCheckMiddleware(MiddlewareMixin):
    """
    Provide health check endpoints for load balancers and monitoring.
    """
    
    def process_request(self, request):
        """
        Handle health check requests.
        """
        if request.path == '/health/' or request.path == '/api/health/':
            return JsonResponse({
                'status': 'healthy',
                'timestamp': timezone.now().isoformat(),
                'version': getattr(settings, 'APP_VERSION', '1.0.0'),
                'environment': getattr(settings, 'ENVIRONMENT', 'development')
            })
        
        if request.path == '/api/health/detailed/':
            return self._detailed_health_check(request)
        
        return None
    
    def _detailed_health_check(self, request):
        """
        Provide detailed health check with database connectivity.
        """
        health_status = {
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'checks': {}
        }
        
        # Database check
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            health_status['checks']['database'] = 'healthy'
        except Exception as e:
            health_status['status'] = 'unhealthy'
            health_status['checks']['database'] = f'error: {str(e)}'
        
        # Cache check
        try:
            cache.set('health_check', 'test', 30)
            cached_value = cache.get('health_check')
            if cached_value == 'test':
                health_status['checks']['cache'] = 'healthy'
            else:
                health_status['checks']['cache'] = 'unhealthy'
        except Exception as e:
            health_status['status'] = 'unhealthy'
            health_status['checks']['cache'] = f'error: {str(e)}'
        
        status_code = 200 if health_status['status'] == 'healthy' else 503
        return JsonResponse(health_status, status=status_code)


class TenantMiddleware(MiddlewareMixin):
    """
    Enhanced tenant middleware for multi-tenant architecture.
    Works with your existing tenant system.
    """
    
    def process_request(self, request):
        """
        Set tenant context based on subdomain or header.
        """
        tenant = self._get_tenant(request)
        if tenant:
            request.tenant = tenant
            # You can add tenant-specific logic here
        
        return None
    
    def _get_tenant(self, request):
        """
        Extract tenant from request (subdomain, header, or user).
        """
        # Method 1: From subdomain (e.g., acme.logiflow.com)
        host = request.get_host().lower()
        if '.' in host:
            subdomain = host.split('.')[0]
            if subdomain not in ['www', 'api', 'admin']:
                # Look up tenant by subdomain
                try:
                    from apps.tenants.models import Company
                    return Company.objects.get(slug=subdomain)
                except Company.DoesNotExist:
                    pass
        
        # Method 2: From X-Tenant header
        tenant_header = request.META.get('HTTP_X_TENANT')
        if tenant_header:
            try:
                from apps.tenants.models import Company
                return Company.objects.get(slug=tenant_header)
            except Company.DoesNotExist:
                pass
        
        # Method 3: From authenticated user
        if hasattr(request, 'user') and request.user.is_authenticated:
            if hasattr(request.user, 'company'):
                return request.user.company
        
        return None


class RequestIDMiddleware(MiddlewareMixin):
    """
    Add unique request ID to each request for tracing.
    """
    
    def process_request(self, request):
        """
        Generate unique request ID.
        """
        request.id = str(uuid.uuid4())
        return None
    
    def process_response(self, request, response):
        """
        Add request ID to response headers.
        """
        if hasattr(request, 'id'):
            response['X-Request-ID'] = request.id
        return response


class CORSMiddleware(MiddlewareMixin):
    """
    Custom CORS middleware for API access.
    """
    
    def process_response(self, request, response):
        """
        Add CORS headers to response.
        """
        # Get allowed origins from settings
        allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [
            'http://localhost:3000',
            'http://localhost:8080',
            'https://app.logiflow.com'
        ])
        
        origin = request.META.get('HTTP_ORIGIN')
        if origin in allowed_origins:
            response['Access-Control-Allow-Origin'] = origin
        
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = (
            'Accept, Accept-Language, Content-Type, Authorization, '
            'X-Requested-With, X-CSRFToken, X-Tenant'
        )
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Max-Age'] = '86400'  # 24 hours
        
        return response
    
    def process_request(self, request):
        """
        Handle preflight OPTIONS requests.
        """
        if request.method == 'OPTIONS':
            response = JsonResponse({})
            return self.process_response(request, response)
        return None


class MaintenanceModeMiddleware(MiddlewareMixin):
    """
    Maintenance mode middleware to temporarily disable the API.
    """
    
    def process_request(self, request):
        """
        Check if maintenance mode is enabled.
        """
        # Check if maintenance mode is enabled
        maintenance_mode = cache.get('maintenance_mode', False)
        
        if maintenance_mode:
            # Allow access to certain paths during maintenance
            allowed_paths = ['/api/health/', '/admin/', '/api/v1/auth/logout/']
            if not any(request.path.startswith(path) for path in allowed_paths):
                
                # Allow superusers to access during maintenance
                if hasattr(request, 'user') and request.user.is_authenticated and request.user.is_superuser:
                    return None
                
                maintenance_message = cache.get('maintenance_message', 
                    'LogiFlow is temporarily unavailable for maintenance. Please try again later.')
                
                estimated_completion = cache.get('maintenance_completion_time')
                
                return JsonResponse({
                    'error': 'Service Unavailable',
                    'message': maintenance_message,
                    'estimated_completion': estimated_completion,
                    'status_code': 503
                }, status=503)
        
        return None


# Utility functions for middleware management
def enable_maintenance_mode(message=None, completion_time=None):
    """
    Enable maintenance mode.
    
    Args:
        message: Custom maintenance message
        completion_time: Estimated completion time (datetime object)
    """
    cache.set('maintenance_mode', True, None)  # No expiration
    
    if message:
        cache.set('maintenance_message', message, None)
    
    if completion_time:
        cache.set('maintenance_completion_time', completion_time.isoformat(), None)
    
    logger.info("Maintenance mode enabled")


def disable_maintenance_mode():
    """
    Disable maintenance mode.
    """
    cache.delete('maintenance_mode')
    cache.delete('maintenance_message')
    cache.delete('maintenance_completion_time')
    logger.info("Maintenance mode disabled")


def get_request_metrics(hours=24):
    """
    Get request metrics for the specified number of hours.
    """
    metrics = []
    current_time = timezone.now()
    
    for i in range(hours):
        hour_start = current_time - timedelta(hours=i+1)
        cache_key = f"performance_metrics_{hour_start.strftime('%Y%m%d_%H')}"
        hour_metrics = cache.get(cache_key, [])
        
        if hour_metrics:
            # Calculate hourly statistics
            response_times = [m['response_time'] for m in hour_metrics]
            query_counts = [m['query_count'] for m in hour_metrics]
            
            metrics.append({
                'hour': hour_start.strftime('%Y-%m-%d %H:00'),
                'request_count': len(hour_metrics),
                'avg_response_time': sum(response_times) / len(response_times),
                'max_response_time': max(response_times),
                'avg_query_count': sum(query_counts) / len(query_counts),
                'max_query_count': max(query_counts)
            })
    
    return sorted(metrics, key=lambda x: x['hour'])