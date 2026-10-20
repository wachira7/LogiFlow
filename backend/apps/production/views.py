# apps/production/views.py
from django.db.models import Prefetch
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.inventory.models import InventoryItem
from utils.mixins import BulkActionMixin, TenantViewSetMixin
from utils.permissions import IsCompanyMember, IsSameCompany

from . import services
from .models import ProductionMaterial, ProductionOrder, ProductionStep
from .serializers import (
    CreateProductionOrderSerializer, ProductionMaterialSerializer, ProductionOrderDetailSerializer,
    ProductionOrderListSerializer, ProductionStepSerializer, UpdateProductionOrderSerializer,
)
from .services import ProductionError


def error(message, status_code=status.HTTP_400_BAD_REQUEST, **extra):
    return Response({'error': message, 'message': message, **extra}, status=status_code)


class ProductionOrderViewSet(TenantViewSetMixin, BulkActionMixin, viewsets.ModelViewSet):
    """Production orders. Status changes only through start / complete / cancel."""
    permission_classes = [IsAuthenticated, IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'product', 'created_by', 'output_warehouse']
    search_fields = ['order_number', 'product__name', 'product__sku', 'notes']
    ordering_fields = ['order_number', 'start_date', 'end_date', 'created_at', 'quantity']
    ordering = ['-created_at']

    def get_queryset(self):
        return ProductionOrder.objects.filter(company=self.request.user.company).select_related(
            'product', 'created_by', 'output_warehouse',
        ).prefetch_related(
            Prefetch('production_steps', queryset=ProductionStep.objects.select_related('assigned_to').order_by('created_at')),
            Prefetch('production_materials', queryset=ProductionMaterial.objects.select_related('product', 'warehouse')),
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateProductionOrderSerializer
        if self.action in ('update', 'partial_update'):
            return UpdateProductionOrderSerializer
        if self.action == 'retrieve':
            return ProductionOrderDetailSerializer
        return ProductionOrderListSerializer

    def _detail(self, pk):
        return Response(ProductionOrderDetailSerializer(self.get_queryset().get(pk=pk), context={'request': self.request}).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        response = self._detail(order.pk)
        response.status_code = status.HTTP_201_CREATED
        return response

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        return self._detail(kwargs['pk'])

    def destroy(self, request, *args, **kwargs):
        order = self.get_object()
        if order.status not in ('PLANNED', 'CANCELLED'):
            return error('Only planned or cancelled orders can be deleted; this one has moved stock and is kept for the record.')
        return super().destroy(request, *args, **kwargs)

    def _run(self, step, message, **extra):
        try:
            result = step(self.get_object(), self.request.user)
        except ProductionError as exc:
            return error(str(exc), **exc.details)
        order = result[0] if isinstance(result, tuple) else result
        data = self._detail(order.pk).data
        return Response({'message': message, **extra, 'order': data, 'status': order.status})

    @action(detail=True, methods=['post'])
    def start_production(self, request, pk=None):
        """Start: check and take the raw materials out of stock, begin the first step."""
        return self._run(services.start, 'Production started; materials have been taken from stock')

    @action(detail=True, methods=['post'])
    def complete_production(self, request, pk=None):
        """Complete: all steps done; finished goods go into the output warehouse."""
        try:
            order, line = services.complete(self.get_object(), request.user)
        except ProductionError as exc:
            return error(str(exc), **exc.details)
        return Response({
            'message': f'Production completed; {order.quantity} added to {order.output_warehouse.name}',
            'status': order.status,
            'inventory_updated': {
                'product': order.product.name, 'warehouse': order.output_warehouse.name,
                'quantity_added': order.quantity, 'new_total': line.quantity,
            },
            'order': self._detail(order.pk).data,
        })

    @action(detail=True, methods=['post'])
    def cancel_production(self, request, pk=None):
        """Cancel; materials already taken from stock are returned."""
        return self._run(services.cancel, 'Production order cancelled')

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        qs = ProductionOrder.objects.filter(company=request.user.company)
        now = timezone.now()
        month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        counts = {s: qs.filter(status=s).count() for s in ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')}
        completed = list(qs.filter(status='COMPLETED', start_date__isnull=False, end_date__isnull=False)
                         .values_list('start_date', 'end_date', 'quantity'))
        hours = [(end - start).total_seconds() / 3600 for start, end, _ in completed]
        return Response({
            'total_orders': qs.count(),
            'planned_orders': counts['PLANNED'],
            'in_progress_orders': counts['IN_PROGRESS'],
            'completed_orders': counts['COMPLETED'],
            'cancelled_orders': counts['CANCELLED'],
            # In progress past their target end date
            'overdue_orders': qs.filter(status='IN_PROGRESS', end_date__lt=now).count(),
            'monthly_completed': qs.filter(status='COMPLETED', end_date__gte=month).count(),
            'monthly_units': sum(q for _, end, q in completed if end >= month),
            'average_cycle_hours': round(sum(hours) / len(hours), 1) if hours else 0,
            'steps_in_progress': ProductionStep.objects.filter(production_order__company=request.user.company,
                                                               production_order__status='IN_PROGRESS',
                                                               status='IN_PROGRESS').count(),
        })

    @action(detail=False, methods=['get'])
    def material_requirements(self, request):
        """Materials still needed by orders that haven't taken them from stock yet, per warehouse."""
        materials = ProductionMaterial.objects.filter(
            production_order__company=request.user.company,
            production_order__status__in=['PLANNED', 'IN_PROGRESS'],
            production_order__materials_consumed=False,
        ).select_related('product', 'warehouse')

        summary = {}
        for m in materials:
            row = summary.setdefault((m.product_id, m.warehouse_id), {
                'product_id': str(m.product_id), 'product_name': m.product.name, 'product_sku': m.product.sku,
                'warehouse_id': str(m.warehouse_id), 'warehouse_name': m.warehouse.name,
                'required_quantity': 0, 'order_count': 0,
            })
            row['required_quantity'] += m.quantity
            row['order_count'] += 1
        stock = {
            (i.product_id, i.warehouse_id): i.quantity
            for i in InventoryItem.objects.filter(product__company=request.user.company)
        }
        rows = []
        for key, row in summary.items():
            row['available_stock'] = stock.get(key, 0)
            row['shortage'] = max(0, row['required_quantity'] - row['available_stock'])
            rows.append(row)
        rows.sort(key=lambda r: (-r['shortage'], r['product_name']))
        return Response({
            'material_requirements': rows,
            'total_materials': len(rows),
            'materials_with_shortage': sum(1 for r in rows if r['shortage'] > 0),
        })


class ProductionStepViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Steps of production orders. Status moves only through start / complete / skip."""
    serializer_class = ProductionStepSerializer
    permission_classes = [IsAuthenticated, IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'production_order', 'assigned_to']
    search_fields = ['name', 'description', 'production_order__order_number']
    ordering_fields = ['created_at', 'start_time', 'end_time', 'duration_hours']
    ordering = ['production_order', 'created_at']

    def get_queryset(self):
        return ProductionStep.objects.filter(
            production_order__company=self.request.user.company
        ).select_related('production_order', 'production_order__product', 'assigned_to')

    def destroy(self, request, *args, **kwargs):
        step = self.get_object()
        if step.production_order.status not in ('PLANNED', 'IN_PROGRESS') or step.status != 'PENDING':
            return error('Only pending steps on an open order can be removed.')
        return super().destroy(request, *args, **kwargs)

    def _run(self, step_fn, message):
        try:
            step, next_step = step_fn(self.get_object())
        except ProductionError as exc:
            return error(str(exc), **exc.details)
        return Response({
            'message': message,
            'status': step.status,
            'start_time': step.start_time,
            'end_time': step.end_time,
            'next_step_started': next_step.name if next_step else None,
        })

    @action(detail=True, methods=['post'])
    def start_step(self, request, pk=None):
        return self._run(services.start_step, 'Step started')

    @action(detail=True, methods=['post'])
    def complete_step(self, request, pk=None):
        return self._run(services.complete_step, 'Step completed')

    @action(detail=True, methods=['post'])
    def skip_step(self, request, pk=None):
        return self._run(services.skip_step, 'Step skipped')


class ProductionMaterialViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Raw materials of production orders; editable only while the order is planned."""
    serializer_class = ProductionMaterialSerializer
    permission_classes = [IsAuthenticated, IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['production_order', 'product', 'warehouse']
    search_fields = ['product__name', 'product__sku', 'production_order__order_number']
    ordering_fields = ['quantity', 'created_at']
    ordering = ['product__name']

    def get_queryset(self):
        return ProductionMaterial.objects.filter(
            production_order__company=self.request.user.company
        ).select_related('production_order', 'product', 'warehouse')

    def destroy(self, request, *args, **kwargs):
        if self.get_object().production_order.status != 'PLANNED':
            return error('Materials can only be removed while the order is planned.')
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def insufficient_stock(self, request):
        """Materials on orders that haven't started yet whose warehouse doesn't hold enough."""
        materials = self.get_queryset().filter(
            production_order__status__in=['PLANNED', 'IN_PROGRESS'], production_order__materials_consumed=False,
        )
        stock = {
            (i.product_id, i.warehouse_id): i.quantity
            for i in InventoryItem.objects.filter(product__company=request.user.company)
        }
        rows = []
        for m in materials:
            available = stock.get((m.product_id, m.warehouse_id), 0)
            if m.quantity > available:
                rows.append({
                    'id': str(m.id),
                    'production_order_id': str(m.production_order_id),
                    'production_order': m.production_order.order_number,
                    'product_name': m.product.name,
                    'product_sku': m.product.sku,
                    'warehouse': m.warehouse.name,
                    'required_quantity': m.quantity,
                    'available_stock': available,
                    'shortage': m.quantity - available,
                })
        return Response({'materials_with_insufficient_stock': rows, 'total_count': len(rows)})
