# apps/production/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Sum, F, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from .models import ProductionOrder, ProductionStep, ProductionMaterial
from .serializers import (
    ProductionOrderListSerializer, ProductionOrderDetailSerializer,
    CreateProductionOrderSerializer, ProductionStepSerializer,
    ProductionMaterialSerializer
)
from apps.inventory.models import InventoryItem, InventoryTransaction
from utils.mixins import TenantViewSetMixin, BulkActionMixin
from utils.permissions import IsCompanyMember, IsSameCompany


class ProductionOrderViewSet(TenantViewSetMixin, BulkActionMixin, viewsets.ModelViewSet):
    """ViewSet for ProductionOrder management."""
    permission_classes = [IsAuthenticated, IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'product', 'created_by']
    search_fields = ['order_number', 'product__name', 'product__sku', 'notes']
    ordering_fields = ['order_number', 'start_date', 'end_date', 'created_at', 'quantity']
    ordering = ['-created_at']

    def get_queryset(self):
        return ProductionOrder.objects.filter(
            company=self.request.user.company
        ).select_related('product', 'created_by', 'output_warehouse').prefetch_related(
            'production_steps', 'production_materials'
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateProductionOrderSerializer
        elif self.action == 'retrieve':
            return ProductionOrderDetailSerializer
        return ProductionOrderListSerializer

    @action(detail=True, methods=['post'])
    def start_production(self, request, pk=None):
        """Start a production order."""
        production_order = self.get_object()

        if production_order.status != 'PLANNED':
            return Response({
                'error': 'Production order must be in PLANNED status to start'
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            production_order.status = 'IN_PROGRESS'
            production_order.start_date = timezone.now()
            production_order.save()

            first_step = production_order.production_steps.filter(status='PENDING').first()
            if first_step:
                first_step.status = 'IN_PROGRESS'
                first_step.start_time = timezone.now()
                first_step.save()

        return Response({
            'message': 'Production started successfully',
            'status': production_order.status,
            'start_date': production_order.start_date
        })

    @action(detail=True, methods=['post'])
    def complete_production(self, request, pk=None):
        """
        Complete a production order.
        Adds finished goods to the output warehouse inventory via a RECEIPT transaction.
        """
        production_order = self.get_object()

        if production_order.status != 'IN_PROGRESS':
            return Response({
                'error': 'Production order must be in progress to complete'
            }, status=status.HTTP_400_BAD_REQUEST)

        # All steps must be completed or skipped
        incomplete_steps = production_order.production_steps.exclude(
            status__in=['COMPLETED', 'SKIPPED']
        )
        if incomplete_steps.exists():
            return Response({
                'error': f'Cannot complete production. {incomplete_steps.count()} step(s) are still pending.',
                'pending_steps': list(incomplete_steps.values_list('name', flat=True))
            }, status=status.HTTP_400_BAD_REQUEST)

        if not production_order.output_warehouse:
            return Response({
                'error': 'Production order has no output warehouse set. '
                         'Please edit the order and select an output warehouse before completing.'
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            production_order.status = 'COMPLETED'
            production_order.end_date = timezone.now()
            production_order.save()

            # Add finished goods to output warehouse inventory
            inventory_item, created = InventoryItem.objects.get_or_create(
                product=production_order.product,
                warehouse=production_order.output_warehouse,
                defaults={'quantity': 0}
            )
            inventory_item.quantity += production_order.quantity
            inventory_item.save()

            # Record the inventory transaction
            InventoryTransaction.objects.create(
                inventory_item=inventory_item,
                transaction_type='RECEIPT',
                quantity=production_order.quantity,
                reference=production_order.order_number,
                notes=f'Finished goods from production order {production_order.order_number}',
                performed_by=request.user
            )

        return Response({
            'message': 'Production completed successfully',
            'status': production_order.status,
            'end_date': production_order.end_date,
            'inventory_updated': {
                'product': production_order.product.name,
                'warehouse': production_order.output_warehouse.name,
                'quantity_added': production_order.quantity,
                'new_total': inventory_item.quantity
            }
        })

    @action(detail=True, methods=['post'])
    def cancel_production(self, request, pk=None):
        """Cancel a production order."""
        production_order = self.get_object()

        if production_order.status == 'COMPLETED':
            return Response({
                'error': 'Cannot cancel completed production order'
            }, status=status.HTTP_400_BAD_REQUEST)

        production_order.status = 'CANCELLED'
        production_order.save()

        return Response({
            'message': 'Production order cancelled successfully',
            'status': production_order.status
        })

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get production dashboard data."""
        queryset = self.get_queryset()

        total_orders = queryset.count()
        planned_orders = queryset.filter(status='PLANNED').count()
        in_progress_orders = queryset.filter(status='IN_PROGRESS').count()
        completed_orders = queryset.filter(status='COMPLETED').count()
        cancelled_orders = queryset.filter(status='CANCELLED').count()

        overdue_orders = queryset.filter(
            status='IN_PROGRESS',
            end_date__lt=timezone.now()
        ).count()

        this_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_completed = queryset.filter(
            status='COMPLETED',
            end_date__gte=this_month
        ).count()

        return Response({
            'total_orders': total_orders,
            'planned_orders': planned_orders,
            'in_progress_orders': in_progress_orders,
            'completed_orders': completed_orders,
            'cancelled_orders': cancelled_orders,
            'overdue_orders': overdue_orders,
            'monthly_completed': monthly_completed
        })

    @action(detail=False, methods=['get'])
    def material_requirements(self, request):
        """Get material requirements for all active production orders."""
        active_orders = self.get_queryset().filter(status__in=['PLANNED', 'IN_PROGRESS'])

        material_summary = {}
        for order in active_orders:
            for material in order.production_materials.all():
                key = f"{material.product.name} ({material.product.sku})"
                if key not in material_summary:
                    material_summary[key] = {
                        'product_id': str(material.product.id),
                        'product_name': material.product.name,
                        'product_sku': material.product.sku,
                        'required_quantity': 0,
                        'available_stock': material.available_stock,
                        'shortage': 0
                    }
                material_summary[key]['required_quantity'] += material.quantity
                shortage = max(0, material_summary[key]['required_quantity'] - material_summary[key]['available_stock'])
                material_summary[key]['shortage'] = shortage

        return Response({
            'material_requirements': list(material_summary.values()),
            'total_materials': len(material_summary),
            'materials_with_shortage': sum(1 for m in material_summary.values() if m['shortage'] > 0)
        })


class ProductionStepViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet for ProductionStep management."""
    serializer_class = ProductionStepSerializer
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'production_order', 'assigned_to']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'start_time', 'end_time', 'duration_hours']
    ordering = ['production_order', 'created_at']

    def get_queryset(self):
        return ProductionStep.objects.filter(
            production_order__company=self.request.user.company
        ).select_related('production_order', 'assigned_to')

    @action(detail=True, methods=['post'])
    def start_step(self, request, pk=None):
        """Start a production step."""
        step = self.get_object()

        if step.status != 'PENDING':
            return Response({
                'error': 'Step must be in PENDING status to start'
            }, status=status.HTTP_400_BAD_REQUEST)

        step.status = 'IN_PROGRESS'
        step.start_time = timezone.now()
        step.save()

        return Response({
            'message': 'Step started successfully',
            'status': step.status,
            'start_time': step.start_time
        })

    @action(detail=True, methods=['post'])
    def complete_step(self, request, pk=None):
        """Complete a production step."""
        step = self.get_object()

        if step.status != 'IN_PROGRESS':
            return Response({
                'error': 'Step must be in progress to complete'
            }, status=status.HTTP_400_BAD_REQUEST)

        step.status = 'COMPLETED'
        step.end_time = timezone.now()
        step.save()

        next_step = step.production_order.production_steps.filter(
            status='PENDING'
        ).first()

        if next_step:
            next_step.status = 'IN_PROGRESS'
            next_step.start_time = timezone.now()
            next_step.save()

        return Response({
            'message': 'Step completed successfully',
            'status': step.status,
            'end_time': step.end_time,
            'next_step_started': next_step.name if next_step else None
        })

    @action(detail=True, methods=['post'])
    def skip_step(self, request, pk=None):
        """Skip a production step."""
        step = self.get_object()

        if step.status == 'COMPLETED':
            return Response({
                'error': 'Cannot skip completed step'
            }, status=status.HTTP_400_BAD_REQUEST)

        step.status = 'SKIPPED'
        step.save()

        return Response({
            'message': 'Step skipped successfully',
            'status': step.status
        })


class ProductionMaterialViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet for ProductionMaterial management."""
    serializer_class = ProductionMaterialSerializer
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['production_order', 'product', 'warehouse']
    search_fields = ['product__name', 'product__sku']
    ordering_fields = ['quantity', 'created_at']
    ordering = ['product__name']

    def get_queryset(self):
        return ProductionMaterial.objects.filter(
            production_order__company=self.request.user.company
        ).select_related('production_order', 'product', 'warehouse')

    @action(detail=False, methods=['get'])
    def insufficient_stock(self, request):
        """Get materials with insufficient stock."""
        materials = self.get_queryset()

        insufficient = []
        for material in materials:
            # Use the Python property, not F() — available_stock is not a DB column
            available = material.available_stock
            if material.quantity > available:
                insufficient.append({
                    'id': str(material.id),
                    'production_order': material.production_order.order_number,
                    'product_name': material.product.name,
                    'product_sku': material.product.sku,
                    'warehouse': material.warehouse.name,
                    'required_quantity': material.quantity,
                    'available_stock': available,
                    'shortage': material.quantity - available
                })

        return Response({
            'materials_with_insufficient_stock': insufficient,
            'total_count': len(insufficient)
        })