# apps/distribution/serializers.py
from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import CustomerOrder, OrderItem, Shipment, ShipmentItem, DeliveryRoute, RouteStop
from apps.inventory.models import Product, Warehouse
from apps.users.models import User

class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for OrderItem model. Unit price defaults to the product's price."""
    id = serializers.UUIDField(read_only=True)
    order_id = serializers.UUIDField(read_only=True)
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False)
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
    shipment_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomerOrder
        fields = [
            'id', 'company_id', 'order_number', 'customer_name', 'customer_email', 'customer_phone',
            'status', 'total_amount', 'subtotal', 'item_count', 'can_be_shipped', 'shipment_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields

    def get_shipment_count(self, obj):
        return len([s for s in obj.shipments.all() if s.status != 'CANCELLED'])


class CustomerOrderDetailSerializer(CustomerOrderListSerializer):
    """Detailed serializer for CustomerOrder model."""
    order_items = OrderItemSerializer(many=True, read_only=True)
    shipments = serializers.SerializerMethodField()

    class Meta(CustomerOrderListSerializer.Meta):
        fields = CustomerOrderListSerializer.Meta.fields + [
            'shipping_address', 'billing_address', 'tax_amount', 'shipping_amount', 'discount_amount',
            'notes', 'order_items', 'shipments',
        ]
        read_only_fields = fields

    def get_shipments(self, obj):
        return [
            {'id': str(s.id), 'shipment_number': s.shipment_number, 'status': s.status, 'tracking_number': s.tracking_number,
             'carrier': s.carrier, 'warehouse_name': s.warehouse.name, 'shipping_date': s.shipping_date,
             'estimated_delivery': s.estimated_delivery, 'actual_delivery': s.actual_delivery}
            for s in obj.shipments.select_related('warehouse').order_by('created_at')
        ]


class _OrderItemsMixin:
    """Shared item handling: products must be the company's, appear once, and totals are computed here."""

    def validate_order_items(self, items):
        if not items:
            raise serializers.ValidationError('Add at least one product.')
        ids = [str(i['product_id']) for i in items]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError('Each product can only appear once; combine the quantities.')
        company = self.context['request'].user.company
        prices = {str(p.id): p.unit_price for p in Product.objects.filter(company=company, id__in=ids)}
        for item in items:
            if 'unit_price' not in item or item['unit_price'] is None:
                item['unit_price'] = prices[str(item['product_id'])]
        return items

    def _amounts(self, attrs, items):
        from decimal import Decimal
        subtotal = sum((Decimal(i['quantity']) * i['unit_price'] for i in items), Decimal('0'))
        tax = attrs.get('tax_amount', getattr(self.instance, 'tax_amount', Decimal('0'))) or Decimal('0')
        shipping = attrs.get('shipping_amount', getattr(self.instance, 'shipping_amount', Decimal('0'))) or Decimal('0')
        discount = attrs.get('discount_amount', getattr(self.instance, 'discount_amount', Decimal('0'))) or Decimal('0')
        total = subtotal + tax + shipping - discount
        if total < 0:
            raise serializers.ValidationError({'discount_amount': 'The discount is larger than the order.'})
        return total

    def _replace_items(self, order, items):
        order.order_items.all().delete()
        for item in items:
            OrderItem.objects.create(order=order, product_id=item['product_id'], quantity=item['quantity'], unit_price=item['unit_price'])


money = dict(max_digits=10, decimal_places=2, min_value=0, required=False)


class CreateCustomerOrderSerializer(_OrderItemsMixin, serializers.ModelSerializer):
    """New orders start as NEW; the total is computed from the items, tax, shipping and discount."""
    id = serializers.UUIDField(read_only=True)
    order_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    order_items = OrderItemSerializer(many=True)
    tax_amount = serializers.DecimalField(**money)
    shipping_amount = serializers.DecimalField(**money)
    discount_amount = serializers.DecimalField(**money)

    class Meta:
        model = CustomerOrder
        fields = [
            'id', 'order_number', 'customer_name', 'customer_email', 'customer_phone',
            'shipping_address', 'billing_address', 'total_amount', 'tax_amount',
            'shipping_amount', 'discount_amount', 'notes', 'order_items'
        ]
        read_only_fields = ['id', 'total_amount']

    def validate_order_number(self, value):
        value = (value or '').strip()
        company = self.context['request'].user.company
        if value and CustomerOrder.objects.filter(company=company, order_number__iexact=value).exists():
            raise serializers.ValidationError("Order number already exists.")
        return value

    def create(self, validated_data):
        from .services import next_number
        items = validated_data.pop('order_items')
        company = self.context['request'].user.company
        validated_data['total_amount'] = self._amounts(validated_data, items)
        if not validated_data.get('order_number'):
            validated_data['order_number'] = next_number(CustomerOrder, 'order_number', company, 'ORD')
        with transaction.atomic():
            order = CustomerOrder.objects.create(company=company, **validated_data)
            self._replace_items(order, items)
        return order


class UpdateCustomerOrderSerializer(_OrderItemsMixin, serializers.ModelSerializer):
    """Edit an order before anything has shipped; sending order_items replaces them."""
    order_items = OrderItemSerializer(many=True, required=False)
    tax_amount = serializers.DecimalField(**money)
    shipping_amount = serializers.DecimalField(**money)
    discount_amount = serializers.DecimalField(**money)

    class Meta:
        model = CustomerOrder
        fields = [
            'order_number', 'customer_name', 'customer_email', 'customer_phone', 'shipping_address',
            'billing_address', 'tax_amount', 'shipping_amount', 'discount_amount', 'notes', 'order_items',
        ]

    def validate(self, attrs):
        order = self.instance
        if order.status not in ('NEW', 'PROCESSING') or order.shipments.exclude(status__in=('PENDING', 'CANCELLED')).exists():
            raise serializers.ValidationError('This order can’t be changed once it has started shipping.')
        number = attrs.get('order_number')
        if number is not None:
            number = number.strip()
            if not number:
                raise serializers.ValidationError({'order_number': 'Order number can’t be blank.'})
            if CustomerOrder.objects.filter(company=order.company, order_number__iexact=number).exclude(pk=order.pk).exists():
                raise serializers.ValidationError({'order_number': 'Order number already exists.'})
            attrs['order_number'] = number
        return attrs

    def update(self, instance, validated_data):
        items = validated_data.pop('order_items', None)
        if items is None:
            items = [{'product_id': i.product_id, 'quantity': i.quantity, 'unit_price': i.unit_price} for i in instance.order_items.all()]
            replace = False
        else:
            replace = True
        validated_data['total_amount'] = self._amounts(validated_data, items)
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            if replace:
                self._replace_items(instance, items)
        return instance


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
            'is_delayed', 'destination_address', 'recipient_name', 'customer_name', 'item_count', 'created_at'
        ]

    customer_name = serializers.CharField(source='order.customer_name', read_only=True, default=None)
    item_count = serializers.SerializerMethodField()

    def get_item_count(self, obj):
        return sum(i.quantity for i in obj.shipment_items.all())

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
            'destination_address', 'recipient_name', 'recipient_phone', 'stock_deducted',
            'delivery_days', 'is_delayed', 'shipment_items', 'events', 'route_stop', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company_id', 'status', 'shipping_date', 'actual_delivery', 'stock_deducted',
                            'created_at', 'updated_at']
        extra_kwargs = {'shipment_number': {'required': False, 'allow_blank': True}}

    events = serializers.SerializerMethodField()
    route_stop = serializers.SerializerMethodField()

    def get_events(self, obj):
        return [
            {'type': e.event_type, 'message': e.message, 'from_status': e.from_status, 'to_status': e.to_status,
             'actor': e.actor.get_full_name() if e.actor else None, 'occurred_at': e.occurred_at}
            for e in obj.events.select_related('actor').order_by('-occurred_at')[:30]
        ]

    def get_route_stop(self, obj):
        stop = obj.route_stops.select_related('route').exclude(route__status='CANCELLED').order_by('-created_at').first()
        if not stop:
            return None
        return {'route_id': str(stop.route_id), 'route_name': stop.route.route_name, 'stop_number': stop.stop_number, 'status': stop.status}

    def validate(self, attrs):
        if self.instance is not None and self.instance.status not in ('PENDING', 'PICKED', 'PACKED'):
            editable = {'notes', 'carrier', 'tracking_number', 'estimated_delivery', 'driver_id', 'recipient_phone'}
            locked = [k for k in attrs if k not in editable and attrs[k] != getattr(self.instance, k, None)]
            if locked:
                raise serializers.ValidationError('Only the carrier, tracking, ETA, driver and notes can change once a shipment has left.')
        number = (attrs.get('shipment_number') or '').strip()
        company = self.context['request'].user.company
        if number and Shipment.objects.filter(company=company, shipment_number__iexact=number).exclude(pk=getattr(self.instance, 'pk', None)).exists():
            raise serializers.ValidationError({'shipment_number': 'Shipment number already exists.'})
        return attrs

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
        read_only_fields = ['id', 'route_id', 'status', 'actual_arrival', 'departure_time', 'created_at', 'updated_at']
        # add_stop assigns the next stop number when it isn't given
        extra_kwargs = {'stop_number': {'required': False}}

    def validate_shipment_id(self, value):
        """The shipment must be the company's and still need delivering."""
        company = self.context['request'].user.company
        shipment = Shipment.objects.filter(id=value, company=company).first()
        if shipment is None:
            raise serializers.ValidationError("Shipment not found.")
        if shipment.status in ('DELIVERED', 'CANCELLED', 'RETURNED'):
            raise serializers.ValidationError(f'This shipment is {shipment.get_status_display().lower()}; it doesn’t need a stop.')
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
        read_only_fields = ['id', 'company_id', 'status', 'start_time', 'end_time', 'created_at', 'updated_at']

    def validate_driver_id(self, value):
        """Validate that driver belongs to the same company."""
        if value:
            company = self.context['request'].user.company
            if not User.objects.filter(id=value, company=company, is_driver=True).exists():
                raise serializers.ValidationError("Driver not found.")
        return value