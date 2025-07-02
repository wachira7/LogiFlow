from django.contrib import admin
from .models import Category, Product, Warehouse, InventoryItem, InventoryTransaction


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'parent', 'created_at']
    list_filter = ['company', 'parent', 'created_at']
    search_fields = ['name', 'company__name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['company', 'parent']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'sku', 'company', 'category', 'unit_price', 'cost_price', 'total_stock', 'is_active', 'created_at']
    list_filter = ['company', 'category', 'is_active', 'created_at']
    search_fields = ['name', 'sku', 'barcode', 'company__name']
    readonly_fields = ['id', 'total_stock', 'profit_margin', 'needs_reorder', 'created_at', 'updated_at']
    raw_id_fields = ['company', 'category']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('company', 'name', 'sku', 'description', 'category', 'is_active')
        }),
        ('Pricing', {
            'fields': ('unit_price', 'cost_price', 'profit_margin')
        }),
        ('Product Details', {
            'fields': ('barcode', 'weight', 'dimensions', 'image')
        }),
        ('Stock Management', {
            'fields': ('min_stock_level', 'max_stock_level', 'reorder_point', 'lead_time_days', 'total_stock', 'needs_reorder')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'manager', 'total_products', 'is_active', 'created_at']
    list_filter = ['company', 'is_active', 'created_at']
    search_fields = ['name', 'company__name', 'address']
    readonly_fields = ['id', 'total_products', 'total_stock_value', 'created_at', 'updated_at']
    raw_id_fields = ['company', 'manager']


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ['product', 'warehouse', 'quantity', 'location', 'stock_value', 'last_checked', 'created_at']
    list_filter = ['warehouse', 'product__company', 'last_checked', 'created_at']
    search_fields = ['product__name', 'product__sku', 'warehouse__name', 'location']
    readonly_fields = ['id', 'stock_value', 'created_at', 'updated_at']
    raw_id_fields = ['product', 'warehouse']


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ['transaction_type', 'inventory_item', 'quantity', 'reference', 'performed_by', 'timestamp']
    list_filter = ['transaction_type', 'timestamp', 'performed_by']
    search_fields = ['inventory_item__product__name', 'reference', 'notes']
    readonly_fields = ['id', 'timestamp', 'created_at', 'updated_at']
    raw_id_fields = ['inventory_item', 'performed_by']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'inventory_item__product',
            'inventory_item__warehouse',
            'performed_by'
        )
