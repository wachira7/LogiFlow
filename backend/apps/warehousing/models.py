# backend/apps/warehousing/models.py
import uuid
from django.db import models
from utils.mixins import TimeStampedModel


class WarehouseTransfer(TimeStampedModel):
    """
    Warehouse transfers model - matches 'warehouse_transfers' table from schema
    """
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='warehouse_transfers')
    transfer_number = models.CharField(max_length=100)
    
    source_warehouse = models.ForeignKey('inventory.Warehouse', on_delete=models.RESTRICT, related_name='outbound_transfers')
    destination_warehouse = models.ForeignKey('inventory.Warehouse', on_delete=models.RESTRICT, related_name='inbound_transfers')
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_TRANSIT', 'In Transit'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    initiated_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='initiated_transfers')
    approved_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_transfers')
    
    initiated_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    # True once the stock has been taken out of the source warehouse
    stock_dispatched = models.BooleanField(default=False)
    
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'warehouse_transfers'
        verbose_name = 'Warehouse Transfer'
        verbose_name_plural = 'Warehouse Transfers'
        unique_together = [['company', 'transfer_number']]
        ordering = ['-initiated_at']
    
    def __str__(self):
        return f"{self.transfer_number}: {self.source_warehouse.name} → {self.destination_warehouse.name}"
    
    @property
    def transfer_duration_days(self):
        """Calculate transfer duration in days"""
        if self.completed_at:
            duration = self.completed_at - self.initiated_at
            return duration.days
        return None
    
    @property
    def total_items(self):
        """Get total number of different items in this transfer"""
        return len(self.transfer_items.all())  # uses the prefetch when the view has one
    
    @property
    def total_quantity(self):
        """Get total quantity of all items in this transfer"""
        return sum(item.quantity for item in self.transfer_items.all())
    
    @property
    def total_value(self):
        """Calculate total value of transferred items"""
        return sum((item.quantity * item.product.cost_price for item in self.transfer_items.all()), 0)
    
    @property
    def can_be_completed(self):
        """Stock has left the source and can be received at the destination"""
        return self.status == 'IN_TRANSIT' and self.stock_dispatched and bool(self.transfer_items.all())
    
    def clean(self):
        """Validate that source and destination warehouses are different"""
        from django.core.exceptions import ValidationError
        if self.source_warehouse == self.destination_warehouse:
            raise ValidationError("Source and destination warehouses must be different.")


class TransferItem(TimeStampedModel):
    """
    Transfer items model - matches 'transfer_items' table from schema
    """
    transfer = models.ForeignKey(WarehouseTransfer, on_delete=models.CASCADE, related_name='transfer_items')
    product = models.ForeignKey('inventory.Product', on_delete=models.RESTRICT, related_name='transfer_items')
    quantity = models.PositiveIntegerField()
    
    source_location = models.CharField(max_length=100, blank=True)  # Location in source warehouse
    destination_location = models.CharField(max_length=100, blank=True)  # Location in destination warehouse
    
    class Meta:
        db_table = 'transfer_items'
        verbose_name = 'Transfer Item'
        verbose_name_plural = 'Transfer Items'
        ordering = ['product__name']
    
    def __str__(self):
        return f"{self.product.name} (x{self.quantity}) - {self.transfer.transfer_number}"
    
    @property
    def item_value(self):
        """Calculate value of this transfer item"""
        return self.quantity * self.product.cost_price
    
    @property
    def source_stock_available(self):
        """Stock of this product in the source warehouse"""
        item = self.product.inventory_items.filter(warehouse=self.transfer.source_warehouse).first()
        return item.quantity if item else 0
    
    @property
    def sufficient_source_stock(self):
        """Check if there's enough stock in source warehouse"""
        return self.source_stock_available >= self.quantity
    
    @property
    def destination_current_stock(self):
        """Stock of this product in the destination warehouse"""
        item = self.product.inventory_items.filter(warehouse=self.transfer.destination_warehouse).first()
        return item.quantity if item else 0