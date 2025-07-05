# apps/warehousing/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Sum, Count, F
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from .models import WarehouseTransfer, TransferItem
from .serializers import (
    WarehouseTransferListSerializer, WarehouseTransferDetailSerializer,
    CreateWarehouseTransferSerializer, TransferItemSerializer
)
from apps.inventory.models import InventoryItem, InventoryTransaction
from utils.mixins import TenantViewSetMixin, BulkActionMixin
from utils.permissions import IsCompanyMember, IsSameCompany

class WarehouseTransferViewSet(TenantViewSetMixin, BulkActionMixin, viewsets.ModelViewSet):
    """ViewSet for WarehouseTransfer management."""
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'source_warehouse', 'destination_warehouse', 'initiated_by']
    search_fields = ['transfer_number', 'notes']
    ordering_fields = ['transfer_number', 'initiated_at', 'completed_at', 'total_value']
    ordering = ['-initiated_at']

    def get_queryset(self):
        return WarehouseTransfer.objects.filter(
            company=self.request.user.company
        ).select_related(
            'source_warehouse', 'destination_warehouse', 'initiated_by', 'approved_by'
        ).prefetch_related('transfer_items__product')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateWarehouseTransferSerializer
        elif self.action == 'retrieve':
            return WarehouseTransferDetailSerializer
        return WarehouseTransferListSerializer

    @action(detail=True, methods=['post'])
    def approve_transfer(self, request, pk=None):
        """Approve a warehouse transfer."""
        transfer = self.get_object()
        
    @action(detail=True, methods=['post'])
    def approve_transfer(self, request, pk=None):
        """Approve a warehouse transfer."""
        transfer = self.get_object()
        
        if transfer.status != 'PENDING':
            return Response({
                'error': 'Transfer must be in PENDING status to approve'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if all items have sufficient stock
        insufficient_items = []
        for item in transfer.transfer_items.all():
            if not item.sufficient_source_stock:
                insufficient_items.append({
                    'product': item.product.name,
                    'required': item.quantity,
                    'available': item.source_stock_available
                })
        
        if insufficient_items:
            return Response({
                'error': 'Insufficient stock for some items',
                'insufficient_items': insufficient_items
            }, status=status.HTTP_400_BAD_REQUEST)
        
        transfer.status = 'IN_TRANSIT'
        transfer.approved_by = request.user
        transfer.save()
        
        return Response({
            'message': 'Transfer approved and moved to IN_TRANSIT',
            'status': transfer.status,
            'approved_by': transfer.approved_by.get_full_name()
        })

    @action(detail=True, methods=['post'])
    def start_transfer(self, request, pk=None):
        """Start the physical transfer process."""
        transfer = self.get_object()
        
        if transfer.status != 'IN_TRANSIT':
            return Response({
                'error': 'Transfer must be approved (IN_TRANSIT) to start'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Deduct stock from source warehouse
            for item in transfer.transfer_items.all():
                try:
                    source_inventory = InventoryItem.objects.get(
                        product=item.product,
                        warehouse=transfer.source_warehouse
                    )
                    
                    if source_inventory.quantity < item.quantity:
                        raise Exception(f"Insufficient stock for {item.product.name}")
                    
                    # Update source inventory
                    source_inventory.quantity -= item.quantity
                    source_inventory.save()
                    
                    # Create outbound transaction
                    InventoryTransaction.objects.create(
                        inventory_item=source_inventory,
                        transaction_type='TRANSFER',
                        quantity=-item.quantity,
                        reference=transfer.transfer_number,
                        notes=f"Transfer to {transfer.destination_warehouse.name}",
                        performed_by=request.user
                    )
                    
                except InventoryItem.DoesNotExist:
                    raise Exception(f"Inventory item not found for {item.product.name}")
        
        return Response({
            'message': 'Transfer started - stock deducted from source warehouse',
            'status': transfer.status
        })

    @action(detail=True, methods=['post'])
    def complete_transfer(self, request, pk=None):
        """Complete the warehouse transfer."""
        transfer = self.get_object()
        
        if transfer.status != 'IN_TRANSIT':
            return Response({
                'error': 'Transfer must be IN_TRANSIT to complete'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Add stock to destination warehouse
            for item in transfer.transfer_items.all():
                # Get or create destination inventory item
                dest_inventory, created = InventoryItem.objects.get_or_create(
                    product=item.product,
                    warehouse=transfer.destination_warehouse,
                    defaults={
                        'quantity': 0,
                        'location': item.destination_location or ''
                    }
                )
                
                # Update destination inventory
                dest_inventory.quantity += item.quantity
                if item.destination_location:
                    dest_inventory.location = item.destination_location
                dest_inventory.save()
                
                # Create inbound transaction
                InventoryTransaction.objects.create(
                    inventory_item=dest_inventory,
                    transaction_type='TRANSFER',
                    quantity=item.quantity,
                    reference=transfer.transfer_number,
                    notes=f"Transfer from {transfer.source_warehouse.name}",
                    performed_by=request.user
                )
            
            # Update transfer status
            transfer.status = 'COMPLETED'
            transfer.completed_at = timezone.now()
            transfer.save()
        
        return Response({
            'message': 'Transfer completed successfully',
            'status': transfer.status,
            'completed_at': transfer.completed_at,
            'duration_days': transfer.transfer_duration_days
        })

    @action(detail=True, methods=['post'])
    def cancel_transfer(self, request, pk=None):
        """Cancel a warehouse transfer."""
        transfer = self.get_object()
        
        if transfer.status == 'COMPLETED':
            return Response({
                'error': 'Cannot cancel completed transfer'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # If transfer was in transit, need to restore stock to source warehouse
        if transfer.status == 'IN_TRANSIT':
            with transaction.atomic():
                for item in transfer.transfer_items.all():
                    try:
                        source_inventory = InventoryItem.objects.get(
                            product=item.product,
                            warehouse=transfer.source_warehouse
                        )
                        
                        # Restore stock
                        source_inventory.quantity += item.quantity
                        source_inventory.save()
                        
                        # Create adjustment transaction
                        InventoryTransaction.objects.create(
                            inventory_item=source_inventory,
                            transaction_type='ADJUSTMENT',
                            quantity=item.quantity,
                            reference=transfer.transfer_number,
                            notes=f"Transfer cancelled - stock restored",
                            performed_by=request.user
                        )
                        
                    except InventoryItem.DoesNotExist:
                        pass  # Continue with other items
        
        transfer.status = 'CANCELLED'
        transfer.save()
        
        return Response({
            'message': 'Transfer cancelled successfully',
            'status': transfer.status
        })

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get warehouse transfer dashboard data."""
        queryset = self.get_queryset()
        
        total_transfers = queryset.count()
        pending_transfers = queryset.filter(status='PENDING').count()
        in_transit_transfers = queryset.filter(status='IN_TRANSIT').count()
        completed_transfers = queryset.filter(status='COMPLETED').count()
        cancelled_transfers = queryset.filter(status='CANCELLED').count()
        
        # This month's transfers
        this_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_transfers = queryset.filter(initiated_at__gte=this_month).count()
        monthly_completed = queryset.filter(
            status='COMPLETED',
            completed_at__gte=this_month
        ).count()
        
        # Average transfer time
        completed = queryset.filter(
            status='COMPLETED',
            completed_at__isnull=False
        )
        
        avg_transfer_days = 0
        if completed.exists():
            total_days = sum(
                (t.completed_at.date() - t.initiated_at.date()).days
                for t in completed
            )
            avg_transfer_days = total_days / completed.count()
        
        # Total value in transit
        in_transit_value = sum(
            transfer.total_value for transfer in queryset.filter(status='IN_TRANSIT')
        )
        
        return Response({
            'total_transfers': total_transfers,
            'pending_transfers': pending_transfers,
            'in_transit_transfers': in_transit_transfers,
            'completed_transfers': completed_transfers,
            'cancelled_transfers': cancelled_transfers,
            'monthly_transfers': monthly_transfers,
            'monthly_completed': monthly_completed,
            'average_transfer_days': round(avg_transfer_days, 1),
            'in_transit_value': in_transit_value
        })

    @action(detail=False, methods=['get'])
    def stock_movements(self, request):
        """Get stock movement analysis between warehouses."""
        transfers = self.get_queryset().filter(status='COMPLETED')
        
        # Group by warehouse pairs
        movement_data = {}
        for transfer in transfers:
            key = f"{transfer.source_warehouse.name} → {transfer.destination_warehouse.name}"
            if key not in movement_data:
                movement_data[key] = {
                    'source_warehouse': transfer.source_warehouse.name,
                    'destination_warehouse': transfer.destination_warehouse.name,
                    'transfer_count': 0,
                    'total_items': 0,
                    'total_value': 0
                }
            
            movement_data[key]['transfer_count'] += 1
            movement_data[key]['total_items'] += transfer.total_items
            movement_data[key]['total_value'] += transfer.total_value
        
        return Response({
            'stock_movements': list(movement_data.values()),
            'total_movement_pairs': len(movement_data)
        })

class TransferItemViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet for TransferItem management."""
    serializer_class = TransferItemSerializer
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['transfer', 'product']
    search_fields = ['product__name', 'product__sku', 'source_location', 'destination_location']
    ordering_fields = ['quantity', 'created_at']
    ordering = ['product__name']

    def get_queryset(self):
        return TransferItem.objects.filter(
            transfer__company=self.request.user.company
        ).select_related('transfer', 'product')

    @action(detail=False, methods=['get'])
    def insufficient_stock_report(self, request):
        """Get report of transfer items with insufficient stock."""
        items = self.get_queryset().filter(transfer__status='PENDING')
        insufficient_items = []
        
        for item in items:
            if not item.sufficient_source_stock:
                insufficient_items.append({
                    'transfer_number': item.transfer.transfer_number,
                    'product_name': item.product.name,
                    'product_sku': item.product.sku,
                    'source_warehouse': item.transfer.source_warehouse.name,
                    'required_quantity': item.quantity,
                    'available_stock': item.source_stock_available,
                    'shortage': item.quantity - item.source_stock_available,
                    'item_value': item.item_value
                })
        
        total_shortage_value = sum(item['shortage'] * item['item_value'] / item['required_quantity'] for item in insufficient_items)
        
        return Response({
            'insufficient_stock_items': insufficient_items,
            'total_items_with_shortage': len(insufficient_items),
            'total_shortage_value': total_shortage_value
        })

    @action(detail=False, methods=['get'])
    def popular_transfers(self, request):
        """Get most frequently transferred products."""
        from django.db.models import Count, Sum
        
        popular_products = self.get_queryset().filter(
            transfer__status='COMPLETED'
        ).values(
            'product__name', 'product__sku'
        ).annotate(
            transfer_count=Count('transfer', distinct=True),
            total_quantity=Sum('quantity')
        ).order_by('-transfer_count')[:10]
        
        return Response({
            'popular_transfer_products': list(popular_products)
        })
