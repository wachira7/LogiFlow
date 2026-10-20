"""
ASGI entry point: HTTP goes to Django, websockets (/ws/...) to Channels.

Run in production with:  daphne -b 0.0.0.0 -p 8000 logistics_project.asgi:application
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'logistics_project.settings')
django_asgi_app = get_asgi_application()  # set up Django before importing anything that uses models

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from realtime.middleware import FrontendOriginValidator  # noqa: E402
from realtime.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': FrontendOriginValidator(URLRouter(websocket_urlpatterns)),
})
