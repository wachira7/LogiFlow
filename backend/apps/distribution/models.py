# backend/apps/distribution/models.py
import uuid
from django.db import models
from django.utils import timezone
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
    product = models.ForeignKey('inventory.Product', on_delete=models.RESTRICT, related_name='order_items')
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
        ('FAILED', 'Failed'),
        ('RETURNED', 'Returned'),
        ('CANCELLED', 'Cancelled'),
    ]
    # Statuses after which a shipment is no longer in play
    TERMINAL_STATUSES = ('DELIVERED', 'RETURNED', 'CANCELLED')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Shipping details
    carrier = models.CharField(max_length=100, blank=True)
    tracking_number = models.CharField(max_length=100, blank=True)
    
    # Timeline
    shipping_date = models.DateTimeField(null=True, blank=True)
    estimated_delivery = models.DateTimeField(null=True, blank=True)
    actual_delivery = models.DateTimeField(null=True, blank=True)
    
    # Logistics
    warehouse = models.ForeignKey('inventory.Warehouse', on_delete=models.RESTRICT, related_name='shipments')
    driver = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='driven_shipments')
    vehicle = models.ForeignKey('Vehicle', on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    vehicle_info = models.CharField(max_length=255, blank=True)  # legacy free text; prefer `vehicle`
    
    # Destination and recipient (optional; the order's shipping address is used when blank)
    destination_address = models.TextField(blank=True)
    destination_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    destination_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    recipient_name = models.CharField(max_length=255, blank=True)
    recipient_phone = models.CharField(max_length=20, blank=True)
    
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
    product = models.ForeignKey('inventory.Product', on_delete=models.RESTRICT, related_name='shipment_items')
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
    vehicle_id = models.CharField(max_length=100, blank=True)  # legacy free text (name clashes with a `vehicle` FK)
    fleet_vehicle = models.ForeignKey('Vehicle', on_delete=models.SET_NULL, null=True, blank=True, related_name='routes')
    
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


class Vehicle(TimeStampedModel):
    """A fleet vehicle that can be assigned to shipments and delivery routes."""
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='vehicles')
    registration = models.CharField(max_length=20)  # number plate, e.g. KCD 214T
    name = models.CharField(max_length=100, blank=True)  # optional nickname, e.g. "Cold van 2"

    TYPE_CHOICES = [
        ('MOTORBIKE', 'Motorbike'),
        ('VAN', 'Van'),
        ('PICKUP', 'Pickup'),
        ('TRUCK', 'Truck'),
        ('REFRIGERATED', 'Refrigerated truck'),
        ('OTHER', 'Other'),
    ]
    vehicle_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='VAN')

    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('IN_USE', 'In use'),
        ('MAINTENANCE', 'Maintenance'),
        ('INACTIVE', 'Inactive'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')

    capacity_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    capacity_m3 = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    default_driver = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='default_vehicles'
    )
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'vehicles'
        ordering = ['registration']
        constraints = [
            models.UniqueConstraint(fields=['company', 'registration'], name='unique_vehicle_registration_per_company'),
        ]

    def __str__(self):
        return self.registration


class ShipmentEvent(models.Model):
    """
    Append-only history of what happened to a shipment. Feeds the shipment
    timeline and the activity feed, and doubles as its audit trail.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='shipment_events')
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='events')

    TYPE_CHOICES = [
        ('CREATED', 'Created'),
        ('STATUS_CHANGED', 'Status changed'),
        ('ASSIGNED', 'Driver or vehicle assigned'),
        ('STOP_ARRIVED', 'Arrived at stop'),
        ('STOP_COMPLETED', 'Stop completed'),
        ('STOP_FAILED', 'Stop failed'),
        ('EXCEPTION_RAISED', 'Exception raised'),
        ('EXCEPTION_RESOLVED', 'Exception resolved'),
        ('PROOF_OF_DELIVERY', 'Proof of delivery captured'),
        ('NOTE', 'Note'),
    ]
    event_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20, blank=True)
    message = models.CharField(max_length=500, blank=True)
    actor = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='shipment_events')
    data = models.JSONField(default=dict, blank=True)
    occurred_at = models.DateTimeField(default=timezone.now, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'shipment_events'
        ordering = ['-occurred_at']
        indexes = [
            models.Index(fields=['shipment', '-occurred_at']),
            models.Index(fields=['company', '-occurred_at']),
        ]

    def __str__(self):
        return f"{self.shipment.shipment_number}: {self.get_event_type_display()}"


class DeliveryException(TimeStampedModel):
    """A problem that needs someone to act on it: a delay, failed delivery, damage, and so on."""
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='delivery_exceptions')
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, null=True, blank=True, related_name='exceptions')
    route = models.ForeignKey(DeliveryRoute, on_delete=models.SET_NULL, null=True, blank=True, related_name='exceptions')
    route_stop = models.ForeignKey(RouteStop, on_delete=models.SET_NULL, null=True, blank=True, related_name='exceptions')

    TYPE_CHOICES = [
        ('DELAY', 'Delay'),
        ('FAILED_DELIVERY', 'Failed delivery'),
        ('CUSTOMER_UNAVAILABLE', 'Customer unavailable'),
        ('ADDRESS_ISSUE', 'Address issue'),
        ('DAMAGED', 'Damaged goods'),
        ('LOST', 'Lost goods'),
        ('VEHICLE_BREAKDOWN', 'Vehicle breakdown'),
        ('TEMPERATURE', 'Temperature out of range'),
        ('OTHER', 'Other'),
    ]
    exception_type = models.CharField(max_length=30, choices=TYPE_CHOICES)

    SEVERITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='MEDIUM')

    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('RESOLVED', 'Resolved'),
        ('DISMISSED', 'Dismissed'),
    ]
    OPEN_STATUSES = ('OPEN', 'ACKNOWLEDGED')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='OPEN')

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    cause = models.TextField(blank=True)
    impact = models.TextField(blank=True)
    recommended_action = models.TextField(blank=True)

    owner = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_exceptions')
    reported_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reported_exceptions')
    resolved_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_exceptions')
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)

    class Meta:
        db_table = 'delivery_exceptions'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['company', 'status', 'severity'])]

    def __str__(self):
        return f"[{self.severity}] {self.title}"

    @property
    def is_open(self):
        return self.status in self.OPEN_STATUSES


def proof_upload_path(instance, filename):
    return f"proof_of_delivery/{instance.shipment.company_id}/{instance.shipment_id}/{filename}"


class ProofOfDelivery(TimeStampedModel):
    """Evidence that a delivery happened: who received it, signature/photo and where."""
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='proofs')
    route_stop = models.ForeignKey(RouteStop, on_delete=models.SET_NULL, null=True, blank=True, related_name='proofs')
    recipient_name = models.CharField(max_length=255, blank=True)
    signature = models.ImageField(upload_to=proof_upload_path, null=True, blank=True)
    photo = models.ImageField(upload_to=proof_upload_path, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    notes = models.TextField(blank=True)
    captured_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='captured_proofs')
    captured_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'proofs_of_delivery'
        ordering = ['-captured_at']
        verbose_name_plural = 'Proofs of delivery'

    def __str__(self):
        return f"POD {self.shipment.shipment_number} @ {self.captured_at:%Y-%m-%d %H:%M}"


class LocationPing(models.Model):
    """
    A GPS position reported by a driver's device. High volume, so it uses an
    integer key and no updated_at.
    """
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='location_pings')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='location_pings')
    driver = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='location_pings')
    route = models.ForeignKey(DeliveryRoute, on_delete=models.SET_NULL, null=True, blank=True, related_name='location_pings')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    accuracy_m = models.FloatField(null=True, blank=True)
    speed_kmh = models.FloatField(null=True, blank=True)
    heading = models.FloatField(null=True, blank=True)  # degrees from north
    recorded_at = models.DateTimeField()  # device time
    received_at = models.DateTimeField(auto_now_add=True)  # server time

    class Meta:
        db_table = 'location_pings'
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['vehicle', '-recorded_at']),
            models.Index(fields=['driver', '-recorded_at']),
            models.Index(fields=['company', '-recorded_at']),
        ]

    def __str__(self):
        return f"{self.latitude},{self.longitude} @ {self.recorded_at:%H:%M:%S}"
