# apps/distribution/serializers.py
from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import CustomerOrder, OrderItem, Shipment, ShipmentItem, DeliveryRoute, RouteStop
from apps.inventory.models import Product, Warehouse
from apps.users.models import User

class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for OrderItem model."""
    id = serializers.UUIDField(read_only=True)
    order_id = serializers.UUIDField(read_only=True)
    product_id = serializers.UUIDField()
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'order_id', 'product_id', 'product_name', 'product_sku',
            'quantity', 'unit_price', 'total_price', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'order_id', 'total_price', 'created_at', 'updated_at']

    def validate_product_id(self, value):
        """Validate that product belongs to the same company."""
        company = self.context['request'].user.company
        try:
            Product.objects.get(id=value, company=company)
            return value
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found.")

class CustomerOrderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for customer order lists."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    subtotal = serializers.ReadOnlyField()
    item_count = serializers.ReadOnlyField()
    can_be_shipped = serializers.ReadOnlyField()

    class Meta:
        model = CustomerOrder
        fields = [
            'id', 'company_id', 'order_number', 'customer_name', 'customer_email',
            'status', 'total_amount', 'subtotal', 'item_count', 'can_be_shipped',
            'created_at'
        ]

class CustomerOrderDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for CustomerOrder model."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    subtotal = serializers.ReadOnlyField()
    item_count = serializers.ReadOnlyField()
    can_be_shipped = serializers.ReadOnlyField()
    order_items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = CustomerOrder
        fields = [
            'id', 'company_id', 'order_number', 'customer_name', 'customer_email',
            'customer_phone', 'shipping_address', 'billing_address', 'status',
            'total_amount', 'tax_amount', 'shipping_amount', 'discount_amount',
            'subtotal', 'notes', 'item_count', 'can_be_shipped', 'order_items',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company_id', 'created_at', 'updated_at']

class CreateCustomerOrderSerializer(serializers.ModelSerializer):
    """Serializer for creating customer orders with items."""
    id = serializers.UUIDField(read_only=True)
    order_items = OrderItemSerializer(many=True)

    class Meta:
        model = CustomerOrder
        fields = [
            'id', 'order_number', 'customer_name', 'customer_email', 'customer_phone',
            'shipping_address', 'billing_address', 'total_amount', 'tax_amount',
            'shipping_amount', 'discount_amount', 'notes', 'order_items'
        ]
        read_only_fields = ['id']

    def validate_order_number(self, value):
        """Validate that order number is unique within the company."""
        company = self.context['request'].user.company
        if CustomerOrder.objects.filter(company=company, order_number=value).exists():
            raise serializers.ValidationError("Order number already exists.")
        return value

    def create(self, validated_data):
        """Create customer order with items."""
        items_data = validated_data.pop('order_items')
        
        with transaction.atomic():
            # Create customer order
            order = CustomerOrder.objects.create(
                **validated_data
            )
            
            # Create order items
            for item_data in items_data:
                OrderItem.objects.create(order=order, **item_data)
        
        return order

class ShipmentItemSerializer(serializers.ModelSerializer):
    """Serializer for ShipmentItem model."""
    id = serializers.UUIDField(read_only=True)
    shipment_id = serializers.UUIDField(read_only=True)
    order_item_id = serializers.UUIDField(required=False, allow_null=True)
    product_id = serializers.UUIDField()
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = ShipmentItem
        fields = [
            'id', 'shipment_id', 'order_item_id', 'product_id', 'product_name',
            'product_sku', 'quantity', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'shipment_id', 'created_at', 'updated_at']

class ShipmentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for shipment lists."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    order_id = serializers.UUIDField(read_only=True)
    warehouse_id = serializers.UUIDField(read_only=True)
    driver_id = serializers.UUIDField(read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    delivery_days = serializers.ReadOnlyField()
    is_delayed = serializers.ReadOnlyField()

    class Meta:
        model = Shipment
        fields = [
            'id', 'company_id', 'shipment_number', 'order_id', 'order_number',
            'warehouse_id', 'warehouse_name', 'driver_id', 'driver_name',
            'status', 'carrier', 'tracking_number', 'shipping_date',
            'estimated_delivery', 'actual_delivery', 'delivery_days',
            'is_delayed', 'created_at'
        ]

class ShipmentDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Shipment model."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    order_id = serializers.UUIDField(required=False, allow_null=True)
    warehouse_id = serializers.UUIDField()
    driver_id = serializers.UUIDField(required=False, allow_null=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    delivery_days = serializers.ReadOnlyField()
    is_delayed = serializers.ReadOnlyField()
    shipment_items = ShipmentItemSerializer(many=True, read_only=True)

    class Meta:
        model = Shipment
        fields = [
            'id', 'company_id', 'shipment_number', 'order_id', 'order_number',
            'warehouse_id', 'warehouse_name', 'driver_id', 'driver_name',
            'status', 'carrier', 'tracking_number', 'shipping_date',
            'estimated_delivery', 'actual_delivery', 'vehicle_info', 'notes',
            'delivery_days', 'is_delayed', 'shipment_items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company_id', 'created_at', 'updated_at']

    # These validators return the id (not the instance) because the values are
    # saved straight onto the *_id attributes.
    def validate_order_id(self, value):
        """Validate that order belongs to the same company."""
        if value:
            company = self.context['request'].user.company
            if not CustomerOrder.objects.filter(id=value, company=company).exists():
                raise serializers.ValidationError("Order not found.")
        return value

    def validate_warehouse_id(self, value):
        """Validate that warehouse belongs to the same company."""
        company = self.context['request'].user.company
        if not Warehouse.objects.filter(id=value, company=company).exists():
            raise serializers.ValidationError("Warehouse not found.")
        return value

    def validate_driver_id(self, value):
        """Validate that driver belongs to the same company."""
        if value:
            company = self.context['request'].user.company
            if not User.objects.filter(id=value, company=company, is_driver=True).exists():
                raise serializers.ValidationError("Driver not found.")
        return value

class RouteStopSerializer(serializers.ModelSerializer):
    """Serializer for RouteStop model."""
    id = serializers.UUIDField(read_only=True)
    route_id = serializers.UUIDField(read_only=True)
    shipment_id = serializers.UUIDField()
    shipment_number = serializers.CharField(source='shipment.shipment_number', read_only=True)
    stop_duration_minutes = serializers.ReadOnlyField()
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = RouteStop
        fields = [
            'id', 'route_id', 'shipment_id', 'shipment_number', 'stop_number',
            'address', 'estimated_arrival', 'actual_arrival', 'departure_time',
            'status', 'notes', 'stop_duration_minutes', 'created_at', 'updated_at',
            'latitude', 'longitude', 'customer_name',
        ]
        read_only_fields = ['id', 'route_id', 'created_at', 'updated_at']
        # add_stop assigns the next stop number when it isn't given
        extra_kwargs = {'stop_number': {'required': False}}

    def validate_shipment_id(self, value):
        """Validate that shipment belongs to the same company."""
        company = self.context['request'].user.company
        if not Shipment.objects.filter(id=value, company=company).exists():
            raise serializers.ValidationError("Shipment not found.")
        return value

    def get_customer_name(self, obj):
        """Get customer name from related shipment's order."""
        if obj.shipment and obj.shipment.order:
            return obj.shipment.order.customer_name
        return None
class DeliveryRouteListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for delivery route lists."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    driver_id = serializers.UUIDField(read_only=True)
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    duration_hours = serializers.ReadOnlyField()
    stop_count = serializers.ReadOnlyField()

    class Meta:
        model = DeliveryRoute
        fields = [
            'id', 'company_id', 'route_name', 'driver_id', 'driver_name',
            'vehicle_id', 'start_time', 'end_time', 'status', 'total_distance','description', 
            'start_location', 'estimated_duration',
            'duration_hours', 'stop_count', 'created_at'
        ]

class DeliveryRouteDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for DeliveryRoute model."""
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    driver_id = serializers.UUIDField(required=False, allow_null=True)
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    duration_hours = serializers.ReadOnlyField()
    stop_count = serializers.ReadOnlyField()
    route_stops = RouteStopSerializer(many=True, read_only=True)

    class Meta:
        model = DeliveryRoute
        fields = [
            'id', 'company_id', 'route_name', 'driver_id', 'driver_name',
            'vehicle_id', 'start_time', 'end_time', 'status', 'total_distance',
            'notes', 'duration_hours', 'stop_count', 'route_stops','description', 
            'start_location', 'estimated_duration', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company_id', 'created_at', 'updated_at']

    def validate_driver_id(self, value):
        """Validate that driver belongs to the same company."""
        if value:
            company = self.context['request'].user.company
            if not User.objects.filter(id=value, company=company, is_driver=True).exists():
                raise serializers.ValidationError("Driver not found.")
        return value