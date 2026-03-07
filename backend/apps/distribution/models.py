# backend/apps/distribution/models.py
import uuid
from django.db import models
from utils.mixins import TimeStampedModel


class CustomerOrder(TimeStampedModel):
    """
    Customer orders model - matches 'customer_orders' table from schema
    """
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='customer_orders')
    order_number = models.CharField(max_length=100)
    
    # Customer information
    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=20, blank=True)
    
    # Addresses
    shipping_address = models.TextField()
    billing_address = models.TextField(blank=True)
    
    STATUS_CHOICES = [
        ('NEW', 'New'),
        ('PROCESSING', 'Processing'),
        ('SHIPPED', 'Shipped'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW')
    
    # Financial information
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'customer_orders'
        verbose_name = 'Customer Order'
        verbose_name_plural = 'Customer Orders'
        unique_together = [['company', 'order_number']]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.order_number} - {self.customer_name}"
    
    @property
    def subtotal(self):
        """Calculate subtotal (total - tax - shipping + discount)"""
        return self.total_amount - self.tax_amount - self.shipping_amount + self.discount_amount
    
    @property
    def item_count(self):
        """Get total number of items in this order"""
        return sum(item.quantity for item in self.order_items.all())
    
    @property
    def can_be_shipped(self):
        """Check if order can be shipped (has items and is in correct status)"""
        return self.status in ['NEW', 'PROCESSING'] and self.order_items.exists()


class OrderItem(TimeStampedModel):
    """
    Order items model - matches 'order_items' table from schema
    """
    order = models.ForeignKey(CustomerOrder, on_delete=models.CASCADE, related_name='order_items')
    product = models.ForeignKey('inventory.Product', on_delete=models.CASCADE, related_name='order_items')
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        db_table = 'order_items'
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'
        ordering = ['product__name']
    
    def __str__(self):
        return f"{self.product.name} (x{self.quantity}) - {self.order.order_number}"
    
    def save(self, *args, **kwargs):
        """Auto-calculate total_price when saving"""
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class Shipment(TimeStampedModel):
    """
    Shipments model - matches 'shipments' table from schema
    """
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='shipments')
    shipment_number = models.CharField(max_length=100)
    order = models.ForeignKey(CustomerOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PICKED', 'Picked'),
        ('PACKED', 'Packed'),
        ('SHIPPED', 'Shipped'),
        ('DELIVERED', 'Delivered'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Shipping details
    carrier = models.CharField(max_length=100, blank=True)
    tracking_number = models.CharField(max_length=100, blank=True)
    
    # Timeline
    shipping_date = models.DateTimeField(null=True, blank=True)
    estimated_delivery = models.DateTimeField(null=True, blank=True)
    actual_delivery = models.DateTimeField(null=True, blank=True)
    
    # Logistics
    warehouse = models.ForeignKey('inventory.Warehouse', on_delete=models.CASCADE, related_name='shipments')
    driver = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='driven_shipments')
    vehicle_info = models.CharField(max_length=255, blank=True)
    
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'shipments'
        verbose_name = 'Shipment'
        verbose_name_plural = 'Shipments'
        unique_together = [['company', 'shipment_number']]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.shipment_number} - {self.status}"
    
    @property
    def delivery_days(self):
        """Calculate days between shipping and delivery"""
        if self.shipping_date and self.actual_delivery:
            return (self.actual_delivery.date() - self.shipping_date.date()).days
        return None
    
    @property
    def is_delayed(self):
        """Check if shipment is delayed based on estimated delivery"""
        if self.estimated_delivery and not self.actual_delivery:
            from django.utils import timezone
            return timezone.now() > self.estimated_delivery
        return False


class ShipmentItem(TimeStampedModel):
    """
    Shipment items model - matches 'shipment_items' table from schema
    """
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='shipment_items')
    order_item = models.ForeignKey(OrderItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipment_items')
    product = models.ForeignKey('inventory.Product', on_delete=models.CASCADE, related_name='shipment_items')
    quantity = models.PositiveIntegerField()
    
    class Meta:
        db_table = 'shipment_items'
        verbose_name = 'Shipment Item'
        verbose_name_plural = 'Shipment Items'
        ordering = ['product__name']
    
    def __str__(self):
        return f"{self.product.name} (x{self.quantity}) - {self.shipment.shipment_number}"


class DeliveryRoute(TimeStampedModel):
    """
    Delivery routes model - matches 'delivery_routes' table from schema
    """
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='delivery_routes')
    route_name = models.CharField(max_length=255)
    driver = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='delivery_routes')
    vehicle_id = models.CharField(max_length=100, blank=True)
    
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    
    STATUS_CHOICES = [
        ('PLANNED', 'Planned'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNED')
    
    total_distance = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)  # in km
    description = models.TextField(blank=True)
    start_location = models.CharField(max_length=255, blank=True)
    estimated_duration = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)  # hours
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'delivery_routes'
        verbose_name = 'Delivery Route'
        verbose_name_plural = 'Delivery Routes'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.route_name} - {self.status}"
    
    @property
    def duration_hours(self):
        """Calculate route duration in hours"""
        if self.start_time and self.end_time:
            duration = self.end_time - self.start_time
            return duration.total_seconds() / 3600
        return None
    
    @property
    def stop_count(self):
        """Get number of stops in this route"""
        return self.route_stops.count()


class RouteStop(TimeStampedModel):
    """
    Route stops model - matches 'route_stops' table from schema
    """
    route = models.ForeignKey(DeliveryRoute, on_delete=models.CASCADE, related_name='route_stops')
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='route_stops')
    stop_number = models.PositiveIntegerField()
    address = models.TextField()
    estimated_arrival = models.DateTimeField(null=True, blank=True)
    actual_arrival = models.DateTimeField(null=True, blank=True)
    departure_time = models.DateTimeField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ARRIVED', 'Arrived'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'route_stops'
        verbose_name = 'Route Stop'
        verbose_name_plural = 'Route Stops'
        ordering = ['route', 'stop_number']
    
    def __str__(self):
        return f"Stop {self.stop_number}: {self.shipment.shipment_number}"
    
    @property
    def stop_duration_minutes(self):
        """Calculate time spent at this stop in minutes"""
        if self.actual_arrival and self.departure_time:
            duration = self.departure_time - self.actual_arrival
            return duration.total_seconds() / 60
        return None