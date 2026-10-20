# apps/demo/urls.py
from django.urls import path

from . import views

urlpatterns = [
    path('start/', views.start, name='demo-start'),
    path('switch/', views.switch, name='demo-switch'),
]
