# apps/inventory/serializers.py
from rest_framework import serializers
from django.db import transaction
from django.db.models import Sum
from .models import Category, Product, Warehouse, InventoryItem, InventoryTransaction
from apps.users.models import User

class CompanyScopedMixin:
    """Helpers for serializers whose objects belong to the requesting user's company."""

    @property
    def company(self):
        return self.context['request'].user.company

    def ensure_unique(self, model, field, value, message):
        qs = model.objects.filter(company=self.company, **{f'{field}__iexact': value})
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(message)
        return value


class CategorySerializer(CompanyScopedMixin, serializers.ModelSerializer):
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
            'full_path', 'children_count', 'products_count', 'created_at', 'updated_at', 'is_active'
        ]
        read_only_fields = ['id', 'company_id', 'created_at', 'updated_at']

    def validate_name(self, value):
        return self.ensure_unique(Category, 'name', value.strip(), 'A category with this name already exists.')

    def validate_parent_id(self, value):
        if value is None:
            return None
        parent = Category.objects.filter(id=value, company=self.company).first()
        if parent is None:
            raise serializers.ValidationError('Parent category not found.')
        # A category can't sit under itself or one of its own subcategories
        node = parent
        while node is not None:
            if self.instance is not None and node.pk == self.instance.pk:
                raise serializers.ValidationError('A category can’t be placed inside itself or its subcategories.')
            node = node.parent
        return value

    def get_children_count(self, obj):
        return obj.children.count()

    def get_products_count(self, obj):
        return obj.products.count()

class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product lists."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    category_id = serializers.UUIDField(read_only=True)
    image = serializers.SerializerMethodField()
    
    # ADD: Include the full category object (lightweight version)
    category = serializers.SerializerMethodField()
    
    # KEEP: For backward compatibility
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    total_stock = serializers.ReadOnlyField()
    needs_reorder = serializers.ReadOnlyField()
    profit_margin = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'company_id', 'name', 'sku', 'category_id', 'category', 'category_name',
            'unit_price', 'cost_price', 'profit_margin', 'total_stock', 'unit_of_measure',
            'needs_reorder', 'reorder_point', 'max_stock_level', 'is_active','image', 'created_at', 'updated_at'
        ]

    def get_category(self, obj):
        """Return lightweight category data"""
        if obj.category:
            return {
                'id': str(obj.category.id),
                'name': obj.category.name,
                'is_active': obj.category.is_active
            }
        return None
    
    def get_image(self, obj):  
        if obj.image and obj.image.name:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None



class ProductDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Product model."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    category_id = serializers.UUIDField(required=False, allow_null=True)
    image = serializers.SerializerMethodField()
    
    # full category object
    category = CategorySerializer(read_only=True)
    
    # for backward compatibility
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
            'category', 'category_name', 'category_full_path', 'unit_price', 'cost_price',
            'profit_margin', 'barcode', 'weight', 'dimensions', 'image', 'unit_of_measure',
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
    
    def get_image(self, obj):  
        if obj.image and obj.image.name:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

class ProductCreateUpdateSerializer(CompanyScopedMixin, serializers.ModelSerializer):
    """Serializer for creating and updating products."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    category_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = Product
        fields = [
            'id', 'company_id', 'name', 'sku', 'description', 'category_id',
            'unit_price', 'cost_price', 'barcode', 'weight', 'dimensions', 'image', 'unit_of_measure',
            'min_stock_level', 'max_stock_level', 'reorder_point', 'lead_time_days',
            'is_active'
        ]
        read_only_fields = ['id', 'company_id']

    def validate_sku(self, value):
        return self.ensure_unique(Product, 'sku', value.strip(), 'A product with this SKU already exists.')

    def validate_category_id(self, value):
        if value is not None and not Category.objects.filter(id=value, company=self.company).exists():
            raise serializers.ValidationError('Category not found.')
        return value

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Price can’t be negative.')
        return value

    def validate_cost_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Cost can’t be negative.')
        return value

    def validate(self, attrs):
        minimum = attrs.get('min_stock_level', getattr(self.instance, 'min_stock_level', 0))
        maximum = attrs.get('max_stock_level', getattr(self.instance, 'max_stock_level', 0))
        if maximum and minimum > maximum:
            raise serializers.ValidationError({'max_stock_level': 'Maximum stock must be at least the minimum stock.'})
        return attrs

    def create(self, validated_data):
        validated_data['company'] = self.company
        return super().create(validated_data)


class WarehouseSerializer(CompanyScopedMixin, serializers.ModelSerializer):
    """Serializer for Warehouse model."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    manager_id = serializers.UUIDField(required=False, allow_null=True)
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)
    manager_email = serializers.EmailField(source='manager.email', read_only=True)
    manager_phone = serializers.CharField(source='manager.phone_number', read_only=True)
    total_products = serializers.ReadOnlyField()
    total_stock_value = serializers.ReadOnlyField()
    utilization_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Warehouse
        fields = [
            'id', 'company_id', 'name', 'code', 'description','capacity', 'address',
            'city', 'state', 'postal_code', 'country', 'phone', 'email', 'manager_id', 'manager_name',
            'manager_email', 'manager_phone',
            'total_products', 'total_stock_value', 'utilization_percentage', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company_id', 'created_at', 'updated_at']

    def validate_name(self, value):
        return self.ensure_unique(Warehouse, 'name', value.strip(), 'A warehouse with this name already exists.')

    def validate_manager_id(self, value):
        if value is not None and not User.objects.filter(id=value, company=self.company).exists():
            raise serializers.ValidationError('Manager not found in your company.')
        return value

    def get_utilization_percentage(self, obj):
        """Units in stock as a share of capacity, or None when no capacity is set."""
        if not obj.capacity:
            return None
        units = obj.inventory_items.aggregate(total=Sum('quantity'))['total'] or 0
        return round(units / obj.capacity * 100, 1)

class InventoryItemSerializer(serializers.ModelSerializer):
    """Serializer for InventoryItem model."""
    id = serializers.UUIDField(read_only=True)
    product_id = serializers.UUIDField(read_only=True)
    warehouse_id = serializers.UUIDField(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    warehouse_code = serializers.CharField(source='warehouse.code', read_only=True)
    unit_of_measure = serializers.CharField(source='product.unit_of_measure', read_only=True)
    stock_value = serializers.ReadOnlyField()
    product_unit_price = serializers.DecimalField(source='product.unit_price', max_digits=10, decimal_places=2, read_only=True)
    product_cost_price = serializers.DecimalField(source='product.cost_price', max_digits=10, decimal_places=2, read_only=True)
    reorder_point = serializers.IntegerField(source='product.reorder_point', read_only=True)
    needs_reorder = serializers.SerializerMethodField()

    class Meta:
        model = InventoryItem
        fields = [
            'id', 'product_id', 'warehouse_id', 'product_name', 'product_sku',
            'warehouse_name', 'warehouse_code', 'unit_of_measure', 'quantity', 'location', 'stock_value',
            'product_unit_price', 'product_cost_price', 'reorder_point',
            'needs_reorder', 'last_checked', 'created_at', 'updated_at'
        ]
        # quantity changes only through stock movements (adjust_stock, transfers, ...) so the ledger stays complete
        read_only_fields = ['id', 'product_id', 'warehouse_id', 'quantity', 'created_at', 'updated_at']

    def get_needs_reorder(self, obj):
        return obj.product.reorder_point > 0 and obj.quantity <= obj.product.reorder_point


class InventoryItemCreateSerializer(CompanyScopedMixin, serializers.Serializer):
    """Start stocking a product in a warehouse, with an opening quantity."""
    product_id = serializers.UUIDField()
    warehouse_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=0, default=0)
    location = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')

    def validate(self, attrs):
        product = Product.objects.filter(id=attrs['product_id'], company=self.company).first()
        warehouse = Warehouse.objects.filter(id=attrs['warehouse_id'], company=self.company).first()
        if product is None or warehouse is None:
            raise serializers.ValidationError('Product or warehouse not found.')
        if InventoryItem.objects.filter(product=product, warehouse=warehouse).exists():
            raise serializers.ValidationError(
                f'{product.name} is already stocked in {warehouse.name}. Use a stock adjustment to change the quantity.'
            )
        attrs['product'], attrs['warehouse'] = product, warehouse
        return attrs

class StockReceiptSerializer(CompanyScopedMixin, serializers.Serializer):
    """Goods received into a warehouse."""
    product_id = serializers.UUIDField()
    warehouse_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, error_messages={'min_value': 'Receive at least one unit.'})
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    location = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        product = Product.objects.filter(id=attrs['product_id'], company=self.company).first()
        warehouse = Warehouse.objects.filter(id=attrs['warehouse_id'], company=self.company).first()
        if product is None or warehouse is None:
            raise serializers.ValidationError('Product or warehouse not found.')
        if not warehouse.is_active:
            raise serializers.ValidationError(f'{warehouse.name} is inactive. Reactivate it to receive stock.')
        attrs['product'], attrs['warehouse'] = product, warehouse
        return attrs


class InventoryTransactionSerializer(serializers.ModelSerializer):
    """Serializer for InventoryTransaction model."""
    id = serializers.UUIDField(read_only=True)
    inventory_item_id = serializers.UUIDField(read_only=True)
    performed_by_id = serializers.UUIDField(read_only=True)
    product_name = serializers.CharField(source='inventory_item.product.name', read_only=True)
    product_sku = serializers.CharField(source='inventory_item.product.sku', read_only=True)
    warehouse_name = serializers.CharField(source='inventory_item.warehouse.name', read_only=True)
    unit_of_measure = serializers.CharField(source='inventory_item.product.unit_of_measure', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    balance_before = serializers.ReadOnlyField()

    class Meta:
        model = InventoryTransaction
        fields = [
            'id', 'inventory_item_id', 'transaction_type', 'quantity', 'reference',
            'notes', 'performed_by_id', 'performed_by_name', 'product_name',
            'product_sku', 'warehouse_name', 'unit_of_measure', 'balance_before', 'balance_after', 'timestamp'
        ]
        read_only_fields = ['id', 'inventory_item_id', 'performed_by_id', 'timestamp']

class StockAdjustmentSerializer(serializers.Serializer):
    """Serializer for stock adjustments."""
    product_id = serializers.UUIDField()
    warehouse_id = serializers.UUIDField()
    adjustment_quantity = serializers.IntegerField()
    reason = serializers.CharField(max_length=255)

    def validate_adjustment_quantity(self, value):
        if value == 0:
            raise serializers.ValidationError('Enter a quantity to add or remove.')
        return value
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
                if quantity < 0:
                    raise serializers.ValidationError(f'Quantity can’t be negative (got {quantity}).')
                
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