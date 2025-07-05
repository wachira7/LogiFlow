# apps/warehousing/serializers.py
from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import WarehouseTransfer, TransferItem
from apps.inventory.models import Product, Warehouse, InventoryItem, InventoryTransaction
from apps.users.models import User

class TransferItemSerializer(serializers.ModelSerializer):
    """Serializer for TransferItem model."""
    id = serializers.UUIDField(read_only=True)
    transfer_id = serializers.UUIDField(read_only=True)
    product_id = serializers.UUIDField()
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    item_value = serializers.ReadOnlyField()
    source_stock_available = serializers.ReadOnlyField()
    sufficient_source_stock = serializers.ReadOnlyField()
    destination_current_stock = serializers.ReadOnlyField()
    unit_cost = serializers.DecimalField(source='product.cost_price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = TransferItem
        fields = [
            'id', 'transfer_id', 'product_id', 'product_name', 'product_sku',
            'quantity', 'source_location', 'destination_location', 'unit_cost',
            'item_value', 'source_stock_available', 'sufficient_source_stock',
            'destination_current_stock', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'transfer_id', 'created_at', 'updated_at']

    def validate_product_id(self, value):
        """Validate that product belongs to the same company."""
        company = self.context['request'].user.company
        try:
            return Product.objects.get(id=value, company=company)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found.")

class WarehouseTransferListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for warehouse transfer lists."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    source_warehouse_id = serializers.UUIDField(read_only=True)
    destination_warehouse_id = serializers.UUIDField(read_only=True)
    initiated_by_id = serializers.UUIDField(read_only=True)
    approved_by_id = serializers.UUIDField(read_only=True)
    source_warehouse_name = serializers.CharField(source='source_warehouse.name', read_only=True)
    destination_warehouse_name = serializers.CharField(source='destination_warehouse.name', read_only=True)
    initiated_by_name = serializers.CharField(source='initiated_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    transfer_duration_days = serializers.ReadOnlyField()
    total_items = serializers.ReadOnlyField()
    total_quantity = serializers.ReadOnlyField()
    total_value = serializers.ReadOnlyField()
    can_be_completed = serializers.ReadOnlyField()

    class Meta:
        model = WarehouseTransfer
        fields = [
            'id', 'company_id', 'transfer_number', 'source_warehouse_id', 'destination_warehouse_id',
            'source_warehouse_name', 'destination_warehouse_name', 'status', 'initiated_by_id',
            'approved_by_id', 'initiated_by_name', 'approved_by_name', 'initiated_at',
            'completed_at', 'transfer_duration_days', 'total_items', 'total_quantity',
            'total_value', 'can_be_completed'
        ]

class WarehouseTransferDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for WarehouseTransfer model."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    source_warehouse_id = serializers.UUIDField()
    destination_warehouse_id = serializers.UUIDField()
    initiated_by_id = serializers.UUIDField(read_only=True)
    approved_by_id = serializers.UUIDField(read_only=True)
    source_warehouse_name = serializers.CharField(source='source_warehouse.name', read_only=True)
    destination_warehouse_name = serializers.CharField(source='destination_warehouse.name', read_only=True)
    initiated_by_name = serializers.CharField(source='initiated_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    transfer_duration_days = serializers.ReadOnlyField()
    total_items = serializers.ReadOnlyField()
    total_quantity = serializers.ReadOnlyField()
    total_value = serializers.ReadOnlyField()
    can_be_completed = serializers.ReadOnlyField()
    transfer_items = TransferItemSerializer(many=True, read_only=True)
    all_items_sufficient_stock = serializers.SerializerMethodField()

    class Meta:
        model = WarehouseTransfer
        fields = [
            'id', 'company_id', 'transfer_number', 'source_warehouse_id', 'destination_warehouse_id',
            'source_warehouse_name', 'destination_warehouse_name', 'status', 'initiated_by_id',
            'approved_by_id', 'initiated_by_name', 'approved_by_name', 'initiated_at',
            'completed_at', 'notes', 'transfer_duration_days', 'total_items', 'total_quantity',
            'total_value', 'can_be_completed', 'transfer_items', 'all_items_sufficient_stock'
        ]
        read_only_fields = ['id', 'company_id', 'initiated_by_id', 'approved_by_id', 'initiated_at']

    def get_all_items_sufficient_stock(self, obj):
        """Check if all items have sufficient stock in source warehouse."""
        return all(item.sufficient_source_stock for item in obj.transfer_items.all())

    def validate(self, attrs):
        """Validate that source and destination warehouses are different and belong to same company."""
        company = self.context['request'].user.company
        
        source_warehouse_id = attrs.get('source_warehouse_id')
        destination_warehouse_id = attrs.get('destination_warehouse_id')
        
        if source_warehouse_id == destination_warehouse_id:
            raise serializers.ValidationError("Source and destination warehouses must be different.")
        
        try:
            source_warehouse = Warehouse.objects.get(id=source_warehouse_id, company=company)
            destination_warehouse = Warehouse.objects.get(id=destination_warehouse_id, company=company)
        except Warehouse.DoesNotExist:
            raise serializers.ValidationError("One or both warehouses not found.")
        
        attrs['source_warehouse'] = source_warehouse
        attrs['destination_warehouse'] = destination_warehouse
        return attrs

class CreateWarehouseTransferSerializer(serializers.ModelSerializer):
    """Serializer for creating warehouse transfers with items."""
    id = serializers.UUIDField(read_only=True)
    source_warehouse_id = serializers.UUIDField()
    destination_warehouse_id = serializers.UUIDField()
    transfer_items = TransferItemSerializer(many=True)

    class Meta:
        model = WarehouseTransfer
        fields = [
            'id', 'transfer_number', 'source_warehouse_id', 'destination_warehouse_id',
            'notes', 'transfer_items'
        ]
        read_only_fields = ['id']

    def validate_transfer_number(self, value):
        """Validate that transfer number is unique within the company."""
        company = self.context['request'].user.company
        if WarehouseTransfer.objects.filter(company=company, transfer_number=value).exists():
            raise serializers.ValidationError("Transfer number already exists.")
        return value

    def validate(self, attrs):
        """Validate warehouses and items."""
        company = self.context['request'].user.company
        
        source_warehouse_id = attrs.get('source_warehouse_id')
        destination_warehouse_id = attrs.get('destination_warehouse_id')
        
        if source_warehouse_id == destination_warehouse_id:
            raise serializers.ValidationError("Source and destination warehouses must be different.")
        
        try:
            source_warehouse = Warehouse.objects.get(id=source_warehouse_id, company=company)
            destination_warehouse = Warehouse.objects.get(id=destination_warehouse_id, company=company)
        except Warehouse.DoesNotExist:
            raise serializers.ValidationError("One or both warehouses not found.")
        
        attrs['source_warehouse'] = source_warehouse
        attrs['destination_warehouse'] = destination_warehouse
        
        # Validate transfer items
        transfer_items = attrs.get('transfer_items', [])
        if not transfer_items:
            raise serializers.ValidationError("At least one transfer item is required.")
        
        return attrs

    def create(self, validated_data):
        """Create warehouse transfer with items."""
        items_data = validated_data.pop('transfer_items')
        
        with transaction.atomic():
            # Create warehouse transfer
            transfer = WarehouseTransfer.objects.create(
                company=self.context['request'].user.company,
                initiated_by=self.context['request'].user,
                **validated_data
            )
            
            # Create transfer items
            for item_data in items_data:
                item_data.pop('id', None)  # Remove id if present
                TransferItem.objects.create(
                    transfer=transfer,
                    **item_data
                )
        
        return transfer