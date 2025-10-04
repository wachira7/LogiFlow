# apps/inventory/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Sum, F
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import Category, Product, Warehouse, InventoryItem, InventoryTransaction
from .serializers import (
    CategorySerializer, ProductListSerializer, ProductDetailSerializer,
    WarehouseSerializer, InventoryItemSerializer, InventoryTransactionSerializer,
    StockAdjustmentSerializer, BulkStockUpdateSerializer, ProductCreateUpdateSerializer
)
from utils.mixins import TenantViewSetMixin, BulkActionMixin
from utils.permissions import IsCompanyMember, IsSameCompany

class CategoryViewSet(TenantViewSetMixin, BulkActionMixin, viewsets.ModelViewSet):
    """ViewSet for Category management."""
    serializer_class = CategorySerializer
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['parent']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return Category.objects.filter(
            company=self.request.user.company
        ).select_related('parent')

    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get category tree structure."""
        categories = self.get_queryset().filter(parent__isnull=True)
        def build_tree(category):
            data = CategorySerializer(category).data
            children = category.children.all()
            if children:
                data['children'] = [build_tree(child) for child in children]
            return data
        
        tree = [build_tree(cat) for cat in categories]
        return Response(tree)

class ProductViewSet(TenantViewSetMixin, BulkActionMixin, viewsets.ModelViewSet):
    """ViewSet for Product management."""
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'sku', 'barcode', 'description']
    ordering_fields = ['name', 'sku', 'unit_price', 'created_at', 'total_stock']
    ordering = ['name']

    def get_queryset(self):
        return Product.objects.filter(
            company=self.request.user.company
        ).select_related('category').prefetch_related('inventory_items__warehouse')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProductCreateUpdateSerializer
        return ProductListSerializer

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get products with low stock levels."""
        queryset = self.get_queryset().filter(
            inventory_items__quantity__lte=F('reorder_point')
        ).distinct()
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stock_report(self, request):
        """Get comprehensive stock report."""
        products = self.get_queryset()
        
        total_products = products.count()
        active_products = products.filter(is_active=True).count()
        low_stock_count = products.filter(
            inventory_items__quantity__lte=F('reorder_point')
        ).distinct().count()
        
        total_stock_value = sum(
            item.stock_value for product in products 
            for item in product.inventory_items.all()
        )
        
        return Response({
            'total_products': total_products,
            'active_products': active_products,
            'inactive_products': total_products - active_products,
            'low_stock_products': low_stock_count,
            'total_stock_value': total_stock_value
        })

class WarehouseViewSet(TenantViewSetMixin, BulkActionMixin, viewsets.ModelViewSet):
    """ViewSet for Warehouse management."""
    serializer_class = WarehouseSerializer
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'manager']
    search_fields = ['name', 'address']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return Warehouse.objects.filter(
            company=self.request.user.company
        ).select_related('manager')

    @action(detail=True, methods=['get'])
    def inventory(self, request, pk=None):
        """Get inventory items for a specific warehouse."""
        warehouse = self.get_object()
        inventory_items = InventoryItem.objects.filter(
            warehouse=warehouse
        ).select_related('product', 'warehouse')
        
        serializer = InventoryItemSerializer(inventory_items, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def stock_summary(self, request, pk=None):
        """Get stock summary for a warehouse."""
        warehouse = self.get_object()
        inventory_items = warehouse.inventory_items.select_related('product')
        
        total_items = inventory_items.count()
        total_quantity = sum(item.quantity for item in inventory_items)
        total_value = sum(item.stock_value for item in inventory_items)
        low_stock_items = inventory_items.filter(
            quantity__lte=F('product__reorder_point')
        ).count()
        
        return Response({
            'warehouse_name': warehouse.name,
            'total_product_types': total_items,
            'total_quantity': total_quantity,
            'total_value': total_value,
            'low_stock_items': low_stock_items
        })

class InventoryItemViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet for InventoryItem management."""
    serializer_class = InventoryItemSerializer
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['warehouse', 'product']
    search_fields = ['product__name', 'product__sku', 'location']
    ordering_fields = ['quantity', 'last_checked', 'created_at']
    ordering = ['product__name']

    def get_queryset(self):
        return InventoryItem.objects.filter(
            warehouse__company=self.request.user.company
        ).select_related('product', 'warehouse')

    @action(detail=False, methods=['post'])
    def adjust_stock(self, request):
        """Adjust stock levels for a product in a warehouse."""
        serializer = StockAdjustmentSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        product = serializer.validated_data['product']
        warehouse = serializer.validated_data['warehouse']
        adjustment_quantity = serializer.validated_data['adjustment_quantity']
        reason = serializer.validated_data['reason']
        notes = serializer.validated_data.get('notes', '')
        
        with transaction.atomic():
            # Get or create inventory item
            inventory_item, created = InventoryItem.objects.get_or_create(
                product=product,
                warehouse=warehouse,
                defaults={'quantity': 0}
            )
            
            # Store old quantity for audit
            old_quantity = inventory_item.quantity
            new_quantity = max(0, old_quantity + adjustment_quantity)
            inventory_item.quantity = new_quantity
            inventory_item.save()
            
            # Create transaction record
            InventoryTransaction.objects.create(
                inventory_item=inventory_item,
                transaction_type='ADJUSTMENT',
                quantity=adjustment_quantity,
                reference=reason,
                notes=notes,
                performed_by=request.user
            )
        
        return Response({
            'message': 'Stock adjusted successfully',
            'old_quantity': old_quantity,
            'new_quantity': new_quantity,
            'adjustment': adjustment_quantity
        })

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update stock levels."""
        serializer = BulkStockUpdateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        updates = serializer.validated_data['updates']
        updated_items = []
        
        with transaction.atomic():
            for update in updates:
                product = update['product']
                warehouse = update['warehouse']
                new_quantity = update['quantity']
                notes = update.get('notes', '')
                
                inventory_item, created = InventoryItem.objects.get_or_create(
                    product=product,
                    warehouse=warehouse,
                    defaults={'quantity': 0}
                )
                
                old_quantity = inventory_item.quantity
                adjustment = new_quantity - old_quantity
                inventory_item.quantity = new_quantity
                inventory_item.save()
                
                # Create transaction record
                InventoryTransaction.objects.create(
                    inventory_item=inventory_item,
                    transaction_type='ADJUSTMENT',
                    quantity=adjustment,
                    reference='Bulk Update',
                    notes=notes,
                    performed_by=request.user
                )
                
                updated_items.append({
                    'product': product.name,
                    'warehouse': warehouse.name,
                    'old_quantity': old_quantity,
                    'new_quantity': new_quantity
                })
        
        return Response({
            'message': f'Updated {len(updated_items)} inventory items',
            'updated_items': updated_items
        })

class InventoryTransactionViewSet(TenantViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet for InventoryTransaction (read-only)."""
    serializer_class = InventoryTransactionSerializer
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['transaction_type', 'inventory_item__warehouse', 'inventory_item__product']
    search_fields = ['reference', 'notes', 'inventory_item__product__name']
    ordering_fields = ['timestamp', 'quantity']
    ordering = ['-timestamp']

    def get_queryset(self):
        return InventoryTransaction.objects.filter(
            inventory_item__warehouse__company=self.request.user.company
        ).select_related('inventory_item__product', 'inventory_item__warehouse', 'performed_by')