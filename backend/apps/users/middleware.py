# apps/users/middleware.py
from django.http import JsonResponse

class PlatformAdminProtectionMiddleware:
    """
    Ensures only authorized users can access platform admin endpoints
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if accessing platform admin endpoints
        if request.path.startswith('/api/v1/platform-admin/'):
            if not request.user.is_authenticated:
                return JsonResponse({
                    'error': 'Authentication required',
                    'detail': 'You must be logged in to access this resource'
                }, status=401)
            
            is_platform_admin = getattr(request.user, 'is_platform_admin', False)
            is_superuser = getattr(request.user, 'is_superuser', False)
            
            if not (is_platform_admin or is_superuser):
                return JsonResponse({
                    'error': 'Platform admin access required',
                    'detail': 'This endpoint is restricted to platform administrators'
                }, status=403)
        
        response = self.get_response(request)
        return response