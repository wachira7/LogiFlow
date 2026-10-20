# apps/inventory/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Exists, F, OuterRef, Sum
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import Category, Product, Warehouse, InventoryItem, InventoryTransaction
from .serializers import (
    CategorySerializer, ProductListSerializer, ProductDetailSerializer,
    WarehouseSerializer, InventoryItemSerializer, InventoryTransactionSerializer,
    StockAdjustmentSerializer, BulkStockUpdateSerializer, ProductCreateUpdateSerializer,
    InventoryItemCreateSerializer, StockReceiptSerializer,
)
from utils.mixins import TenantViewSetMixin, BulkActionMixin
from utils.permissions import IsCompanyMember, IsSameCompany


def blocked(message):
    return Response({'error': message, 'message': message}, status=status.HTTP_400_BAD_REQUEST)


class StockOrderingFilter(filters.OrderingFilter):
    """Lets clients order by `total_stock` (a model property) using the annotated stock_on_hand."""

    def get_ordering(self, request, queryset, view):
        ordering = super().get_ordering(request, queryset, view)
        return [o.replace('total_stock', 'stock_on_hand') for o in ordering] if ordering else ordering

    def remove_invalid_fields(self, queryset, fields, view, request):
        fields = [f.replace('total_stock', 'stock_on_hand') for f in fields]
        return super().remove_invalid_fields(queryset, fields, view, request)

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

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        if category.children.exists():
            return blocked('This category has subcategories. Move or delete them first.')
        return super().destroy(request, *args, **kwargs)

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
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, StockOrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'sku', 'barcode', 'description']
    ordering_fields = ['name', 'sku', 'unit_price', 'created_at', 'stock_on_hand']
    ordering = ['name']

    def get_queryset(self):
        qs = Product.objects.filter(
            company=self.request.user.company
        ).select_related('category').prefetch_related('inventory_items__warehouse').annotate(
            stock_on_hand=Coalesce(Sum('inventory_items__quantity'), 0),
        )
        params = self.request.query_params
        if params.get('warehouse'):
            qs = qs.filter(inventory_items__warehouse_id=params['warehouse'])
        if params.get('low_stock') == 'true':
            qs = qs.filter(reorder_point__gt=0, stock_on_hand__lte=F('reorder_point'))
        return qs.distinct()

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        history = [
            (InventoryTransaction.objects.filter(inventory_item__product=product), 'stock movements'),
            (product.order_items.all(), 'customer orders'),
            (product.shipment_items.all(), 'shipments'),
            (product.production_orders.all(), 'production orders'),
            (product.used_in_production.all(), 'production materials'),
            (product.transfer_items.all(), 'warehouse transfers'),
        ]
        used_in = [label for qs, label in history if qs.exists()]
        if used_in:
            return blocked(
                f'{product.name} has history in {", ".join(used_in)}, so it can’t be deleted. '
                'Deactivate it instead to hide it from new orders.'
            )
        return super().destroy(request, *args, **kwargs)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProductCreateUpdateSerializer
        return ProductListSerializer

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get products with low stock levels."""
        # Only products with a reorder point set; a stock line at or below it counts as low
        queryset = self.get_queryset().filter(
            reorder_point__gt=0, inventory_items__quantity__lte=F('reorder_point')
        ).distinct()
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stock_report(self, request):
        """Stock snapshot: totals, value by warehouse and category, and what needs reordering."""
        products = self.get_queryset()
        company = request.user.company
        lines = InventoryItem.objects.filter(warehouse__company=company, product__in=products.values('pk'))
        line_value = F('quantity') * F('product__cost_price')

        total_products = products.count()
        active = products.filter(is_active=True)
        low = active.filter(reorder_point__gt=0, stock_on_hand__lte=F('reorder_point'))
        totals = lines.aggregate(value=Sum(line_value), units=Sum('quantity'))

        by_warehouse = [
            {'id': str(w['warehouse_id']), 'name': w['warehouse__name'], 'lines': w['lines'],
             'units': w['units'] or 0, 'value': w['value'] or 0}
            for w in lines.values('warehouse_id', 'warehouse__name')
            .annotate(lines=Count('id'), units=Sum('quantity'), value=Sum(line_value)).order_by('-value')
        ]
        by_category = [
            {'id': str(c['product__category_id']) if c['product__category_id'] else None,
             'name': c['product__category__name'] or 'Uncategorised', 'units': c['units'] or 0, 'value': c['value'] or 0}
            for c in lines.values('product__category_id', 'product__category__name')
            .annotate(units=Sum('quantity'), value=Sum(line_value)).order_by('-value')
        ]
        reorder = [
            {'id': str(p.id), 'name': p.name, 'sku': p.sku, 'unit_of_measure': p.unit_of_measure,
             'stock': p.stock_on_hand, 'reorder_point': p.reorder_point, 'max_stock_level': p.max_stock_level,
             'suggested_order': max((p.max_stock_level or p.reorder_point * 2) - p.stock_on_hand, 0)}
            for p in low.order_by('stock_on_hand', 'name')[:50]
        ]

        return Response({
            'total_products': total_products,
            'active_products': active.count(),
            'inactive_products': total_products - active.count(),
            'low_stock_products': low.count(),
            'out_of_stock_products': active.filter(stock_on_hand=0).count(),
            'total_stock_value': totals['value'] or 0,
            'total_units': totals['units'] or 0,
            'by_warehouse': by_warehouse,
            'by_category': by_category,
            'reorder': reorder,
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

    def destroy(self, request, *args, **kwargs):
        warehouse = self.get_object()
        history = [
            (warehouse.inventory_items.filter(quantity__gt=0), 'stock on hand'),
            (InventoryTransaction.objects.filter(inventory_item__warehouse=warehouse), 'stock movements'),
            (warehouse.shipments.all(), 'shipments'),
            (warehouse.outbound_transfers.all(), 'transfers'),
            (warehouse.inbound_transfers.all(), 'transfers'),
            (warehouse.production_materials.all(), 'production materials'),
        ]
        used_in = sorted({label for qs, label in history if qs.exists()})
        if used_in:
            return blocked(
                f'{warehouse.name} has {", ".join(used_in)}, so it can’t be deleted. '
                'Deactivate it instead to stop using it.'
            )
        return super().destroy(request, *args, **kwargs)

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
            product__reorder_point__gt=0, quantity__lte=F('product__reorder_point')
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
        qs = InventoryItem.objects.filter(
            warehouse__company=self.request.user.company
        ).select_related('product', 'warehouse')
        if self.request.query_params.get('low_stock') == 'true':
            qs = qs.filter(product__reorder_point__gt=0, quantity__lte=F('product__reorder_point'))
        if self.request.query_params.get('out_of_stock') == 'true':
            qs = qs.filter(quantity__lte=0)
        return qs

    def create(self, request, *args, **kwargs):
        """Start stocking a product in a warehouse; an opening quantity is recorded as a receipt."""
        serializer = InventoryItemCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            item = InventoryItem.objects.create(
                product=data['product'], warehouse=data['warehouse'], quantity=data['quantity'], location=data['location'],
            )
            if data['quantity']:
                InventoryTransaction.objects.create(
                    inventory_item=item, transaction_type='RECEIPT', quantity=data['quantity'],
                    reference='Opening stock', performed_by=request.user,
                )
        return Response(InventoryItemSerializer(item).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        item = self.get_object()
        if item.quantity > 0 or item.transactions.exists():
            return blocked('This stock line has stock or movement history. Adjust it to zero and keep it for the record.')
        return super().destroy(request, *args, **kwargs)

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
            inventory_item, created = InventoryItem.objects.get_or_create(
                product=product,
                warehouse=warehouse,
                defaults={'quantity': 0}
            )
            # Lock the row so concurrent adjustments can't overdraw stock
            inventory_item = InventoryItem.objects.select_for_update().get(pk=inventory_item.pk)

            old_quantity = inventory_item.quantity
            new_quantity = old_quantity + adjustment_quantity
            if new_quantity < 0:
                return blocked(
                    f'Only {old_quantity} of {product.name} in stock at {warehouse.name}; '
                    f'you can remove at most {old_quantity}.'
                )
            inventory_item.quantity = new_quantity
            if reason.strip().lower() == 'stock count':
                inventory_item.last_checked = timezone.now()
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
    def receive(self, request):
        """Goods in: add stock to a warehouse (creating the stock line if needed) and record a RECEIPT."""
        serializer = StockReceiptSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            item, created = InventoryItem.objects.get_or_create(
                product=data['product'], warehouse=data['warehouse'], defaults={'quantity': 0, 'location': data['location']},
            )
            item = InventoryItem.objects.select_for_update().get(pk=item.pk)
            old_quantity = item.quantity
            item.quantity += data['quantity']
            if data['location']:
                item.location = data['location']
            item.save()
            InventoryTransaction.objects.create(
                inventory_item=item, transaction_type='RECEIPT', quantity=data['quantity'],
                reference=data['reference'] or 'Goods received', notes=data['notes'], performed_by=request.user,
            )
        return Response({
            'message': f'Received {data["quantity"]} × {data["product"].name} into {data["warehouse"].name}.',
            'created': created, 'old_quantity': old_quantity, 'new_quantity': item.quantity,
            'item': InventoryItemSerializer(item).data,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

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
                
                inventory_item = InventoryItem.objects.select_for_update().get(pk=inventory_item.pk)
                old_quantity = inventory_item.quantity
                adjustment = new_quantity - old_quantity
                inventory_item.last_checked = timezone.now()  # a bulk update is a count, even when nothing changed
                inventory_item.quantity = new_quantity
                inventory_item.save()
                if adjustment == 0:
                    continue  # unchanged: nothing to record
                
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
        qs = InventoryTransaction.objects.filter(
            inventory_item__warehouse__company=self.request.user.company
        ).select_related('inventory_item__product', 'inventory_item__warehouse', 'performed_by')
        # Short parameter names the frontend sends
        params = self.request.query_params
        if params.get('product'):
            qs = qs.filter(inventory_item__product_id=params['product'])
        if params.get('warehouse'):
            qs = qs.filter(inventory_item__warehouse_id=params['warehouse'])
        if params.get('date_from'):
            qs = qs.filter(timestamp__date__gte=params['date_from'])
        if params.get('date_to'):
            qs = qs.filter(timestamp__date__lte=params['date_to'])
        return qs