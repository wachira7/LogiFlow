# apps/ops/views.py
"""
Operations endpoints: global search, activity feed, ops board, exceptions, fleet and live
positions, driver location pings, proof of delivery, the driver's day and public tracking.
"""
from datetime import timedelta

from django.core.cache import cache
from django.db.models import Count, F, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from apps.distribution.models import (
    CustomerOrder, DeliveryException, DeliveryRoute, LocationPing, RouteStop, Shipment, ShipmentEvent, Vehicle,
)
from apps.inventory.models import Product, Warehouse
from apps.users.models import User
from utils.mixins import TenantViewSetMixin
from utils.permissions import IsCompanyMember, IsSameCompany

from . import services
from .serializers import ExceptionSerializer, PingBatchSerializer, PingSerializer, VehicleSerializer
from .services import OpsError


def error(message, status_code=status.HTTP_400_BAD_REQUEST):
    return Response({'error': message, 'message': message}, status=status_code)


class OpsView(APIView):
    permission_classes = [IsCompanyMember]

    @property
    def company(self):
        return self.request.user.company


def _shipment_card(s, open_exceptions):
    # shipments on a route are driven by the route's driver and vehicle
    stop = next(iter(s.route_stops.all()), None)
    route = stop.route if stop else None
    driver = s.driver or (route.driver if route else None)
    vehicle = s.vehicle.registration if s.vehicle_id else (route.fleet_vehicle.registration if route and route.fleet_vehicle_id else None)
    return {
        'id': str(s.id), 'number': s.shipment_number, 'status': s.status,
        'customer': (s.order.customer_name if s.order_id else '') or s.recipient_name,
        'destination': s.destination_address or (s.order.shipping_address if s.order_id else ''),
        'driver': driver.get_full_name() if driver else None,
        'vehicle': vehicle,
        'route': {'id': str(route.id), 'name': route.route_name, 'stop': stop.stop_number} if route else None,
        'estimated_delivery': s.estimated_delivery, 'actual_delivery': s.actual_delivery,
        'is_delayed': s.is_delayed, 'open_exceptions': open_exceptions.get(s.id, 0), 'updated_at': s.updated_at,
    }


# ── search ──────────────────────────────────────────────────────────────────

class SearchView(OpsView):
    """GET /ops/search/?q= — grouped matches across the company, with where to open each one."""
    LIMIT = 5

    def get(self, request):
        q = (request.query_params.get('q') or '').strip()
        if len(q) < 2:
            return Response({'query': q, 'groups': []})
        c, n = self.company, self.LIMIT
        groups = []

        def add(key, label, rows):
            if rows:
                groups.append({'key': key, 'label': label, 'items': rows})

        add('shipments', 'Shipments', [
            {'id': str(s.id), 'title': s.shipment_number, 'subtitle': ' · '.join(filter(None, [(s.order.customer_name if s.order_id else s.recipient_name), s.tracking_number])),
             'status': s.status, 'href': f'/distribution/shipments/{s.id}'}
            for s in Shipment.objects.filter(company=c).filter(
                Q(shipment_number__icontains=q) | Q(tracking_number__icontains=q) | Q(recipient_name__icontains=q)
                | Q(order__order_number__icontains=q) | Q(order__customer_name__icontains=q)).select_related('order')[:n]])
        add('orders', 'Orders', [
            {'id': str(o.id), 'title': o.order_number, 'subtitle': o.customer_name, 'status': o.status, 'href': f'/distribution/orders/{o.id}'}
            for o in CustomerOrder.objects.filter(company=c).filter(
                Q(order_number__icontains=q) | Q(customer_name__icontains=q) | Q(customer_email__icontains=q) | Q(customer_phone__icontains=q))[:n]])
        add('products', 'Products', [
            {'id': str(p.id), 'title': p.name, 'subtitle': p.sku, 'status': None if p.is_active else 'INACTIVE', 'href': f'/inventory/products/{p.id}'}
            for p in Product.objects.filter(company=c).filter(Q(name__icontains=q) | Q(sku__icontains=q) | Q(barcode__icontains=q))[:n]])
        add('routes', 'Routes', [
            {'id': str(r.id), 'title': r.route_name, 'subtitle': r.driver.get_full_name() if r.driver_id else 'No driver', 'status': r.status, 'href': f'/distribution/routes/{r.id}'}
            for r in DeliveryRoute.objects.filter(company=c, route_name__icontains=q).select_related('driver')[:n]])
        add('exceptions', 'Exceptions', [
            {'id': str(e.id), 'title': e.title, 'subtitle': e.get_exception_type_display(), 'status': e.status, 'href': f'/ops/exceptions?open={e.id}'}
            for e in DeliveryException.objects.filter(company=c).filter(Q(title__icontains=q) | Q(description__icontains=q))[:n]])
        add('vehicles', 'Vehicles', [
            {'id': str(v.id), 'title': v.registration, 'subtitle': v.name or v.get_vehicle_type_display(), 'status': v.status, 'href': f'/ops/fleet?vehicle={v.id}'}
            for v in Vehicle.objects.filter(company=c).filter(Q(registration__icontains=q) | Q(name__icontains=q))[:n]])
        add('warehouses', 'Warehouses', [
            {'id': str(w.id), 'title': w.name, 'subtitle': w.city or w.address, 'status': None if w.is_active else 'INACTIVE', 'href': f'/inventory/warehouses/{w.id}'}
            for w in Warehouse.objects.filter(company=c).filter(Q(name__icontains=q) | Q(code__icontains=q) | Q(city__icontains=q))[:n]])
        add('people', 'People', [
            {'id': str(u.id), 'title': u.get_full_name() or u.email, 'subtitle': u.email, 'status': None, 'href': '/company/users'}
            for u in User.objects.filter(company=c, is_active=True).filter(
                Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(email__icontains=q))[:n]])
        return Response({'query': q, 'groups': groups})


# ── activity & timelines ────────────────────────────────────────────────────

def _event(e):
    return {'id': str(e.id), 'type': e.event_type, 'message': e.message, 'from_status': e.from_status, 'to_status': e.to_status,
            'actor': e.actor.get_full_name() if e.actor_id else None, 'occurred_at': e.occurred_at,
            'shipment': {'id': str(e.shipment_id), 'number': e.shipment.shipment_number}}


class ActivityView(OpsView):
    """GET /ops/activity/?limit=&before= — what just happened across all shipments, newest first."""

    def get(self, request):
        limit = min(int(request.query_params.get('limit') or 30), 100)
        qs = ShipmentEvent.objects.filter(company=self.company).select_related('actor', 'shipment')
        if before := request.query_params.get('before'):
            qs = qs.filter(occurred_at__lt=before)
        if kind := request.query_params.get('type'):
            qs = qs.filter(event_type=kind)
        rows = list(qs.order_by('-occurred_at')[:limit + 1])
        return Response({'results': [_event(e) for e in rows[:limit]], 'has_more': len(rows) > limit})


class ShipmentTimelineView(OpsView):
    """GET /ops/shipments/{id}/timeline/ — full history, proofs and exceptions of one shipment."""

    def get(self, request, pk):
        s = get_object_or_404(Shipment.objects.select_related('order'), pk=pk, company=self.company)
        return Response({
            'shipment': {'id': str(s.id), 'number': s.shipment_number, 'status': s.status, 'public_token': s.public_token},
            'events': [_event(e) for e in s.events.select_related('actor', 'shipment').order_by('-occurred_at')],
            'proofs': [services.proof_payload(p, request) for p in s.proofs.select_related('captured_by')],
            'exceptions': ExceptionSerializer(s.exceptions.select_related('owner', 'reported_by', 'resolved_by', 'route', 'shipment'),
                                              many=True, context={'request': request}).data,
        })


class RouteTrailView(OpsView):
    """GET /ops/routes/{id}/trail/ — the driver's GPS trail and the stops, for drawing a route map."""

    def get(self, request, pk):
        route = get_object_or_404(DeliveryRoute.objects.select_related('driver', 'fleet_vehicle'), pk=pk, company=self.company)
        pings = route.location_pings.order_by('recorded_at').values_list('latitude', 'longitude', 'recorded_at')
        trail = [{'latitude': float(a), 'longitude': float(b), 'recorded_at': t} for a, b, t in pings[:5000]]
        return Response({
            'route': services.route_progress(route),
            'driver': route.driver.get_full_name() if route.driver_id else None,
            'vehicle': route.fleet_vehicle.registration if route.fleet_vehicle_id else None,
            'last_position': trail[-1] if trail else None,
            'trail': trail,
            'stops': [{'id': str(s.id), 'number': s.stop_number, 'address': s.address, 'status': s.status,
                       'latitude': float(s.latitude) if s.latitude is not None else None,
                       'longitude': float(s.longitude) if s.longitude is not None else None,
                       'shipment_number': s.shipment.shipment_number, 'actual_arrival': s.actual_arrival}
                      for s in route.route_stops.select_related('shipment').order_by('stop_number')],
        })


# ── ops board ───────────────────────────────────────────────────────────────

class BoardView(OpsView):
    """GET /ops/board/ — shipments in flight by stage, today's numbers and what needs attention."""
    COLUMNS = [('PENDING', 'To pick'), ('PICKED', 'To pack'), ('PACKED', 'Ready to ship'), ('SHIPPED', 'On the road'),
               ('DELIVERED', 'Delivered today'), ('FAILED', 'Failed')]
    CARDS = 30

    def get(self, request):
        c = self.company
        # Delay exceptions are also raised by a periodic task; sweeping here keeps the board right without it
        if cache.add(f'ops:delay-sweep:{c.id}', 1, 300):
            services.raise_delay_exceptions(company=c)
        now = timezone.now()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        active_stops = Prefetch('route_stops', queryset=RouteStop.objects.exclude(route__status='CANCELLED')
                                .select_related('route__driver', 'route__fleet_vehicle').order_by('-created_at'))
        base = Shipment.objects.filter(company=c).select_related('order', 'driver', 'vehicle').prefetch_related(active_stops)
        open_exc = dict(DeliveryException.objects.filter(company=c, status__in=DeliveryException.OPEN_STATUSES, shipment__isnull=False)
                        .values_list('shipment').annotate(n=Count('id')))
        columns = []
        for key, label in self.COLUMNS:
            qs = base.filter(status=key)
            if key == 'DELIVERED':
                qs = qs.filter(actual_delivery__gte=start)
            order = ('estimated_delivery', 'created_at') if key == 'SHIPPED' else ('-updated_at',) if key in ('DELIVERED', 'FAILED') else ('created_at',)
            columns.append({'key': key, 'label': label, 'count': qs.count(),
                            'cards': [_shipment_card(s, open_exc) for s in qs.order_by(*order)[:self.CARDS]]})

        delivered_today = base.filter(status='DELIVERED', actual_delivery__gte=start)
        with_eta = delivered_today.filter(estimated_delivery__isnull=False)
        on_time = with_eta.filter(actual_delivery__lte=F('estimated_delivery')).count()
        exc = DeliveryException.objects.filter(company=c, status__in=DeliveryException.OPEN_STATUSES)
        sev = dict(exc.values_list('severity').annotate(n=Count('id')))
        routes = DeliveryRoute.objects.filter(company=c, status='IN_PROGRESS').select_related('driver', 'fleet_vehicle')
        return Response({
            'generated_at': now,
            'summary': {
                'in_flight': base.filter(status__in=('PENDING', 'PICKED', 'PACKED', 'SHIPPED')).count(),
                'late': base.filter(status='SHIPPED', estimated_delivery__lt=now).count(),
                'delivered_today': delivered_today.count(),
                'on_time_today': round(on_time / with_eta.count() * 100) if with_eta.exists() else None,
                'open_exceptions': sum(sev.values()),
                'critical_exceptions': sev.get('CRITICAL', 0) + sev.get('HIGH', 0),
                'routes_running': routes.count(),
            },
            'columns': columns,
            'routes': [{**services.route_progress(r), 'driver': r.driver.get_full_name() if r.driver_id else None,
                        'vehicle': r.fleet_vehicle.registration if r.fleet_vehicle_id else r.vehicle_id or None,
                        'started_at': r.start_time,
                        'last_position': services.ping_payload(services.last_ping(route=r))} for r in routes],
            'exceptions': ExceptionSerializer(exc.select_related('shipment', 'route', 'owner', 'reported_by', 'resolved_by')
                                              .order_by('-created_at')[:8], many=True, context={'request': request}).data,
        })


# ── exceptions ──────────────────────────────────────────────────────────────

SEVERITY_ORDER = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}


class ExceptionViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ExceptionSerializer
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'severity', 'exception_type', 'shipment', 'route', 'owner']
    search_fields = ['title', 'description', 'shipment__shipment_number']
    ordering_fields = ['created_at', 'severity', 'updated_at']
    ordering = ['-created_at']
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = DeliveryException.objects.filter(company=self.request.user.company).select_related(
            'shipment', 'route', 'owner', 'reported_by', 'resolved_by')
        if self.request.query_params.get('open') == 'true':
            qs = qs.filter(status__in=DeliveryException.OPEN_STATUSES)
        if self.request.query_params.get('mine') == 'true':
            qs = qs.filter(owner=self.request.user)
        return qs

    def perform_create(self, serializer):
        d = serializer.validated_data
        c = self.request.user.company
        serializer.instance = services.raise_exception(
            c, user=self.request.user, exception_type=d['exception_type'], title=d['title'], severity=d.get('severity', 'MEDIUM'),
            description=d.get('description', ''), recommended_action=d.get('recommended_action', ''),
            shipment=Shipment.objects.filter(id=d.get('shipment_id'), company=c).first() if d.get('shipment_id') else None,
            route=DeliveryRoute.objects.filter(id=d.get('route_id'), company=c).first() if d.get('route_id') else None,
            owner=User.objects.filter(id=d.get('owner_id'), company=c).first() if d.get('owner_id') else None,
        )

    def _set(self, request, new_status):
        try:
            exc = services.set_exception_status(self.get_object(), new_status, request.user, (request.data.get('notes') or '').strip())
        except OpsError as e:
            return error(str(e))
        return Response(self.get_serializer(exc).data)

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        return self._set(request, 'ACKNOWLEDGED')

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        if not (request.data.get('notes') or '').strip():
            return error('Say how it was resolved, so the team knows.')
        return self._set(request, 'RESOLVED')

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        return self._set(request, 'DISMISSED')

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        return self._set(request, 'OPEN')

    @action(detail=False, methods=['get'])
    def summary(self, request):
        qs = DeliveryException.objects.filter(company=request.user.company)
        open_qs = qs.filter(status__in=DeliveryException.OPEN_STATUSES)
        week = timezone.now() - timedelta(days=7)
        resolved = qs.filter(status='RESOLVED', resolved_at__gte=week)
        mins = [(e.resolved_at - e.created_at).total_seconds() / 60 for e in resolved.only('created_at', 'resolved_at')[:500]]
        return Response({
            'open': open_qs.count(),
            'unassigned': open_qs.filter(owner__isnull=True).count(),
            'by_severity': dict(open_qs.values_list('severity').annotate(n=Count('id'))),
            'by_type': dict(open_qs.values_list('exception_type').annotate(n=Count('id'))),
            'resolved_7d': resolved.count(),
            'median_minutes_to_resolve': sorted(mins)[len(mins) // 2] if mins else None,
        })


# ── fleet ───────────────────────────────────────────────────────────────────

class VehicleViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [IsCompanyMember, IsSameCompany]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'vehicle_type', 'default_driver']
    search_fields = ['registration', 'name']
    ordering = ['registration']

    def get_queryset(self):
        return Vehicle.objects.filter(company=self.request.user.company).select_related('default_driver')

    def destroy(self, request, *args, **kwargs):
        v = self.get_object()
        if v.shipments.exists() or v.routes.exists() or v.location_pings.exists():
            return error(f'{v.registration} has delivery history, so it can’t be deleted. Set it to inactive instead.')
        return super().destroy(request, *args, **kwargs)


class FleetLiveView(OpsView):
    """GET /ops/fleet/live/ — every vehicle and driver with their last position and current route."""

    def get(self, request):
        c = self.company
        since = timezone.now() - timedelta(hours=24)
        running = {r.fleet_vehicle_id: r for r in DeliveryRoute.objects.filter(company=c, status='IN_PROGRESS', fleet_vehicle__isnull=False)}
        vehicles = []
        for v in Vehicle.objects.filter(company=c).exclude(status='INACTIVE').select_related('default_driver'):
            route = running.get(v.id)
            driver = route.driver if route and route.driver_id else v.default_driver
            vehicles.append({
                'id': str(v.id), 'registration': v.registration, 'name': v.name, 'type': v.vehicle_type, 'type_label': v.get_vehicle_type_display(),
                'status': v.status, 'driver': {'id': str(driver.id), 'name': driver.get_full_name()} if driver else None,
                'route': services.route_progress(route),
                'last_ping': services.ping_payload(services.last_ping(vehicle=v, recorded_at__gte=since)),
            })
        drivers = []
        for d in User.objects.filter(company=c, is_driver=True, is_active=True):
            route = services.active_route_for(driver=d)
            drivers.append({'id': str(d.id), 'name': d.get_full_name() or d.email, 'phone': d.phone_number,
                            'route': services.route_progress(route),
                            'last_ping': services.ping_payload(services.last_ping(driver=d, recorded_at__gte=since))})
        return Response({'generated_at': timezone.now(), 'vehicles': vehicles, 'drivers': drivers})


class PingThrottle(UserRateThrottle):
    scope = 'location_pings'


class PingView(OpsView):
    """POST /ops/pings/ — a driver's device reports its position (one, or a buffered batch)."""
    throttle_classes = [PingThrottle]

    def post(self, request):
        if 'pings' in request.data:
            s = PingBatchSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            rows = s.validated_data['pings']
        else:
            s = PingSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            rows = [s.validated_data]
        pings, route, vehicle = services.record_pings(request.user, rows)
        latest = max(pings, key=lambda p: p.recorded_at)
        return Response({'stored': len(pings), 'route_id': str(route.id) if route else None,
                         'vehicle': vehicle.registration if vehicle else None,
                         'last': services.ping_payload(latest)}, status=status.HTTP_201_CREATED)


# ── proof of delivery & the driver's day ────────────────────────────────────

class ProofView(OpsView):
    """GET/POST /ops/shipments/{id}/proof/ — signature (data URL or file), photo, recipient and position."""
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        s = get_object_or_404(Shipment, pk=pk, company=self.company)
        return Response([services.proof_payload(p, request) for p in s.proofs.select_related('captured_by')])

    def post(self, request, pk):
        s = get_object_or_404(Shipment, pk=pk, company=self.company)
        d = request.data
        stop = None
        if d.get('stop_id'):
            stop = RouteStop.objects.filter(pk=d['stop_id'], shipment=s, route__company=self.company).first()
            if stop is None:
                return error('That stop isn’t for this shipment.')

        def coord(key, limit):
            try:
                v = float(d.get(key)) if d.get(key) not in (None, '') else None
            except (TypeError, ValueError):
                return None
            return round(v, 6) if v is not None and -limit <= v <= limit else None
        try:
            proof = services.capture_proof(
                s, request.user, recipient_name=d.get('recipient_name') or '', signature=request.FILES.get('signature') or d.get('signature'),
                photo=request.FILES.get('photo'), latitude=coord('latitude', 90), longitude=coord('longitude', 180),
                notes=d.get('notes') or '', stop=stop)
        except OpsError as e:
            return error(str(e))
        return Response(services.proof_payload(proof, request), status=status.HTTP_201_CREATED)


class DriverTodayView(OpsView):
    """GET /ops/driver/today/ — the signed-in driver's running (or next) route with everything needed at each stop."""

    def get(self, request):
        user = request.user
        routes = DeliveryRoute.objects.filter(company=self.company, driver=user)
        route = routes.filter(status='IN_PROGRESS').order_by('-start_time').first() or routes.filter(status='PLANNED').order_by('created_at').first()
        if not route:
            return Response({'route': None, 'stops': [], 'upcoming': 0})
        stops = []
        for st in route.route_stops.select_related('shipment', 'shipment__order').order_by('stop_number'):
            s = st.shipment
            stops.append({
                'id': str(st.id), 'number': st.stop_number, 'status': st.status, 'address': st.address, 'notes': st.notes,
                'latitude': float(st.latitude) if st.latitude is not None else None,
                'longitude': float(st.longitude) if st.longitude is not None else None,
                'actual_arrival': st.actual_arrival, 'departure_time': st.departure_time,
                'shipment': {'id': str(s.id), 'number': s.shipment_number, 'status': s.status,
                             'recipient': s.recipient_name or (s.order.customer_name if s.order_id else ''),
                             'phone': s.recipient_phone or (s.order.customer_phone if s.order_id else ''),
                             'items': sum(i.quantity for i in s.shipment_items.all()), 'notes': s.notes,
                             'has_proof': s.proofs.exists()},
            })
        return Response({'route': {**services.route_progress(route), 'vehicle': route.fleet_vehicle.registration if route.fleet_vehicle_id else route.vehicle_id,
                                   'start_location': route.start_location, 'notes': route.notes, 'started_at': route.start_time},
                         'stops': stops, 'upcoming': routes.filter(status='PLANNED').exclude(pk=route.pk).count()})


# ── public tracking (no login) ──────────────────────────────────────────────

class PublicTrackingThrottle(AnonRateThrottle):
    scope = 'public_tracking'


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@throttle_classes([PublicTrackingThrottle])
def public_track(request, token):
    shipment = Shipment.objects.select_related('company', 'order').filter(public_token=token).first()
    if shipment is None or not shipment.company.is_active:
        return error('We couldn’t find that shipment. Check the link you were sent.', status.HTTP_404_NOT_FOUND)
    return Response(services.public_tracking(shipment, request))
