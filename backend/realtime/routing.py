# realtime/routing.py
from django.urls import path

from .consumers import OpsConsumer

websocket_urlpatterns = [
    path('ws/ops/', OpsConsumer.as_asgi()),
]
