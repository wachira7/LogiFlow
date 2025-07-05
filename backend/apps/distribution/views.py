# apps/distribution/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Sum, Count, Avg , Max
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from .models import CustomerOrder, OrderItem, Shipment, ShipmentItem, DeliveryRoute, RouteStop
from .serializers import (
    CustomerOrderListSerializer, CustomerOrderDetailSerializer, CreateCustomerOrderSerializer,
    ShipmentListSerializer, ShipmentDetailSerializer, DeliveryRouteListSerializer,
    DeliveryRouteDetailSerializer, RouteStopSerializer
)
from utils.mixins import TenantViewSetMixin, BulkActionMixin
from utils.permissions import IsCompanyMember, IsSameCompany

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
        ).prefetch_related('order_items__product')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateCustomerOrderSerializer
        elif self.action == 'retrieve':
            return CustomerOrderDetailSerializer
        return CustomerOrderListSerializer

    @action(detail=True, methods=['post'])
    def process_order(self, request, pk=None):
        """Move order from NEW to PROCESSING status."""
        order = self.get_object()
        
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
        """Create shipment for an order."""
        order = self.get_object()
        
        if order.status not in ['PROCESSING']:
            return Response({
                'error': 'Order must be in PROCESSING status to ship'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        warehouse_id = request.data.get('warehouse_id')
        if not warehouse_id:
            return Response({
                'error': 'Warehouse ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from apps.inventory.models import Warehouse
            warehouse = Warehouse.objects.get(id=warehouse_id, company=self.request.user.company)
        except Warehouse.DoesNotExist:
            return Response({
                'error': 'Warehouse not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        with transaction.atomic():
            # Create shipment
            shipment = Shipment.objects.create(
                company=order.company,
                shipment_number=f"SH-{order.order_number}",
                order=order,
                warehouse=warehouse,
                status='PENDING'
            )
            
            # Create shipment items from order items
            for order_item in order.order_items.all():
                ShipmentItem.objects.create(
                    shipment=shipment,
                    order_item=order_item,
                    product=order_item.product,
                    quantity=order_item.quantity
                )
            
            # Update order status
            order.status = 'SHIPPED'
            order.save()
        
        return Response({
            'message': 'Shipment created successfully',
            'shipment_id': str(shipment.id),
            'shipment_number': shipment.shipment_number
        })

    @action(detail=True, methods=['post'])
    def cancel_order(self, request, pk=None):
        """Cancel a customer order."""
        order = self.get_object()
        
        if order.status in ['SHIPPED', 'DELIVERED']:
            return Response({
                'error': 'Cannot cancel shipped or delivered orders'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        order.status = 'CANCELLED'
        order.save()
        
        return Response({
            'message': 'Order cancelled successfully',
            'status': order.status
        })

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
        if self.action == 'retrieve':
            return ShipmentDetailSerializer
        return ShipmentListSerializer

    @action(detail=True, methods=['post'])
    def pick_shipment(self, request, pk=None):
        """Mark shipment as picked."""
        shipment = self.get_object()
        
        if shipment.status != 'PENDING':
            return Response({
                'error': 'Shipment must be in PENDING status to pick'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        shipment.status = 'PICKED'
        shipment.save()
        
        return Response({
            'message': 'Shipment marked as picked',
            'status': shipment.status
        })

    @action(detail=True, methods=['post'])
    def pack_shipment(self, request, pk=None):
        """Mark shipment as packed."""
        shipment = self.get_object()
        
        if shipment.status != 'PICKED':
            return Response({
                'error': 'Shipment must be picked before packing'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        shipment.status = 'PACKED'
        shipment.save()
        
        return Response({
            'message': 'Shipment marked as packed',
            'status': shipment.status
        })

    @action(detail=True, methods=['post'])
    def ship_shipment(self, request, pk=None):
        """Mark shipment as shipped."""
        shipment = self.get_object()
        
        if shipment.status != 'PACKED':
            return Response({
                'error': 'Shipment must be packed before shipping'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update shipment details
        tracking_number = request.data.get('tracking_number')
        carrier = request.data.get('carrier')
        estimated_delivery = request.data.get('estimated_delivery')
        
        shipment.status = 'SHIPPED'
        shipment.shipping_date = timezone.now()
        
        if tracking_number:
            shipment.tracking_number = tracking_number
        if carrier:
            shipment.carrier = carrier
        if estimated_delivery:
            shipment.estimated_delivery = estimated_delivery
        
        shipment.save()
        
        return Response({
            'message': 'Shipment shipped successfully',
            'status': shipment.status,
            'tracking_number': shipment.tracking_number
        })

    @action(detail=True, methods=['post'])
    def deliver_shipment(self, request, pk=None):
        """Mark shipment as delivered."""
        shipment = self.get_object()
        
        if shipment.status != 'SHIPPED':
            return Response({
                'error': 'Shipment must be shipped before delivery'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        shipment.status = 'DELIVERED'
        shipment.actual_delivery = timezone.now()
        shipment.save()
        
        # Update order status if all shipments are delivered
        if shipment.order:
            all_delivered = all(
                s.status == 'DELIVERED' 
                for s in shipment.order.shipments.all()
            )
            if all_delivered:
                shipment.order.status = 'DELIVERED'
                shipment.order.save()
        
        return Response({
            'message': 'Shipment delivered successfully',
            'status': shipment.status,
            'delivery_time': shipment.actual_delivery
        })

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
        
        return Response({
            'pending_shipments': pending_shipments,
            'picked_shipments': picked_shipments,
            'packed_shipments': packed_shipments,
            'shipped_shipments': shipped_shipments,
            'delivered_shipments': delivered_shipments,
            'delayed_shipments': delayed_shipments,
            'average_delivery_days': round(avg_delivery_days, 1)
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
        if self.action == 'retrieve':
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
        incomplete_stops = route.route_stops.exclude(status='COMPLETED')
        if incomplete_stops.exists():
            return Response({
                'error': f'Cannot complete route. {incomplete_stops.count()} stops are incomplete.',
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
        serializer.save(route=route, stop_number=max_stop + 1)
        
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
        
        stop.status = 'COMPLETED'
        stop.departure_time = timezone.now()
        stop.save()
        
        # Mark associated shipment as delivered
        if stop.shipment:
            stop.shipment.status = 'DELIVERED'
            stop.shipment.actual_delivery = stop.departure_time
            stop.shipment.save()
        
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
        
        notes = request.data.get('notes', '')
        
        stop.status = 'FAILED'
        stop.notes = notes
        stop.save()
        
        return Response({
            'message': 'Stop marked as failed',
            'status': stop.status,
            'notes': stop.notes
        })