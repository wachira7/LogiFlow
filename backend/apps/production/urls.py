# apps/production/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductionOrderViewSet, ProductionStepViewSet, ProductionMaterialViewSet

router = DefaultRouter()
router.register(r'orders', ProductionOrderViewSet, basename='productionorder')
router.register(r'steps', ProductionStepViewSet, basename='productionstep')
router.register(r'materials', ProductionMaterialViewSet, basename='productionmaterial')

urlpatterns = [
    path('', include(router.urls)),
]