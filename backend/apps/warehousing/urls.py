# apps/warehousing/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WarehouseTransferViewSet, TransferItemViewSet

router = DefaultRouter()
router.register(r'transfers', WarehouseTransferViewSet, basename='warehousetransfer')
router.register(r'transfer-items', TransferItemViewSet, basename='transferitem')

urlpatterns = [
    path('', include(router.urls)),
]