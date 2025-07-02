from django.contrib import admin
from .models import ProductionOrder, ProductionStep, ProductionMaterial


class ProductionStepInline(admin.TabularInline):
    model = ProductionStep
    extra = 1
    readonly_fields = ['id', 'actual_duration_hours', 'is_overdue', 'created_at', 'updated_at']
    raw_id_fields = ['assigned_to']


class ProductionMaterialInline(admin.TabularInline):
    model = ProductionMaterial
    extra = 1
    readonly_fields = ['id', 'material_cost', 'available_stock', 'sufficient_stock', 'created_at', 'updated_at']
    raw_id_fields = ['product', 'warehouse']


@admin.register(ProductionOrder)
class ProductionOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'company', 'product', 'quantity', 'status', 'progress_percentage', 'start_date', 'end_date', 'created_at']
    list_filter = ['company', 'status', 'start_date', 'end_date', 'created_at']
    search_fields = ['order_number', 'product__name', 'product__sku', 'company__name']
    readonly_fields = ['id', 'duration_days', 'progress_percentage', 'estimated_completion', 'created_at', 'updated_at']
    raw_id_fields = ['company', 'product', 'created_by']
    inlines = [ProductionStepInline, ProductionMaterialInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('company', 'order_number', 'product', 'quantity', 'status')
        }),
        ('Timeline', {
            'fields': ('start_date', 'end_date', 'duration_days', 'estimated_completion')
        }),
        ('Progress', {
            'fields': ('progress_percentage',)
        }),
        ('Additional Info', {
            'fields': ('notes', 'created_by')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(ProductionStep)
class ProductionStepAdmin(admin.ModelAdmin):
    list_display = ['name', 'production_order', 'status', 'assigned_to', 'duration_hours', 'actual_duration_hours', 'is_overdue', 'start_time', 'end_time']
    list_filter = ['status', 'assigned_to', 'start_time', 'end_time']
    search_fields = ['name', 'production_order__order_number', 'description']
    readonly_fields = ['id', 'actual_duration_hours', 'is_overdue', 'created_at', 'updated_at']
    raw_id_fields = ['production_order', 'assigned_to']


@admin.register(ProductionMaterial)
class ProductionMaterialAdmin(admin.ModelAdmin):
    list_display = ['product', 'production_order', 'quantity', 'warehouse', 'material_cost', 'available_stock', 'sufficient_stock']
    list_filter = ['warehouse', 'created_at']
    search_fields = ['product__name', 'product__sku', 'production_order__order_number']
    readonly_fields = ['id', 'material_cost', 'available_stock','created_at', 'updated_at']
    raw_id_fields = ['production_order', 'product', 'warehouse']