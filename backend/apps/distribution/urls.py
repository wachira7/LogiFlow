# apps/distribution/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerOrderViewSet, ShipmentViewSet, DeliveryRouteViewSet, RouteStopViewSet

router = DefaultRouter()
router.register(r'orders', CustomerOrderViewSet, basename='customerorder')
router.register(r'shipments', ShipmentViewSet, basename='shipment')
router.register(r'routes', DeliveryRouteViewSet, basename='deliveryroute')
router.register(r'route-stops', RouteStopViewSet, basename='routestop')

urlpatterns = [
    path('', include(router.urls)),
]
