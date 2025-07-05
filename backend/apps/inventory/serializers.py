# apps/inventory/serializers.py
from rest_framework import serializers
from django.db import transaction
from .models import Category, Product, Warehouse, InventoryItem, InventoryTransaction
from apps.users.models import User

class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    parent_id = serializers.UUIDField(required=False, allow_null=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    full_path = serializers.CharField(read_only=True)
    children_count = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'company_id', 'name', 'description', 'parent_id', 'parent_name',
            'full_path', 'children_count', 'products_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company_id', 'created_at', 'updated_at']

    def get_children_count(self, obj):
        return obj.children.count()

    def get_products_count(self, obj):
        return obj.products.count()

class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product lists."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    category_id = serializers.UUIDField(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    total_stock = serializers.ReadOnlyField()
    needs_reorder = serializers.ReadOnlyField()
    profit_margin = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'company_id', 'name', 'sku', 'category_id', 'category_name',
            'unit_price', 'cost_price', 'profit_margin', 'total_stock', 
            'needs_reorder', 'reorder_point', 'is_active', 'created_at'
        ]

class ProductDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Product model."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    category_id = serializers.UUIDField(required=False, allow_null=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_full_path = serializers.CharField(source='category.full_path', read_only=True)
    total_stock = serializers.ReadOnlyField()
    needs_reorder = serializers.ReadOnlyField()
    profit_margin = serializers.ReadOnlyField()
    stock_by_warehouse = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'company_id', 'name', 'sku', 'description', 'category_id',
            'category_name', 'category_full_path', 'unit_price', 'cost_price',
            'profit_margin', 'barcode', 'weight', 'dimensions', 'image',
            'min_stock_level', 'max_stock_level', 'reorder_point', 'lead_time_days',
            'total_stock', 'needs_reorder', 'stock_by_warehouse', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company_id', 'created_at', 'updated_at']

    def get_stock_by_warehouse(self, obj):
        return [
            {
                'warehouse_id': str(item.warehouse.id),
                'warehouse_name': item.warehouse.name,
                'quantity': item.quantity,
                'location': item.location,
                'last_checked': item.last_checked
            }
            for item in obj.inventory_items.select_related('warehouse')
        ]

class WarehouseSerializer(serializers.ModelSerializer):
    """Serializer for Warehouse model."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    manager_id = serializers.UUIDField(required=False, allow_null=True)
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    total_products = serializers.ReadOnlyField()
    total_stock_value = serializers.ReadOnlyField()

    class Meta:
        model = Warehouse
        fields = [
            'id', 'company_id', 'name', 'address', 'manager_id', 'manager_name',
            'total_products', 'total_stock_value', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company_id', 'created_at', 'updated_at']

class InventoryItemSerializer(serializers.ModelSerializer):
    """Serializer for InventoryItem model."""
    id = serializers.UUIDField(read_only=True)
    product_id = serializers.UUIDField(read_only=True)
    warehouse_id = serializers.UUIDField(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    stock_value = serializers.ReadOnlyField()
    product_unit_price = serializers.DecimalField(source='product.unit_price', max_digits=10, decimal_places=2, read_only=True)
    product_cost_price = serializers.DecimalField(source='product.cost_price', max_digits=10, decimal_places=2, read_only=True)
    reorder_point = serializers.IntegerField(source='product.reorder_point', read_only=True)
    needs_reorder = serializers.SerializerMethodField()

    class Meta:
        model = InventoryItem
        fields = [
            'id', 'product_id', 'warehouse_id', 'product_name', 'product_sku',
            'warehouse_name', 'quantity', 'location', 'stock_value',
            'product_unit_price', 'product_cost_price', 'reorder_point',
            'needs_reorder', 'last_checked', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'product_id', 'warehouse_id', 'created_at', 'updated_at']

    def get_needs_reorder(self, obj):
        return obj.quantity <= obj.product.reorder_point

class InventoryTransactionSerializer(serializers.ModelSerializer):
    """Serializer for InventoryTransaction model."""
    id = serializers.UUIDField(read_only=True)
    inventory_item_id = serializers.UUIDField(read_only=True)
    performed_by_id = serializers.UUIDField(read_only=True)
    product_name = serializers.CharField(source='inventory_item.product.name', read_only=True)
    product_sku = serializers.CharField(source='inventory_item.product.sku', read_only=True)
    warehouse_name = serializers.CharField(source='inventory_item.warehouse.name', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = [
            'id', 'inventory_item_id', 'transaction_type', 'quantity', 'reference',
            'notes', 'performed_by_id', 'performed_by_name', 'product_name',
            'product_sku', 'warehouse_name', 'timestamp'
        ]
        read_only_fields = ['id', 'inventory_item_id', 'performed_by_id', 'timestamp']

class StockAdjustmentSerializer(serializers.Serializer):
    """Serializer for stock adjustments."""
    product_id = serializers.UUIDField()
    warehouse_id = serializers.UUIDField()
    adjustment_quantity = serializers.IntegerField()
    reason = serializers.CharField(max_length=255)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        # Validate that product and warehouse exist and belong to the same company
        company = self.context['request'].user.company
        
        try:
            product = Product.objects.get(id=attrs['product_id'], company=company)
            warehouse = Warehouse.objects.get(id=attrs['warehouse_id'], company=company)
        except (Product.DoesNotExist, Warehouse.DoesNotExist):
            raise serializers.ValidationError("Product or warehouse not found.")
        
        attrs['product'] = product
        attrs['warehouse'] = warehouse
        return attrs

class BulkStockUpdateSerializer(serializers.Serializer):
    """Serializer for bulk stock updates."""
    updates = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        allow_empty=False
    )

    def validate_updates(self, value):
        company = self.context['request'].user.company
        validated_updates = []
        
        for update in value:
            try:
                product_id = update.get('product_id')
                warehouse_id = update.get('warehouse_id')
                quantity = int(update.get('quantity', 0))
                
                product = Product.objects.get(id=product_id, company=company)
                warehouse = Warehouse.objects.get(id=warehouse_id, company=company)
                
                validated_updates.append({
                    'product': product,
                    'warehouse': warehouse,
                    'quantity': quantity,
                    'notes': update.get('notes', '')
                })
            except (Product.DoesNotExist, Warehouse.DoesNotExist, ValueError):
                raise serializers.ValidationError(f"Invalid update data: {update}")
        
        return validated_updates