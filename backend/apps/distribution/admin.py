# backend/apps/distribution/admin.py
from django.contrib import admin
from .models import CustomerOrder, OrderItem, Shipment, ShipmentItem, DeliveryRoute, RouteStop


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1
    readonly_fields = ['id', 'total_price', 'created_at', 'updated_at']
    raw_id_fields = ['product']


@admin.register(CustomerOrder)
class CustomerOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'company', 'customer_name', 'customer_email', 'status', 'total_amount', 'item_count', 'created_at']
    list_filter = ['company', 'status', 'created_at']
    search_fields = ['order_number', 'customer_name', 'customer_email', 'company__name']
    readonly_fields = ['id', 'subtotal', 'item_count', 'can_be_shipped', 'created_at', 'updated_at']
    raw_id_fields = ['company']
    inlines = [OrderItemInline]
    
    fieldsets = (
        ('Order Information', {
            'fields': ('company', 'order_number', 'status')
        }),
        ('Customer Details', {
            'fields': ('customer_name', 'customer_email', 'customer_phone')
        }),
        ('Addresses', {
            'fields': ('shipping_address', 'billing_address')
        }),
        ('Financial', {
            'fields': ('total_amount', 'subtotal', 'tax_amount', 'shipping_amount', 'discount_amount')
        }),
        ('Order Summary', {
            'fields': ('item_count', 'can_be_shipped')
        }),
        ('Additional Info', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['product', 'order', 'quantity', 'unit_price', 'total_price', 'created_at']
    list_filter = ['order__company', 'created_at']
    search_fields = ['product__name', 'product__sku', 'order__order_number']
    readonly_fields = ['id', 'total_price', 'created_at', 'updated_at']
    raw_id_fields = ['order', 'product']


class ShipmentItemInline(admin.TabularInline):
    model = ShipmentItem
    extra = 1
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['order_item', 'product']


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ['shipment_number', 'company', 'order', 'status', 'carrier', 'tracking_number', 'warehouse', 'driver', 'shipping_date', 'is_delayed']
    list_filter = ['company', 'status', 'carrier', 'warehouse','shipping_date', 'created_at']
    search_fields = ['shipment_number', 'tracking_number', 'order__order_number', 'company__name']
    readonly_fields = ['id', 'delivery_days', 'is_delayed', 'created_at', 'updated_at']
    raw_id_fields = ['company', 'order', 'warehouse', 'driver']
    inlines = [ShipmentItemInline]
    
    fieldsets = (
        ('Shipment Information', {
            'fields': ('company', 'shipment_number', 'order', 'status')
        }),
        ('Shipping Details', {
            'fields': ('carrier', 'tracking_number', 'warehouse')
        }),
        ('Timeline', {
            'fields': ('shipping_date', 'estimated_delivery', 'actual_delivery', 'delivery_days', 'is_delayed')
        }),
        ('Logistics', {
            'fields': ('driver', 'vehicle_info')
        }),
        ('Additional Info', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(ShipmentItem)
class ShipmentItemAdmin(admin.ModelAdmin):
    list_display = ['product', 'shipment', 'quantity', 'order_item', 'created_at']
    list_filter = ['shipment__company', 'created_at']
    search_fields = ['product__name', 'product__sku', 'shipment__shipment_number']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['shipment', 'order_item', 'product']


class RouteStopInline(admin.TabularInline):
    model = RouteStop
    extra = 1
    readonly_fields = ['id', 'stop_duration_minutes', 'created_at', 'updated_at']
    raw_id_fields = ['shipment']
    ordering = ['stop_number']


@admin.register(DeliveryRoute)
class DeliveryRouteAdmin(admin.ModelAdmin):
    list_display = ['route_name', 'company', 'driver', 'status', 'stop_count', 'total_distance', 'duration_hours', 'start_time', 'end_time']
    list_filter = ['company', 'status', 'driver', 'start_time', 'created_at']
    search_fields = ['route_name', 'vehicle_id', 'company__name']
    readonly_fields = ['id', 'duration_hours', 'stop_count', 'created_at', 'updated_at']
    raw_id_fields = ['company', 'driver']
    inlines = [RouteStopInline]
    
    fieldsets = (
        ('Route Information', {
            'fields': ('company', 'route_name', 'status')
        }),
        ('Logistics', {
            'fields': ('driver', 'vehicle_id')
        }),
        ('Timeline', {
            'fields': ('start_time', 'end_time', 'duration_hours')
        }),
        ('Route Summary', {
            'fields': ('stop_count', 'total_distance')
        }),
        ('Additional Info', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(RouteStop)
class RouteStopAdmin(admin.ModelAdmin):
    list_display = ['route', 'stop_number', 'shipment', 'status', 'estimated_arrival', 'actual_arrival', 'stop_duration_minutes']
    list_filter = ['status', 'route__company', 'estimated_arrival', 'actual_arrival']
    search_fields = ['route__route_name', 'shipment__shipment_number', 'address']
    readonly_fields = ['id', 'stop_duration_minutes', 'created_at', 'updated_at']
    raw_id_fields = ['route', 'shipment']
    ordering = ['route', 'stop_number']