# apps/ops/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'exceptions', views.ExceptionViewSet, basename='delivery-exception')
router.register(r'vehicles', views.VehicleViewSet, basename='vehicle')

urlpatterns = [
    path('search/', views.SearchView.as_view(), name='ops-search'),
    path('activity/', views.ActivityView.as_view(), name='ops-activity'),
    path('board/', views.BoardView.as_view(), name='ops-board'),
    path('fleet/live/', views.FleetLiveView.as_view(), name='ops-fleet-live'),
    path('pings/', views.PingView.as_view(), name='ops-pings'),
    path('driver/today/', views.DriverTodayView.as_view(), name='ops-driver-today'),
    path('shipments/<uuid:pk>/timeline/', views.ShipmentTimelineView.as_view(), name='ops-shipment-timeline'),
    path('shipments/<uuid:pk>/proof/', views.ProofView.as_view(), name='ops-shipment-proof'),
    path('routes/<uuid:pk>/trail/', views.RouteTrailView.as_view(), name='ops-route-trail'),
    path('', include(router.urls)),
]
