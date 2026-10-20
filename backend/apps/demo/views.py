# apps/demo/views.py
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from apps.users.serializers import UserSerializer
from apps.users.views import get_tokens_for_user, set_auth_cookies

from . import services


class DemoStartThrottle(AnonRateThrottle):
    scope = 'demo_start'


class DemoSwitchThrottle(UserRateThrottle):
    scope = 'demo_switch'


def _signed_in(user, message, code=status.HTTP_201_CREATED):
    tokens = get_tokens_for_user(user)
    response = Response({'user': UserSerializer(user).data, 'tokens': tokens, 'message': message}, status=code)
    set_auth_cookies(response, tokens)
    return response


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([DemoStartThrottle])
def start(request):
    """Create a private demo company full of sample data and sign the visitor in as its owner."""
    try:
        owner = services.start_demo()
    except services.DemoUnavailable as exc:
        return Response({'error': str(exc), 'message': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return _signed_in(owner, 'Welcome to the LogiFlow demo')


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([DemoSwitchThrottle])
def switch(request):
    """Inside a demo, switch between the owner and the driver to see both sides."""
    role = request.data.get('role')
    if role not in ('owner', 'driver'):
        return Response({'error': 'Choose owner or driver.', 'message': 'Choose owner or driver.'}, status=status.HTTP_400_BAD_REQUEST)
    other = services.counterpart(request.user, role)
    if other is None:
        return Response({'error': 'Only demo accounts can switch roles.', 'message': 'Only demo accounts can switch roles.'}, status=status.HTTP_403_FORBIDDEN)
    return _signed_in(other, f'You’re now the {role}', status.HTTP_200_OK)
