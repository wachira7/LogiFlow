
from django.contrib import admin
from .models import WarehouseTransfer, TransferItem


class TransferItemInline(admin.TabularInline):
    model = TransferItem
    extra = 1
    readonly_fields = ['id', 'item_value', 'source_stock_available', 'sufficient_source_stock', 'destination_current_stock', 'created_at', 'updated_at']
    raw_id_fields = ['product']


@admin.register(WarehouseTransfer)
class WarehouseTransferAdmin(admin.ModelAdmin):
    list_display = ['transfer_number', 'company', 'source_warehouse', 'destination_warehouse', 'status', 'total_items', 'total_quantity', 'total_value', 'initiated_at', 'completed_at']
    list_filter = ['company', 'status', 'source_warehouse', 'destination_warehouse', 'initiated_at', 'completed_at']
    search_fields = ['transfer_number', 'company__name', 'source_warehouse__name', 'destination_warehouse__name']
    readonly_fields = ['id', 'transfer_duration_days', 'total_items', 'total_quantity', 'total_value', 'can_be_completed', 'initiated_at', 'created_at', 'updated_at']
    raw_id_fields = ['company', 'source_warehouse', 'destination_warehouse', 'initiated_by', 'approved_by']
    inlines = [TransferItemInline]
    
    fieldsets = (
        ('Transfer Information', {
            'fields': ('company', 'transfer_number', 'status')
        }),
        ('Warehouses', {
            'fields': ('source_warehouse', 'destination_warehouse')
        }),
        ('Authorization', {
            'fields': ('initiated_by', 'approved_by')
        }),
        ('Timeline', {
            'fields': ('initiated_at', 'completed_at', 'transfer_duration_days')
        }),
        ('Transfer Summary', {
            'fields': ('total_items', 'total_quantity', 'total_value', 'can_be_completed')
        }),
        ('Additional Info', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(TransferItem)
class TransferItemAdmin(admin.ModelAdmin):
    list_display = ['product', 'transfer', 'quantity', 'source_location', 'destination_location', 'item_value', 'sufficient_source_stock']
    list_filter = ['transfer__company', 'transfer__status', 'created_at']
    search_fields = ['product__name', 'product__sku', 'transfer__transfer_number']
    readonly_fields = ['id', 'item_value', 'source_stock_available', 'sufficient_source_stock', 'destination_current_stock', 'created_at', 'updated_at']
    raw_id_fields = ['transfer', 'product']
    
    fieldsets = (
        ('Item Information', {
            'fields': ('transfer', 'product', 'quantity')
        }),
        ('Locations', {
            'fields': ('source_location', 'destination_location')
        }),
        ('Stock Analysis', {
            'fields': ('source_stock_available', 'sufficient_source_stock', 'destination_current_stock', 'item_value')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )