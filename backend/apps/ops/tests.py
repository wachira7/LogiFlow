import base64
from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone

from apps.distribution.models import DeliveryException, DeliveryRoute, LocationPing, RouteStop, Vehicle
from apps.ops import geo, services
from utils.testing import AuthenticatedAPITestCase, make_company, make_order, make_product, make_shipment, make_user, make_warehouse

OPS = '/api/v1/ops'
DIST = '/api/v1/distribution'
MEMORY_STORAGE = {'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
                  'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}}
# 1×1 transparent PNG, as a signature pad would send it
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
SIGNATURE = 'data:image/png;base64,' + base64.b64encode(PNG).decode()


class OpsTestCase(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.warehouse = make_warehouse(self.company)
        self.other = make_company()
        self.driver = make_user(company=self.company, is_driver=True, first_name='Juma', last_name='Otieno')

    def running_route(self, shipments=(), vehicle=None):
        route = DeliveryRoute.objects.create(company=self.company, route_name='CBD run', driver=self.driver, fleet_vehicle=vehicle,
                                             status='IN_PROGRESS', start_time=timezone.now())
        for i, s in enumerate(shipments, 1):
            RouteStop.objects.create(route=route, shipment=s, stop_number=i, address=f'{i} Moi Avenue, Nairobi', latitude=-1.28, longitude=36.82)
        return route


class SearchAndActivityTests(OpsTestCase):
    def test_search_groups_results_and_stays_in_the_company(self):
        order = make_order(self.company, customer_name='Wanjiku Stores')
        make_shipment(self.company, warehouse=self.warehouse, order=order, tracking_number='TRK-881')
        make_product(self.company, name='Wanjiku Maize')
        make_order(self.other, customer_name='Wanjiku Elsewhere')
        groups = {g['key']: g for g in self.client.get(f'{OPS}/search/?q=wanjiku').json()['groups']}
        self.assertEqual(set(groups), {'shipments', 'orders', 'products'})
        self.assertEqual([i['subtitle'] for i in groups['orders']['items']], ['Wanjiku Stores'])
        self.assertTrue(groups['shipments']['items'][0]['href'].startswith('/distribution/shipments/'))
        self.assertEqual(self.client.get(f'{OPS}/search/?q=TRK-881').json()['groups'][0]['key'], 'shipments')
        self.assertEqual(self.client.get(f'{OPS}/search/?q=w').json()['groups'], [])

    def test_activity_and_timeline(self):
        s = make_shipment(self.company, warehouse=self.warehouse, status='SHIPPED')
        self.client.post(f'{OPS}/exceptions/', {'exception_type': 'DAMAGED', 'title': 'Crushed carton', 'shipment_id': str(s.id)}, format='json')
        theirs = make_shipment(self.other)
        services.raise_exception(self.other, exception_type='LOST', title='Not ours', shipment=theirs)
        feed = self.client.get(f'{OPS}/activity/').json()['results']
        self.assertEqual([(e['type'], e['shipment']['number']) for e in feed], [('EXCEPTION_RAISED', s.shipment_number)])
        tl = self.client.get(f'{OPS}/shipments/{s.id}/timeline/').json()
        self.assertEqual(len(tl['exceptions']), 1)
        self.assertEqual(tl['shipment']['public_token'], s.public_token)
        self.assertEqual(self.client.get(f'{OPS}/shipments/{theirs.id}/timeline/').status_code, 404)


class ExceptionTests(OpsTestCase):
    def test_lifecycle(self):
        s = make_shipment(self.company, warehouse=self.warehouse, status='SHIPPED')
        r = self.client.post(f'{OPS}/exceptions/', {'exception_type': 'ADDRESS_ISSUE', 'severity': 'HIGH', 'title': 'No such plot',
                                                     'shipment_id': str(s.id)}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        eid = r.json()['id']
        self.assertEqual(r.json()['reported_by_name'], self.user.get_full_name())

        ack = self.client.post(f'{OPS}/exceptions/{eid}/acknowledge/').json()
        self.assertEqual((ack['status'], ack['owner_name']), ('ACKNOWLEDGED', self.user.get_full_name()))
        self.assertEqual(self.client.post(f'{OPS}/exceptions/{eid}/acknowledge/').status_code, 400)
        self.assertEqual(self.client.post(f'{OPS}/exceptions/{eid}/resolve/', {}, format='json').status_code, 400)  # needs notes
        done = self.client.post(f'{OPS}/exceptions/{eid}/resolve/', {'notes': 'Customer sent a pin'}, format='json').json()
        self.assertEqual((done['status'], done['resolution_notes']), ('RESOLVED', 'Customer sent a pin'))
        self.assertEqual(list(s.events.values_list('event_type', flat=True).order_by('occurred_at')), ['EXCEPTION_RAISED', 'EXCEPTION_RESOLVED'])
        self.assertEqual(self.client.patch(f'{OPS}/exceptions/{eid}/', {'title': 'x'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(f'{OPS}/exceptions/{eid}/reopen/').json()['status'], 'OPEN')
        summary = self.client.get(f'{OPS}/exceptions/summary/').json()
        self.assertEqual((summary['open'], summary['by_severity']), (1, {'HIGH': 1}))

    def test_scoped_to_company(self):
        theirs = services.raise_exception(self.other, exception_type='LOST', title='Theirs')
        self.assertEqual(self.client.get(f'{OPS}/exceptions/{theirs.id}/').status_code, 404)
        r = self.client.post(f'{OPS}/exceptions/', {'exception_type': 'LOST', 'title': 'x', 'shipment_id': str(make_shipment(self.other).id)}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_delay_sweep_is_idempotent_and_board_runs_it(self):
        late = make_shipment(self.company, warehouse=self.warehouse, status='SHIPPED', estimated_delivery=timezone.now() - timedelta(hours=30))
        make_shipment(self.company, warehouse=self.warehouse, status='SHIPPED', estimated_delivery=timezone.now() - timedelta(minutes=5))  # in grace
        board = self.client.get(f'{OPS}/board/').json()
        exc = DeliveryException.objects.get()
        self.assertEqual((exc.shipment, exc.exception_type, exc.severity), (late, 'DELAY', 'HIGH'))
        self.assertEqual(services.raise_delay_exceptions(), 0)
        self.assertEqual(board['summary']['late'], 2)
        self.assertEqual(board['summary']['open_exceptions'], 1)
        shipped = next(c for c in board['columns'] if c['key'] == 'SHIPPED')
        self.assertEqual(shipped['count'], 2)
        self.assertEqual(shipped['cards'][0]['open_exceptions'], 1)  # earliest ETA first

    def test_failed_stop_type_can_be_chosen(self):
        s = make_shipment(self.company, warehouse=self.warehouse, status='SHIPPED')
        route = self.running_route([s])
        stop = route.route_stops.get()
        self.client.post(f'{DIST}/route-stops/{stop.id}/fail_stop/', {'notes': 'Nobody home', 'reason': 'CUSTOMER_UNAVAILABLE'}, format='json')
        exc = s.exceptions.get()
        self.assertEqual((exc.exception_type, exc.route_stop, exc.route), ('CUSTOMER_UNAVAILABLE', stop, route))


class FleetTests(OpsTestCase):
    def test_vehicles(self):
        r = self.client.post(f'{OPS}/vehicles/', {'registration': 'kcd  214t', 'vehicle_type': 'VAN', 'default_driver_id': str(self.driver.id)}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['registration'], 'KCD 214T')
        self.assertEqual(self.client.post(f'{OPS}/vehicles/', {'registration': 'KCD 214T'}, format='json').status_code, 400)
        foreign = make_user(company=self.other)
        self.assertEqual(self.client.post(f'{OPS}/vehicles/', {'registration': 'KBZ 1', 'default_driver_id': str(foreign.id)}, format='json').status_code, 400)

    def test_route_lifecycle_moves_vehicle_status_and_blocks_delete(self):
        v = Vehicle.objects.create(company=self.company, registration='KCD 214T')
        route = DeliveryRoute.objects.create(company=self.company, route_name='Run', driver=self.driver)
        r = self.client.patch(f'{DIST}/routes/{route.id}/', {'fleet_vehicle_id': str(v.id)}, format='json')
        self.assertEqual(r.json()['fleet_vehicle_registration'], 'KCD 214T')
        self.client.post(f'{DIST}/routes/{route.id}/start_route/')
        v.refresh_from_db()
        self.assertEqual(v.status, 'IN_USE')
        self.assertEqual(self.client.patch(f'{OPS}/vehicles/{v.id}/', {'status': 'MAINTENANCE'}, format='json').status_code, 400)
        self.client.post(f'{DIST}/routes/{route.id}/complete_route/')
        v.refresh_from_db()
        self.assertEqual(v.status, 'AVAILABLE')
        self.assertEqual(self.client.delete(f'{OPS}/vehicles/{v.id}/').status_code, 400)  # it has a route

    def test_starting_a_route_ships_its_shipments(self):
        from apps.distribution.models import ShipmentItem
        from apps.inventory.models import InventoryItem
        product = make_product(self.company)
        InventoryItem.objects.create(product=product, warehouse=self.warehouse, quantity=10)
        ok = make_shipment(self.company, warehouse=self.warehouse)
        short = make_shipment(self.company, warehouse=self.warehouse)
        ShipmentItem.objects.create(shipment=ok, product=product, quantity=4)
        ShipmentItem.objects.create(shipment=short, product=product, quantity=40)
        route = DeliveryRoute.objects.create(company=self.company, route_name='Run', driver=self.driver)
        for i, s in enumerate((ok, short), 1):
            RouteStop.objects.create(route=route, shipment=s, stop_number=i, address='x')
        r = self.client.post(f'{DIST}/routes/{route.id}/start_route/')
        self.assertEqual(r.status_code, 400)  # not enough stock for the second one: nothing moves
        ok.refresh_from_db(); route.refresh_from_db()
        self.assertEqual((ok.status, route.status), ('PENDING', 'PLANNED'))
        self.assertEqual(InventoryItem.objects.get(product=product).quantity, 10)
        route.route_stops.filter(shipment=short).delete()
        self.assertEqual(self.client.post(f'{DIST}/routes/{route.id}/start_route/').status_code, 200)
        ok.refresh_from_db()
        self.assertEqual(ok.status, 'SHIPPED')
        self.assertEqual(InventoryItem.objects.get(product=product).quantity, 6)

    def test_vehicle_in_maintenance_cant_be_assigned(self):
        v = Vehicle.objects.create(company=self.company, registration='KBX 9', status='MAINTENANCE')
        s = make_shipment(self.company, warehouse=self.warehouse)
        self.assertEqual(self.client.patch(f'{DIST}/shipments/{s.id}/', {'vehicle_id': str(v.id)}, format='json').status_code, 400)

    def test_pings_attach_route_and_vehicle_and_show_on_fleet(self):
        v = Vehicle.objects.create(company=self.company, registration='KCD 214T', status='IN_USE')
        route = self.running_route([make_shipment(self.company, warehouse=self.warehouse, status='SHIPPED')], vehicle=v)
        self.authenticate(self.driver)
        r = self.client.post(f'{OPS}/pings/', {'latitude': -1.2864, 'longitude': 36.8172, 'speed_kmh': 32}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual((r.json()['route_id'], r.json()['vehicle']), (str(route.id), 'KCD 214T'))
        batch = [{'latitude': -1.29, 'longitude': 36.82, 'recorded_at': (timezone.now() - timedelta(minutes=m)).isoformat()} for m in (3, 2)]
        batch.append({'latitude': -1.30, 'longitude': 36.83, 'recorded_at': (timezone.now() + timedelta(hours=2)).isoformat()})  # fast clock
        self.assertEqual(self.client.post(f'{OPS}/pings/', {'pings': batch}, format='json').json()['stored'], 3)
        self.assertFalse(LocationPing.objects.filter(recorded_at__gt=timezone.now()).exists())
        self.assertEqual(self.client.post(f'{OPS}/pings/', {'latitude': 95, 'longitude': 0}, format='json').status_code, 400)
        old = (timezone.now() - timedelta(days=2)).isoformat()
        self.assertEqual(self.client.post(f'{OPS}/pings/', {'latitude': 1, 'longitude': 1, 'recorded_at': old}, format='json').status_code, 400)

        self.authenticate(self.user)
        live = self.client.get(f'{OPS}/fleet/live/').json()
        van = live['vehicles'][0]
        self.assertEqual((van['registration'], van['driver']['name'], van['route']['total']), ('KCD 214T', 'Juma Otieno', 1))
        self.assertTrue(van['last_ping']['live'])
        self.assertEqual(live['drivers'][0]['route']['id'], str(route.id))
        trail = self.client.get(f'{OPS}/routes/{route.id}/trail/').json()
        self.assertEqual(len(trail['trail']), 4)
        self.assertEqual(len(trail['stops']), 1)

    def test_driver_today(self):
        s = make_shipment(self.company, warehouse=self.warehouse, status='SHIPPED', recipient_name='Achieng', recipient_phone='+254700000001')
        self.running_route([s])
        self.authenticate(self.driver)
        day = self.client.get(f'{OPS}/driver/today/').json()
        self.assertEqual(day['route']['name'], 'CBD run')
        self.assertEqual((day['stops'][0]['shipment']['recipient'], day['stops'][0]['shipment']['phone']), ('Achieng', '+254700000001'))
        self.authenticate(self.user)
        self.assertIsNone(self.client.get(f'{OPS}/driver/today/').json()['route'])


@override_settings(STORAGES=MEMORY_STORAGE)
class ProofAndPublicTrackingTests(OpsTestCase):
    def test_proof_of_delivery(self):
        s = make_shipment(self.company, warehouse=self.warehouse, status='SHIPPED')
        url = f'{OPS}/shipments/{s.id}/proof/'
        self.assertEqual(self.client.post(url, {}, format='json').status_code, 400)
        self.assertEqual(self.client.post(url, {'signature': 'data:text/plain;base64,aGk='}, format='json').status_code, 400)
        r = self.client.post(url, {'recipient_name': 'Achieng', 'signature': SIGNATURE, 'latitude': '-1.28', 'longitude': '36.82'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json()['signature_url'])
        self.assertEqual(s.events.get(event_type='PROOF_OF_DELIVERY').message, 'Proof of delivery captured: received by Achieng')
        self.assertEqual(len(self.client.get(url).json()), 1)
        pending = make_shipment(self.company, warehouse=self.warehouse)
        self.assertEqual(self.client.post(f'{OPS}/shipments/{pending.id}/proof/', {'recipient_name': 'X'}, format='json').status_code, 400)

    def test_public_tracking_is_open_but_limited(self):
        order = make_order(self.company, customer_name='Achieng Odhiambo', shipping_address='Plot 7, Ngong Road, Kilimani, Nairobi')
        s = make_shipment(self.company, warehouse=self.warehouse, order=order, status='SHIPPED', recipient_phone='+254700000001')
        route = self.running_route([make_shipment(self.company, warehouse=self.warehouse, status='SHIPPED'), s])
        LocationPing.objects.create(company=self.company, driver=self.driver, route=route, latitude=-1.3, longitude=36.78, recorded_at=timezone.now())
        self.client.credentials()  # signed out
        r = self.client.get(f'/api/v1/public/track/{s.public_token}/')
        self.assertEqual(r.status_code, 200, r.content)
        data = r.json()
        self.assertEqual((data['recipient_first_name'], data['destination_area']), ('Achieng', 'Kilimani, Nairobi'))
        self.assertEqual(data['live']['stops_before_you'], 1)
        self.assertIsNotNone(data['live']['eta_minutes'])
        self.assertEqual([st['done'] for st in data['steps']], [True, True, True, True, False])
        s.refresh_from_db()
        from apps.distribution.events import record_event
        record_event(s, 'STOP_FAILED', message='Stop 2 failed: gate locked, guard rude')
        body = self.client.get(f'/api/v1/public/track/{s.public_token}/').content.decode()
        self.assertIn('We couldn’t complete the delivery', body)
        for private in ('+254700000001', 'Plot 7', self.driver.email, 'guard rude'):
            self.assertNotIn(private, body)
        self.assertEqual(self.client.get('/api/v1/public/track/not-a-real-token/').status_code, 404)
        self.company.is_active = False
        self.company.save()
        self.assertEqual(self.client.get(f'/api/v1/public/track/{s.public_token}/').status_code, 404)

    def test_stale_position_isnt_shown_publicly(self):
        s = make_shipment(self.company, warehouse=self.warehouse, status='SHIPPED')
        route = self.running_route([s])
        LocationPing.objects.create(company=self.company, driver=self.driver, route=route, latitude=-1.3, longitude=36.78,
                                    recorded_at=timezone.now() - timedelta(hours=1))
        self.client.credentials()
        self.assertIsNone(self.client.get(f'/api/v1/public/track/{s.public_token}/').json()['live'])


class GeoTests(OpsTestCase):
    def test_travel_minutes_straight_line(self):
        # Nairobi CBD to Westlands is ~3.5 km in a straight line
        minutes = geo.travel_minutes((-1.2864, 36.8172), (-1.2676, 36.8108))
        self.assertTrue(5 <= minutes <= 15, minutes)
        self.assertIsNone(geo.travel_minutes(None, (1, 1)))

    @patch('apps.ops.geo.time.sleep')
    @patch('apps.ops.geo.requests.get')
    def test_geocode_is_cached_and_never_raises(self, get, _sleep):
        get.return_value = MagicMock(json=lambda: [{'lat': '-1.28', 'lon': '36.82'}], raise_for_status=lambda: None)
        self.assertEqual(geo.geocode('Moi Avenue, Nairobi'), (-1.28, 36.82))
        self.assertEqual(geo.geocode('moi avenue, nairobi'), (-1.28, 36.82))
        self.assertEqual(get.call_count, 1)
        get.side_effect = ConnectionError('offline')
        self.assertIsNone(geo.geocode('Somewhere new'))
        with self.settings(GEO_PROVIDER='none'):
            self.assertIsNone(geo.geocode('Anything'))
