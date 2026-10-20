# apps/demo/auth.py
"""JWT authentication that also keeps demo companies inside the sandbox."""
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication

WRITE = {'POST', 'PUT', 'PATCH', 'DELETE'}
# (path prefix, what to tell the visitor)
BLOCKED = [
    ('/api/v1/payments/', 'Payments are turned off in the demo, so no card, M-Pesa or crypto checkout runs here.'),
    ('/api/v1/auth/change-password/', 'Demo accounts don’t have passwords.'),
    ('/api/v1/auth/profile/', 'Demo profiles are shared, so they can’t be edited.'),
    ('/api/v1/tenants/company/', 'The demo company’s profile can’t be changed.'),
    ('/api/v1/tenants/invitations/', 'Invitations send real emails, so they’re turned off in the demo.'),
    ('/api/v1/tenants/members/', 'Demo team members can’t be changed (you’d lock yourself out of the driver view).'),
]


class DemoAwareJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None and request.method in WRITE:
            user = result[0]
            company = getattr(user, 'company', None)
            if company is not None and company.is_demo:
                for prefix, message in BLOCKED:
                    if request.path.startswith(prefix):
                        raise PermissionDenied(f'{message} Sign up to use it for real.')
        return result
