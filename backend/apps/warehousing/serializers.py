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
    transfer_id = serializers.UUIDField(required=False)
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)
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
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_transfer_id(self, value):
        company = self.context['request'].user.company
        transfer = WarehouseTransfer.objects.filter(id=value, company=company).first()
        if transfer is None:
            raise serializers.ValidationError('Transfer not found.')
        if transfer.status != 'PENDING':
            raise serializers.ValidationError('Items can only be changed while the transfer is pending.')
        return value

    def validate_product_id(self, value):
        """Validate that product belongs to the same company."""
        company = self.context['request'].user.company
        try:
            Product.objects.get(id=value, company=company)
            return value
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
            'total_value', 'can_be_completed', 'stock_dispatched', 'notes'
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
            'total_value', 'can_be_completed', 'transfer_items', 'all_items_sufficient_stock', 'stock_dispatched'
        ]
        read_only_fields = ['id', 'company_id', 'initiated_by_id', 'approved_by_id', 'initiated_at', 'status',
                            'completed_at', 'stock_dispatched']

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
    transfer_number = serializers.CharField(max_length=100, required=False, allow_blank=True)

    class Meta:
        model = WarehouseTransfer
        fields = [
            'id', 'transfer_number', 'source_warehouse_id', 'destination_warehouse_id',
            'notes', 'transfer_items'
        ]
        read_only_fields = ['id']

    def validate_transfer_number(self, value):
        """Unique within the company; generated when left blank."""
        value = value.strip()
        company = self.context['request'].user.company
        if value and WarehouseTransfer.objects.filter(company=company, transfer_number__iexact=value).exists():
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
        product_ids = [str(i['product_id']) for i in transfer_items]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError({'transfer_items': 'Each product can only appear once in a transfer.'})
        return attrs

    def create(self, validated_data):
        """Create warehouse transfer with items."""
        items_data = validated_data.pop('transfer_items')
        
        company = self.context['request'].user.company
        if not validated_data.get('transfer_number'):
            validated_data['transfer_number'] = next_transfer_number(company)
        validated_data['initiated_by'] = self.context['request'].user
        with transaction.atomic():
            transfer = WarehouseTransfer.objects.create(**validated_data)
            
            # Create transfer items
            for item_data in items_data:
                item_data.pop('id', None)  # Remove id if present

                item_data.pop('transfer_id', None)

                TransferItem.objects.create(
                    transfer=transfer,
                    **item_data
                )
        
        return transfer


class UpdateWarehouseTransferSerializer(serializers.ModelSerializer):
    """Edit a pending transfer's header. Status changes only through the transfer actions."""
    source_warehouse_id = serializers.UUIDField(required=False)
    destination_warehouse_id = serializers.UUIDField(required=False)

    class Meta:
        model = WarehouseTransfer
        fields = ['transfer_number', 'source_warehouse_id', 'destination_warehouse_id', 'notes']

    def validate(self, attrs):
        if self.instance.status != 'PENDING':
            raise serializers.ValidationError('Only pending transfers can be edited.')
        company = self.context['request'].user.company
        number = attrs.get('transfer_number')
        if number is not None:
            number = number.strip()
            if not number:
                raise serializers.ValidationError({'transfer_number': 'Transfer number can’t be blank.'})
            clash = WarehouseTransfer.objects.filter(company=company, transfer_number__iexact=number).exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError({'transfer_number': 'Transfer number already exists.'})
            attrs['transfer_number'] = number
        source_id = attrs.pop('source_warehouse_id', self.instance.source_warehouse_id)
        dest_id = attrs.pop('destination_warehouse_id', self.instance.destination_warehouse_id)
        if str(source_id) == str(dest_id):
            raise serializers.ValidationError('Source and destination warehouses must be different.')
        warehouses = {str(w.id): w for w in Warehouse.objects.filter(id__in=[source_id, dest_id], company=company)}
        if str(source_id) not in warehouses or str(dest_id) not in warehouses:
            raise serializers.ValidationError('One or both warehouses not found.')
        attrs['source_warehouse'] = warehouses[str(source_id)]
        attrs['destination_warehouse'] = warehouses[str(dest_id)]
        return attrs


def next_transfer_number(company):
    """TR-YYYYMMDD-NNN, unique within the company."""
    prefix = f"TR-{timezone.now():%Y%m%d}-"
    taken = set(WarehouseTransfer.objects.filter(company=company, transfer_number__startswith=prefix)
                .values_list('transfer_number', flat=True))
    n = len(taken) + 1
    while f"{prefix}{n:03d}" in taken:
        n += 1
    return f"{prefix}{n:03d}"

