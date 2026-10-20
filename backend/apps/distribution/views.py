# apps/distribution/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, models
from django.db.models import Q, Sum, Count, Avg , Max
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from .models import CustomerOrder, OrderItem, Shipment, ShipmentItem, DeliveryRoute, RouteStop
from .serializers import (
    CustomerOrderListSerializer, CustomerOrderDetailSerializer, CreateCustomerOrderSerializer, UpdateCustomerOrderSerializer,
    ShipmentListSerializer, ShipmentDetailSerializer, DeliveryRouteListSerializer,
    DeliveryRouteDetailSerializer, RouteStopSerializer
)
from utils.mixins import TenantViewSetMixin, BulkActionMixin
from utils.permissions import IsCompanyMember, IsSameCompany
from .utils import geocode_address, mark_shipment_delivered
from .events import record_event, record_status_change
from . import services
from .services import ShipmentError
import time


def error(message, status_code=status.HTTP_400_BAD_REQUEST, **extra):
    return Response({'error': message, 'message': message, **extra}, status=status_code)

class CustomerOrderViewSet(TenantViewSetMixin, BulkActionMixin, viewsets.ModelViewSet):
    """ViewSet for CustomerOrder management."""
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'customer_email']
    search_fields = ['order_number', 'customer_name', 'customer_email', 'notes']
    ordering_fields = ['order_number', 'total_amount', 'created_at', 'customer_name']
    ordering = ['-created_at']

    def get_queryset(self):
        return CustomerOrder.objects.filter(
            company=self.request.user.company
        ).prefetch_related('order_items__product', 'shipments')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateCustomerOrderSerializer
        if self.action in ('update', 'partial_update'):
            return UpdateCustomerOrderSerializer
        if self.action == 'retrieve':
            return CustomerOrderDetailSerializer
        return CustomerOrderListSerializer

    def _detail(self, order):
        return CustomerOrderDetailSerializer(self.get_queryset().get(pk=order.pk), context={'request': self.request}).data

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(self._detail(order), status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        return Response(self._detail(self.get_object()))

    def destroy(self, request, *args, **kwargs):
        order = self.get_object()
        if order.status not in ('NEW', 'CANCELLED') or order.shipments.exclude(status='CANCELLED').exists():
            return error('Only new or cancelled orders without shipments can be deleted.')
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def process_order(self, request, pk=None):
        """Move order from NEW to PROCESSING status."""
        order = self.get_object()
        
        if order.status != 'NEW':
            return Response({
                'error': 'Order must be in NEW status to process'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        order.status = 'PROCESSING'
        order.save()
        
        return Response({
            'message': 'Order moved to processing',
            'status': order.status
        })

    @action(detail=True, methods=['post'])
    def ship_order(self, request, pk=None):
        """Create the shipment for a processing order (stock leaves the warehouse when it ships)."""
        from apps.inventory.models import Warehouse
        order = self.get_object()
        if order.status != 'PROCESSING':
            return error('Start processing the order before creating its shipment.')
        if order.shipments.exclude(status__in=('CANCELLED', 'RETURNED')).exists():
            return error('This order already has a shipment.')
        if not order.order_items.exists():
            return error('Add products to the order first.')
        warehouse = Warehouse.objects.filter(id=request.data.get('warehouse_id'), company=request.user.company).first()
        if warehouse is None:
            return error('Choose the warehouse it ships from.', status.HTTP_404_NOT_FOUND if request.data.get('warehouse_id') else status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            shipment = Shipment.objects.create(
                company=order.company, order=order, warehouse=warehouse, status='PENDING',
                shipment_number=services.next_number(Shipment, 'shipment_number', order.company, 'SH'),
                destination_address=order.shipping_address, recipient_name=order.customer_name,
                recipient_phone=order.customer_phone,
            )
            record_event(shipment, 'CREATED', actor=request.user, message=f'Created from order {order.order_number}',
                         data={'order_number': order.order_number})
            for item in order.order_items.all():
                ShipmentItem.objects.create(shipment=shipment, order_item=item, product=item.product, quantity=item.quantity)
        return Response({'message': 'Shipment created; ship it when it leaves the warehouse',
                         'shipment_id': str(shipment.id), 'shipment_number': shipment.shipment_number})

    @action(detail=True, methods=['post'])
    def cancel_order(self, request, pk=None):
        """Cancel an order that hasn't shipped; shipments still in the warehouse are cancelled too."""
        order = self.get_object()
        if order.status not in ('NEW', 'PROCESSING'):
            return error('Shipped or delivered orders can’t be cancelled; record a return on the shipment instead.')
        if order.shipments.exclude(status__in=('PENDING', 'PICKED', 'PACKED', 'CANCELLED')).exists():
            return error('Part of this order has already left the warehouse.')
        with transaction.atomic():
            for shipment in order.shipments.filter(status__in=services.PRE_SHIP):
                services.cancel(shipment, request.user, 'order cancelled')
            order.status = 'CANCELLED'
            order.save(update_fields=['status', 'updated_at'])
        return Response({'message': 'Order cancelled', 'status': order.status})

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get order dashboard data."""
        queryset = self.get_queryset()
        
        total_orders = queryset.count()
        new_orders = queryset.filter(status='NEW').count()
        processing_orders = queryset.filter(status='PROCESSING').count()
        shipped_orders = queryset.filter(status='SHIPPED').count()
        delivered_orders = queryset.filter(status='DELIVERED').count()
        cancelled_orders = queryset.filter(status='CANCELLED').count()
        
        # Revenue calculations
        total_revenue = queryset.filter(
            status__in=['SHIPPED', 'DELIVERED']
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Monthly stats
        this_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_orders = queryset.filter(created_at__gte=this_month).count()
        monthly_revenue = queryset.filter(
            created_at__gte=this_month,
            status__in=['SHIPPED', 'DELIVERED']
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        return Response({
            'total_orders': total_orders,
            'new_orders': new_orders,
            'processing_orders': processing_orders,
            'shipped_orders': shipped_orders,
            'delivered_orders': delivered_orders,
            'cancelled_orders': cancelled_orders,
            'total_revenue': total_revenue,
            'monthly_orders': monthly_orders,
            'monthly_revenue': monthly_revenue
        })

class ShipmentViewSet(TenantViewSetMixin, BulkActionMixin, viewsets.ModelViewSet):
    """ViewSet for Shipment management."""
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'warehouse', 'driver', 'carrier']
    search_fields = ['shipment_number', 'tracking_number', 'order__order_number']
    ordering_fields = ['shipment_number', 'shipping_date', 'estimated_delivery', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return Shipment.objects.filter(
            company=self.request.user.company
        ).select_related('order', 'warehouse', 'driver').prefetch_related('shipment_items__product')

    def get_serializer_class(self):
        if self.action in ('retrieve', 'create', 'update', 'partial_update'):
            return ShipmentDetailSerializer
        return ShipmentListSerializer

    def perform_create(self, serializer):
        company = self.request.user.company
        number = (serializer.validated_data.get('shipment_number') or '').strip() or services.next_number(Shipment, 'shipment_number', company, 'SH')
        serializer.save(company=company, shipment_number=number)
        record_event(serializer.instance, 'CREATED', actor=self.request.user, message='Shipment created')

    def destroy(self, request, *args, **kwargs):
        if self.get_object().status not in ('PENDING', 'CANCELLED'):
            return error('Only pending or cancelled shipments can be deleted.')
        return super().destroy(request, *args, **kwargs)

    def _run(self, fn, message, **kwargs):
        try:
            shipment = fn(self.get_object(), self.request.user, **kwargs)
        except ShipmentError as exc:
            return error(str(exc), **exc.details)
        return Response({'message': message, 'status': shipment.status, 'tracking_number': shipment.tracking_number,
                         'delivery_time': shipment.actual_delivery, 'shipment': ShipmentDetailSerializer(shipment, context={'request': self.request}).data})

    def perform_update(self, serializer):
        before = serializer.instance
        previous = {'status': before.status, 'driver_id': before.driver_id, 'vehicle_id': before.vehicle_id}
        shipment = serializer.save()
        record_status_change(shipment, previous['status'], actor=self.request.user)
        if (shipment.driver_id, shipment.vehicle_id) != (previous['driver_id'], previous['vehicle_id']):
            record_event(
                shipment, 'ASSIGNED', actor=self.request.user,
                message='Driver or vehicle changed',
                data={'driver_id': str(shipment.driver_id or ''), 'vehicle_id': str(shipment.vehicle_id or '')},
            )

    @action(detail=True, methods=['post'])
    def pick_shipment(self, request, pk=None):
        return self._run(lambda s, u: services.advance(s, 'PICKED', u), 'Shipment picked')

    @action(detail=True, methods=['post'])
    def pack_shipment(self, request, pk=None):
        return self._run(lambda s, u: services.advance(s, 'PACKED', u), 'Shipment packed')

    @action(detail=True, methods=['post'])
    def ship_shipment(self, request, pk=None):
        """Items leave the warehouse (stock is taken) and the shipment is on its way."""
        return self._run(services.ship, 'Shipment is on its way', tracking_number=request.data.get('tracking_number', ''),
                         carrier=request.data.get('carrier', ''), estimated_delivery=request.data.get('estimated_delivery') or None)

    @action(detail=True, methods=['post'])
    def deliver_shipment(self, request, pk=None):
        return self._run(services.deliver, 'Shipment delivered')

    @action(detail=True, methods=['post'])
    def cancel_shipment(self, request, pk=None):
        return self._run(services.cancel, 'Shipment cancelled', reason=request.data.get('reason', ''))

    @action(detail=True, methods=['post'])
    def return_shipment(self, request, pk=None):
        return self._run(services.return_shipment, 'Return recorded; stock is back in the warehouse', reason=request.data.get('reason', ''))

    @action(detail=False, methods=['get'], url_path='track')
    def track(self, request):
        tracking_number = request.query_params.get('tracking_number')
        if not tracking_number:
            return Response({'error': 'tracking_number required'}, status=400)
        
        shipment = Shipment.objects.filter(
            company=request.user.company,
            tracking_number=tracking_number
        ).first()
        
        if not shipment:
            return Response({'error': 'Shipment not found'}, status=404)
        
        serializer = ShipmentDetailSerializer(shipment, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def tracking_report(self, request):
        """Get shipment tracking report."""
        queryset = self.get_queryset()
        
        pending_shipments = queryset.filter(status='PENDING').count()
        picked_shipments = queryset.filter(status='PICKED').count()
        packed_shipments = queryset.filter(status='PACKED').count()
        shipped_shipments = queryset.filter(status='SHIPPED').count()
        delivered_shipments = queryset.filter(status='DELIVERED').count()
        
        # Delayed shipments
        delayed_shipments = queryset.filter(
            status='SHIPPED',
            estimated_delivery__lt=timezone.now()
        ).count()
        
        # Average delivery time
        delivered = queryset.filter(
            status='DELIVERED',
            shipping_date__isnull=False,
            actual_delivery__isnull=False
        )
        
        avg_delivery_days = 0
        if delivered.exists():
            total_days = sum(
                (s.actual_delivery.date() - s.shipping_date.date()).days
                for s in delivered
            )
            avg_delivery_days = total_days / delivered.count()
        
        with_eta = delivered.filter(estimated_delivery__isnull=False)
        on_time = with_eta.filter(actual_delivery__lte=models.F('estimated_delivery')).count()
        return Response({
            'pending_shipments': pending_shipments,
            'picked_shipments': picked_shipments,
            'packed_shipments': packed_shipments,
            'shipped_shipments': shipped_shipments,
            'delivered_shipments': delivered_shipments,
            'delayed_shipments': delayed_shipments,
            'average_delivery_days': round(avg_delivery_days, 1),
            'total_shipments': pending_shipments + picked_shipments + packed_shipments + shipped_shipments + delivered_shipments,
            # Delivered by the estimated time, among deliveries that had one
            'on_time_percentage': round(on_time / with_eta.count() * 100, 1) if with_eta.exists() else None,
        })

class DeliveryRouteViewSet(TenantViewSetMixin, BulkActionMixin, viewsets.ModelViewSet):
    """ViewSet for DeliveryRoute management."""
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'driver']
    search_fields = ['route_name', 'vehicle_id', 'notes']
    ordering_fields = ['route_name', 'start_time', 'end_time', 'total_distance', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return DeliveryRoute.objects.filter(
            company=self.request.user.company
        ).select_related('driver').prefetch_related('route_stops__shipment')

    def get_serializer_class(self):
        if self.action in ('retrieve', 'create', 'update', 'partial_update'):
            return DeliveryRouteDetailSerializer
        return DeliveryRouteListSerializer

    @action(detail=True, methods=['post'])
    def start_route(self, request, pk=None):
        """Start a delivery route."""
        route = self.get_object()
        
        if route.status != 'PLANNED':
            return Response({
                'error': 'Route must be in PLANNED status to start'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        route.status = 'IN_PROGRESS'
        route.start_time = timezone.now()
        route.save()
        
        return Response({
            'message': 'Route started successfully',
            'status': route.status,
            'start_time': route.start_time
        })

    @action(detail=True, methods=['post'])
    def complete_route(self, request, pk=None):
        """Complete a delivery route."""
        route = self.get_object()
        
        if route.status != 'IN_PROGRESS':
            return Response({
                'error': 'Route must be in progress to complete'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if all stops are completed
        incomplete_stops = route.route_stops.exclude(status__in=('COMPLETED', 'FAILED'))
        if incomplete_stops.exists():
            return Response({
                'error': f'Finish or mark failed the remaining {incomplete_stops.count()} stop(s) first.',
                'message': f'Finish or mark failed the remaining {incomplete_stops.count()} stop(s) first.',
                'incomplete_stops': [
                    f"Stop {stop.stop_number}: {stop.shipment.shipment_number}"
                    for stop in incomplete_stops
                ]
            }, status=status.HTTP_400_BAD_REQUEST)
        
        route.status = 'COMPLETED'
        route.end_time = timezone.now()
        route.save()
        
        return Response({
            'message': 'Route completed successfully',
            'status': route.status,
            'end_time': route.end_time,
            'duration_hours': route.duration_hours
        })

    @action(detail=True, methods=['post'])
    def cancel_route(self, request, pk=None):
        route = self.get_object()
        if route.status not in ('PLANNED', 'IN_PROGRESS'):
            return error('Only planned or running routes can be cancelled.')
        route.status = 'CANCELLED'
        route.end_time = timezone.now() if route.start_time else None
        route.save()
        return Response({'message': 'Route cancelled', 'status': route.status})

    def destroy(self, request, *args, **kwargs):
        if self.get_object().status not in ('PLANNED', 'CANCELLED'):
            return error('Only planned or cancelled routes can be deleted.')
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def add_stop(self, request, pk=None):
        """Add a stop to the delivery route."""
        route = self.get_object()
        
        if route.status not in ['PLANNED', 'IN_PROGRESS']:
            return Response({
                'error': 'Cannot add stops to completed or cancelled routes'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = RouteStopSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        # Auto-assign stop number
        max_stop = route.route_stops.aggregate(max_stop=models.Max('stop_number'))['max_stop'] or 0
        save_kwargs = {'route': route, 'stop_number': max_stop + 1}

        coords = geocode_address(serializer.validated_data['address'])
        time.sleep(1)  # Nominatim rate limit: 1 req/sec
        if coords:
            save_kwargs.update(latitude=coords[0], longitude=coords[1])
        serializer.save(**save_kwargs)
        
        return Response({
            'message': 'Stop added successfully',
            'stop': serializer.data
        })

class RouteStopViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """ViewSet for RouteStop management."""
    serializer_class = RouteStopSerializer
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'route']
    search_fields = ['address', 'notes', 'shipment__shipment_number']
    ordering_fields = ['stop_number', 'estimated_arrival', 'actual_arrival']
    ordering = ['route', 'stop_number']

    def get_queryset(self):
        return RouteStop.objects.filter(
            route__company=self.request.user.company
        ).select_related('route', 'shipment')


    
    def create(self, request, *args, **kwargs):
        # Stops need a route and a stop number, which add_stop assigns
        return Response({
            'error': 'Create stops with POST /api/v1/distribution/routes/{route_id}/add_stop/'
        }, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def destroy(self, request, *args, **kwargs):
        stop = self.get_object()
        if stop.status != 'PENDING' or stop.route.status not in ('PLANNED', 'IN_PROGRESS'):
            return error('Only stops not yet visited can be removed.')
        return super().destroy(request, *args, **kwargs)

    def perform_update(self, serializer):
        address = serializer.validated_data.get('address')
        if address and address != serializer.instance.address:
            coords = geocode_address(address)
            time.sleep(1)  # Nominatim rate limit: 1 req/sec
            if coords:
                serializer.save(latitude=coords[0], longitude=coords[1])
                return
        serializer.save()

    @action(detail=True, methods=['post'])
    def arrive_at_stop(self, request, pk=None):
        """Mark arrival at a route stop."""
        stop = self.get_object()
        
        if stop.status != 'PENDING':
            return Response({
                'error': 'Stop must be pending to mark arrival'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        stop.status = 'ARRIVED'
        stop.actual_arrival = timezone.now()
        stop.save()
        record_event(stop.shipment, 'STOP_ARRIVED', actor=request.user,
                     message=f'Arrived at stop {stop.stop_number}', occurred_at=stop.actual_arrival,
                     data={'route_id': str(stop.route_id), 'stop_id': str(stop.id)})
        
        return Response({
            'message': 'Arrival marked successfully',
            'status': stop.status,
            'arrival_time': stop.actual_arrival
        })

    @action(detail=True, methods=['post'])
    def complete_stop(self, request, pk=None):
        """Complete a route stop."""
        stop = self.get_object()
        
        if stop.status != 'ARRIVED':
            return Response({
                'error': 'Must arrive at stop before completing'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        departed = timezone.now()
        try:
            with transaction.atomic():
                if stop.shipment:
                    record_event(stop.shipment, 'STOP_COMPLETED', actor=request.user,
                                 message=f'Stop {stop.stop_number} completed', occurred_at=departed,
                                 data={'route_id': str(stop.route_id), 'stop_id': str(stop.id)})
                # Deliver the shipment (shipping it first if it never left the warehouse, so stock moves)
                if stop.shipment and stop.shipment.status in services.PRE_SHIP:
                    services.ship(stop.shipment, request.user, allow_unpacked=True)
                    stop.shipment.refresh_from_db()
                if stop.shipment and stop.shipment.status == 'SHIPPED':
                    services.deliver(stop.shipment, request.user, departed)
                stop.status = 'COMPLETED'
                stop.departure_time = departed
                stop.save()
        except ShipmentError as exc:
            return error(str(exc), **exc.details)
        
        return Response({
            'message': 'Stop completed successfully',
            'status': stop.status,
            'departure_time': stop.departure_time,
            'duration_minutes': stop.stop_duration_minutes
        })

    @action(detail=True, methods=['post'])
    def fail_stop(self, request, pk=None):
        """Mark a route stop as failed."""
        stop = self.get_object()
        
        if stop.status == 'COMPLETED':
            return Response({
                'error': 'Cannot fail a completed stop'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        notes = request.data.get('notes', '')
        
        stop.status = 'FAILED'
        stop.notes = notes
        stop.save()
        record_event(stop.shipment, 'STOP_FAILED', actor=request.user,
                     message=f'Stop {stop.stop_number} failed' + (f': {notes}' if notes else ''),
                     data={'route_id': str(stop.route_id), 'stop_id': str(stop.id), 'notes': notes})
        
        return Response({
            'message': 'Stop marked as failed',
            'status': stop.status,
            'notes': stop.notes
        })