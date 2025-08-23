from django.core.cache import cache
from django.http import HttpResponse
import time

class RequestThrottleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip for static files
        if request.path.startswith('/static/') or request.path.startswith('/media/'):
            return self.get_response(request)
        
        # Get client IP
        ip = self.get_client_ip(request)
        
        # Check for rapid requests (more than 10 per minute)
        cache_key = f"throttle_{ip}"
        requests = cache.get(cache_key, [])
        now = time.time()
        
        # Remove old requests (older than 1 minute)
        requests = [req_time for req_time in requests if now - req_time < 60]
        
        if len(requests) >= 10:  # More than 10 requests per minute
            return HttpResponse("Too many requests", status=429)
        
        # Add current request
        requests.append(now)
        cache.set(cache_key, requests, 60)
        
        return self.get_response(request)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip