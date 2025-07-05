# apps/inventory/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, ProductViewSet, WarehouseViewSet,
    InventoryItemViewSet, InventoryTransactionViewSet
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'warehouses', WarehouseViewSet, basename='warehouse')
router.register(r'inventory-items', InventoryItemViewSet, basename='inventoryitem')
router.register(r'transactions', InventoryTransactionViewSet, basename='inventorytransaction')

urlpatterns = [
    path('', include(router.urls)),
]