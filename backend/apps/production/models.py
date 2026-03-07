# backend/apps/production/models.py
import uuid
from django.db import models
from utils.mixins import TimeStampedModel


class ProductionOrder(TimeStampedModel):
    """
    Production orders model - matches 'production_orders' table from schema
    """
    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='production_orders')
    order_number = models.CharField(max_length=100)
    product = models.ForeignKey('inventory.Product', on_delete=models.CASCADE, related_name='production_orders')
    quantity = models.PositiveIntegerField()

    STATUS_CHOICES = [
        ('PLANNED', 'Planned'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNED')

    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_production_orders'
    )

    # Where to stock the finished goods once production is complete
    output_warehouse = models.ForeignKey(
        'inventory.Warehouse', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='production_output_orders'
    )

    class Meta:
        db_table = 'production_orders'
        verbose_name = 'Production Order'
        verbose_name_plural = 'Production Orders'
        unique_together = [['company', 'order_number']]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_number} - {self.product.name} (x{self.quantity})"

    @property
    def duration_days(self):
        """Calculate production duration in days"""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days
        return None

    @property
    def progress_percentage(self):
        """Calculate completion percentage based on completed steps"""
        total_steps = self.production_steps.count()
        if total_steps == 0:
            return 0
        completed_steps = self.production_steps.filter(status='COMPLETED').count()
        return (completed_steps / total_steps) * 100

    @property
    def estimated_completion(self):
        """Calculate estimated completion date based on remaining steps"""
        remaining_steps = self.production_steps.filter(status__in=['PENDING', 'IN_PROGRESS'])
        if not remaining_steps.exists():
            return self.end_date

        total_remaining_hours = sum(float(step.duration_hours or 0) for step in remaining_steps)
        if total_remaining_hours > 0 and self.start_date:
            from datetime import timedelta
            return self.start_date + timedelta(hours=total_remaining_hours)
        return None


class ProductionStep(TimeStampedModel):
    """
    Production steps model - matches 'production_steps' table from schema
    """
    production_order = models.ForeignKey(ProductionOrder, on_delete=models.CASCADE, related_name='production_steps')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    duration_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('SKIPPED', 'Skipped'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_production_steps'
    )

    class Meta:
        db_table = 'production_steps'
        verbose_name = 'Production Step'
        verbose_name_plural = 'Production Steps'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.production_order.order_number} - {self.name}"

    @property
    def actual_duration_hours(self):
        """Calculate actual time taken for this step"""
        if self.start_time and self.end_time:
            duration = self.end_time - self.start_time
            return duration.total_seconds() / 3600
        return None

    @property
    def is_overdue(self):
        """Check if step is taking longer than estimated"""
        if self.start_time and self.duration_hours and self.status == 'IN_PROGRESS':
            from datetime import timedelta
            from django.utils import timezone
            expected_end = self.start_time + timedelta(hours=float(self.duration_hours))
            return timezone.now() > expected_end
        return False


class ProductionMaterial(TimeStampedModel):
    """
    Production materials model - matches 'production_materials' table from schema
    """
    production_order = models.ForeignKey(ProductionOrder, on_delete=models.CASCADE, related_name='production_materials')
    product = models.ForeignKey('inventory.Product', on_delete=models.CASCADE, related_name='used_in_production')
    quantity = models.PositiveIntegerField()
    warehouse = models.ForeignKey('inventory.Warehouse', on_delete=models.CASCADE, related_name='production_materials')

    class Meta:
        db_table = 'production_materials'
        verbose_name = 'Production Material'
        verbose_name_plural = 'Production Materials'
        ordering = ['product__name']

    def __str__(self):
        return f"{self.product.name} (x{self.quantity}) for {self.production_order.order_number}"

    @property
    def material_cost(self):
        return self.quantity * self.product.cost_price

    @property
    def available_stock(self):
        try:
            inventory_item = self.product.inventory_items.get(warehouse=self.warehouse)
            return inventory_item.quantity
        except Exception:
            return 0

    @property
    def sufficient_stock(self):
        return self.available_stock >= self.quantity