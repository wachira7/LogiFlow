# backend/apps/inventory/models.py
import uuid
from django.db import models
from utils.mixins import TimeStampedModel


class Category(TimeStampedModel):
    """
    Product categories model - matches 'categories' table from schema
    """
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    
    class Meta:
        db_table = 'categories'
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        unique_together = [['company', 'name']]
        ordering = ['name']
    
    def __str__(self):
        return f"{self.company.name} - {self.name}"
    
    @property
    def full_path(self):
        """Get the full category path (e.g., 'Electronics > Phones > Smartphones')"""
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name


class Product(TimeStampedModel):
    """
    Products model - matches 'products' table from schema
    """
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100)  # Stock Keeping Unit
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    
    # Pricing
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Product details
    barcode = models.CharField(max_length=100, blank=True)
    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)  # in kg
    dimensions = models.CharField(max_length=100, blank=True)  # Format: LxWxH in cm
    image = models.CharField(max_length=500, blank=True)  # URL to product image
    
    # Stock management
    min_stock_level = models.PositiveIntegerField(default=0)
    max_stock_level = models.PositiveIntegerField(default=0)
    reorder_point = models.PositiveIntegerField(default=0)
    lead_time_days = models.PositiveIntegerField(default=1)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'products'
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        unique_together = [['company', 'sku']]
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.sku})"
    
    @property
    def total_stock(self):
        """Get total stock across all warehouses"""
        return sum(item.quantity for item in self.inventory_items.all())
    
    @property
    def needs_reorder(self):
        """Check if product needs reordering"""
        return self.total_stock <= self.reorder_point
    
    @property
    def profit_margin(self):
        """Calculate profit margin percentage"""
        if self.cost_price > 0:
            return ((self.unit_price - self.cost_price) / self.cost_price) * 100
        return 0


class Warehouse(TimeStampedModel):
    """
    Warehouses model - matches 'warehouses' table from schema
    """
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='warehouses')
    name = models.CharField(max_length=255)
    address = models.TextField()
    manager = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_warehouses')
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'warehouses'
        verbose_name = 'Warehouse'
        verbose_name_plural = 'Warehouses'
        unique_together = [['company', 'name']]
        ordering = ['name']
    
    def __str__(self):
        return f"{self.company.name} - {self.name}"
    
    @property
    def total_products(self):
        """Get total number of different products in this warehouse"""
        return self.inventory_items.count()
    
    @property
    def total_stock_value(self):
        """Calculate total value of stock in this warehouse"""
        total = 0
        for item in self.inventory_items.select_related('product'):
            total += item.quantity * item.product.cost_price
        return total


class InventoryItem(TimeStampedModel):
    """
    Inventory items model - matches 'inventory_items' table from schema
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='inventory_items')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='inventory_items')
    quantity = models.PositiveIntegerField(default=0)
    location = models.CharField(max_length=100, blank=True)  # Bin/shelf location within warehouse
    last_checked = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'inventory_items'
        verbose_name = 'Inventory Item'
        verbose_name_plural = 'Inventory Items'
        unique_together = [['product', 'warehouse']]
        ordering = ['product__name']
    
    def __str__(self):
        return f"{self.product.name} at {self.warehouse.name}: {self.quantity}"
    
    @property
    def stock_value(self):
        """Calculate value of this inventory item"""
        return self.quantity * self.product.cost_price


class InventoryTransaction(TimeStampedModel):
    """
    Inventory transactions model - matches 'inventory_transactions' table from schema
    """
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='transactions')
    
    TRANSACTION_TYPE_CHOICES = [
        ('RECEIPT', 'Receipt'),           # Stock coming in
        ('SHIPMENT', 'Shipment'),       # Stock going out
        ('ADJUSTMENT', 'Adjustment'),    # Manual stock correction
        ('TRANSFER', 'Transfer'),        # Transfer between warehouses
        ('RETURN', 'Return'),           # Customer/supplier return
    ]
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    quantity = models.IntegerField()  # Can be negative for outbound transactions
    reference = models.CharField(max_length=100, blank=True)  # Order/shipment reference
    notes = models.TextField(blank=True)
    performed_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_transactions')
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'inventory_transactions'
        verbose_name = 'Inventory Transaction'
        verbose_name_plural = 'Inventory Transactions'
        ordering = ['-timestamp']
    
    def __str__(self):
        direction = "+" if self.quantity >= 0 else ""
        return f"{self.transaction_type}: {direction}{self.quantity} {self.inventory_item.product.name}"
