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
        ).select_related('product', 'created_by').prefetch_related(
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
            
            # Start the first pending step
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
        """Complete a production order."""
        production_order = self.get_object()
        
        if production_order.status != 'IN_PROGRESS':
            return Response({
                'error': 'Production order must be in progress to complete'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if all steps are completed
        pending_steps = production_order.production_steps.exclude(status='COMPLETED')
        if pending_steps.exists():
            return Response({
                'error': f'Cannot complete production. {pending_steps.count()} steps are still pending.',
                'pending_steps': [step.name for step in pending_steps]
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            production_order.status = 'COMPLETED'
            production_order.end_date = timezone.now()
            production_order.save()
            
            # TODO: Add finished goods to inventory
            # This would require creating inventory transactions
        
        return Response({
            'message': 'Production completed successfully',
            'status': production_order.status,
            'end_date': production_order.end_date
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
        planned_orders = queryset.filter(Q(status='PLANNED')).count()
        in_progress_orders = queryset.filter(status='IN_PROGRESS').count()
        completed_orders = queryset.filter(status='COMPLETED').count()
        cancelled_orders = queryset.filter(status='CANCELLED').count()
        
        # Overdue orders (in progress past end date)
        overdue_orders = queryset.filter(
            status='IN_PROGRESS',
            end_date__lt=timezone.now()
        ).count()
        
        # Production capacity (orders completed this month)
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
        
        # Sum to calculate the total required quantity of materials
        total_required_quantity = ProductionMaterial.objects.filter(production_order__in=active_orders).aggregate(total_required_quantity=Sum('quantity'))
        
        # F to reference model fields in the query
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
                shortage = max(0, material_summary[key]['required_quantity'] - F('available_stock'))
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
        
        # Start next pending step if exists
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
        
        # Q for filter the queryset based on multiple conditions
        insufficient_materials = materials.filter(Q(quantity__gt=F('available_stock'))).count()
        
        # Sum to calculate the total required quantity of materials
        total_required_quantity = materials.aggregate(total_required_quantity=Sum('quantity'))
        
        # F to reference model fields in the query
        insufficient = []
        for material in materials:
            if material.quantity > F('available_stock'):
                insufficient.append({
                    'id': str(material.id),
                    'production_order': material.production_order.order_number,
                    'product_name': material.product.name,
                    'product_sku': material.product.sku,
                    'warehouse': material.warehouse.name,
                    'required_quantity': material.quantity,
                    'available_stock': material.available_stock,
                    'shortage': material.quantity - F('available_stock')
                })
        
        return Response({
            'materials_with_insufficient_stock': insufficient,
            'total_count': insufficient_materials
        })