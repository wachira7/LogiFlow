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
    CreateWarehouseTransferSerializer, TransferItemSerializer, UpdateWarehouseTransferSerializer,
)
from . import services
from .services import TransferError
from utils.mixins import TenantViewSetMixin, BulkActionMixin
from utils.permissions import IsCompanyMember, IsSameCompany


def error(message, status_code=status.HTTP_400_BAD_REQUEST, **extra):
    return Response({'error': message, 'message': message, **extra}, status=status_code)


class ValueOrderingFilter(filters.OrderingFilter):
    """`total_value` is a model property; order by the annotated value_amount instead."""

    def remove_invalid_fields(self, queryset, fields, view, request):
        fields = [f.replace('total_value', 'value_amount') for f in fields]
        return super().remove_invalid_fields(queryset, fields, view, request)

class WarehouseTransferViewSet(TenantViewSetMixin, BulkActionMixin, viewsets.ModelViewSet):
    """ViewSet for WarehouseTransfer management."""
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, ValueOrderingFilter]
    filterset_fields = ['status', 'source_warehouse', 'destination_warehouse', 'initiated_by']
    search_fields = ['transfer_number', 'notes']
    ordering_fields = ['transfer_number', 'initiated_at', 'completed_at', 'value_amount']
    ordering = ['-initiated_at']

    def get_queryset(self):
        return WarehouseTransfer.objects.filter(
            company=self.request.user.company
        ).select_related(
            'source_warehouse', 'destination_warehouse', 'initiated_by', 'approved_by'
        ).prefetch_related('transfer_items__product').annotate(
            value_amount=Sum(F('transfer_items__quantity') * F('transfer_items__product__cost_price')),
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateWarehouseTransferSerializer
        if self.action in ('update', 'partial_update'):
            return UpdateWarehouseTransferSerializer
        if self.action == 'retrieve':
            return WarehouseTransferDetailSerializer
        return WarehouseTransferListSerializer

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transfer = serializer.save(company=request.user.company)
        data = WarehouseTransferDetailSerializer(transfer, context={'request': request}).data
        return Response(data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        transfer = self.get_queryset().get(pk=kwargs['pk'])
        return Response(WarehouseTransferDetailSerializer(transfer, context={'request': request}).data)

    def destroy(self, request, *args, **kwargs):
        transfer = self.get_object()
        if transfer.status not in ('PENDING', 'CANCELLED'):
            return error('Only pending or cancelled transfers can be deleted; '
                         'this one has moved stock and is kept for the record.')
        return super().destroy(request, *args, **kwargs)

    def _run(self, request, step, message, **kwargs):
        try:
            transfer = step(self.get_object(), request.user, **kwargs)
        except TransferError as exc:
            return error(str(exc), **exc.details)
        return Response({
            'message': message,
            'status': transfer.status,
            'stock_dispatched': transfer.stock_dispatched,
            'approved_by': transfer.approved_by.get_full_name() if transfer.approved_by else None,
            'completed_at': transfer.completed_at,
            'duration_days': transfer.transfer_duration_days,
        })
        
    @action(detail=True, methods=['post'])
    def approve_transfer(self, request, pk=None):
        """Approve: check stock and take it out of the source warehouse (now in transit)."""
        return self._run(request, services.dispatch, 'Transfer approved; stock has left the source warehouse')

    @action(detail=True, methods=['post'])
    def start_transfer(self, request, pk=None):
        """Only for transfers approved under the old flow, whose stock never left the source."""
        return self._run(request, services.dispatch, 'Transfer started; stock has left the source warehouse',
                         approve=False)

    @action(detail=True, methods=['post'])
    def complete_transfer(self, request, pk=None):
        """Receive the stock at the destination warehouse."""
        return self._run(request, services.receive, 'Transfer completed; stock received at the destination')

    @action(detail=True, methods=['post'])
    def cancel_transfer(self, request, pk=None):
        """Cancel; stock that already left the source is returned."""
        return self._run(request, services.cancel, 'Transfer cancelled')

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
        
        # Average transfer time (whole days, initiated → completed)
        completed = WarehouseTransfer.objects.filter(
            company=request.user.company, status='COMPLETED', completed_at__isnull=False,
        ).values_list('initiated_at', 'completed_at')
        durations = [(done.date() - started.date()).days for started, done in completed]
        avg_transfer_days = sum(durations) / len(durations) if durations else 0

        # Value of stock currently on the road (only transfers whose stock has left the source)
        in_transit_value = WarehouseTransfer.objects.filter(
            company=request.user.company, status='IN_TRANSIT',
        ).aggregate(v=Sum(F('transfer_items__quantity') * F('transfer_items__product__cost_price')))['v'] or 0
        
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
                    'total_quantity': 0,
                    'total_value': 0,
                    'last_transfer_at': None,
                }
            
            pair = movement_data[key]
            pair['transfer_count'] += 1
            pair['total_items'] += transfer.total_items
            pair['total_quantity'] += transfer.total_quantity
            pair['total_value'] += transfer.total_value
            if transfer.completed_at and (pair['last_transfer_at'] is None or transfer.completed_at > pair['last_transfer_at']):
                pair['last_transfer_at'] = transfer.completed_at
        
        return Response({
            'stock_movements': sorted(movement_data.values(), key=lambda p: -p['transfer_count']),
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

    def perform_create(self, serializer):
        if not serializer.validated_data.get('transfer_id'):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'transfer_id': 'Choose the transfer this item belongs to.'})
        serializer.save()

    def update(self, request, *args, **kwargs):
        if self.get_object().transfer.status != 'PENDING':
            return error('Items can only be changed while the transfer is pending.')
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if self.get_object().transfer.status != 'PENDING':
            return error('Items can only be removed while the transfer is pending.')
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def insufficient_stock_report(self, request):
        """Get report of transfer items with insufficient stock."""
        items = self.get_queryset().filter(transfer__status='PENDING').select_related('transfer__source_warehouse')
        insufficient_items = []
        
        for item in items:
            if not item.sufficient_source_stock:
                insufficient_items.append({
                    'transfer_id': str(item.transfer_id),
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
