from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone

from apps.distribution.models import DeliveryRoute, OrderItem, RouteStop, Shipment
from utils.testing import (
    AuthenticatedAPITestCase, make_company, make_order, make_product, make_shipment, make_user, make_warehouse,
)

BASE = '/api/v1/distribution'


class TenantIsolationTests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.own_order = make_order(self.company)
        self.own_shipment = make_shipment(self.company)
        other = make_company()
        self.other_order = make_order(other)
        self.other_shipment = make_shipment(other)

    def test_lists_only_show_own_company(self):
        orders = self.results(self.client.get(f'{BASE}/orders/'))
        shipments = self.results(self.client.get(f'{BASE}/shipments/'))
        self.assertEqual([o['id'] for o in orders], [str(self.own_order.id)])
        self.assertEqual([s['id'] for s in shipments], [str(self.own_shipment.id)])

    def test_cannot_retrieve_other_company_objects(self):
        self.assertEqual(self.client.get(f'{BASE}/orders/{self.other_order.id}/').status_code, 404)
        self.assertEqual(self.client.get(f'{BASE}/shipments/{self.other_shipment.id}/').status_code, 404)

    def test_requires_authentication(self):
        self.client.credentials()
        self.assertEqual(self.client.get(f'{BASE}/shipments/').status_code, 401)


class OrderLifecycleTests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.warehouse = make_warehouse(self.company)
        self.product = make_product(self.company)
        self.order = make_order(self.company)
        OrderItem.objects.create(order=self.order, product=self.product, quantity=3,
                                 unit_price=self.product.unit_price, total_price=self.product.unit_price * 3)

    def test_process_then_ship_creates_shipment_with_items(self):
        r = self.client.post(f'{BASE}/orders/{self.order.id}/process_order/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['status'], 'PROCESSING')

        r = self.client.post(f'{BASE}/orders/{self.order.id}/ship_order/', {'warehouse_id': str(self.warehouse.id)})
        self.assertEqual(r.status_code, 200)
        shipment = Shipment.objects.get(id=r.json()['shipment_id'])
        self.assertEqual(shipment.order, self.order)
        self.assertEqual(shipment.shipment_items.get().quantity, 3)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'SHIPPED')

    def test_ship_requires_processing_status(self):
        r = self.client.post(f'{BASE}/orders/{self.order.id}/ship_order/', {'warehouse_id': str(self.warehouse.id)})
        self.assertEqual(r.status_code, 400)

    def test_ship_rejects_other_company_warehouse(self):
        self.order.status = 'PROCESSING'
        self.order.save()
        foreign = make_warehouse(make_company())
        r = self.client.post(f'{BASE}/orders/{self.order.id}/ship_order/', {'warehouse_id': str(foreign.id)})
        self.assertEqual(r.status_code, 404)

    def test_cancel_blocked_after_shipping(self):
        self.order.status = 'SHIPPED'
        self.order.save()
        self.assertEqual(self.client.post(f'{BASE}/orders/{self.order.id}/cancel_order/').status_code, 400)

    def test_cancel_new_order(self):
        r = self.client.post(f'{BASE}/orders/{self.order.id}/cancel_order/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['status'], 'CANCELLED')

    def test_dashboard_counts(self):
        make_order(self.company, status='PROCESSING')
        data = self.client.get(f'{BASE}/orders/dashboard/').json()
        self.assertEqual(data['total_orders'], 2)
        self.assertEqual(data['new_orders'], 1)
        self.assertEqual(data['processing_orders'], 1)


class ShipmentTests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.warehouse = make_warehouse(self.company)

    def test_create_shipment(self):
        r = self.client.post(f'{BASE}/shipments/', {
            'shipment_number': 'SH-NEW-1',
            'warehouse_id': str(self.warehouse.id),
            'carrier': 'G4S',
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        shipment = Shipment.objects.get(shipment_number='SH-NEW-1')
        self.assertEqual(shipment.company, self.company)
        self.assertEqual(shipment.warehouse, self.warehouse)

    def test_create_shipment_rejects_other_company_warehouse(self):
        foreign = make_warehouse(make_company())
        r = self.client.post(f'{BASE}/shipments/', {
            'shipment_number': 'SH-NEW-2', 'warehouse_id': str(foreign.id),
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_create_shipment_with_driver(self):
        driver = make_user(company=self.company, is_driver=True)
        r = self.client.post(f'{BASE}/shipments/', {
            'shipment_number': 'SH-NEW-3', 'warehouse_id': str(self.warehouse.id), 'driver_id': str(driver.id),
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(Shipment.objects.get(shipment_number='SH-NEW-3').driver, driver)

    def test_full_status_flow(self):
        shipment = make_shipment(self.company, warehouse=self.warehouse)
        url = f'{BASE}/shipments/{shipment.id}'
        self.assertEqual(self.client.post(f'{url}/pick_shipment/').json()['status'], 'PICKED')
        self.assertEqual(self.client.post(f'{url}/pack_shipment/').json()['status'], 'PACKED')
        r = self.client.post(f'{url}/ship_shipment/', {'tracking_number': 'TRK-1', 'carrier': 'DHL'})
        self.assertEqual(r.json()['status'], 'SHIPPED')
        self.assertEqual(self.client.post(f'{url}/deliver_shipment/').json()['status'], 'DELIVERED')
        shipment.refresh_from_db()
        self.assertIsNotNone(shipment.shipping_date)
        self.assertIsNotNone(shipment.actual_delivery)

    def test_status_steps_cannot_be_skipped(self):
        shipment = make_shipment(self.company, warehouse=self.warehouse)
        self.assertEqual(self.client.post(f'{BASE}/shipments/{shipment.id}/ship_shipment/').status_code, 400)
        self.assertEqual(self.client.post(f'{BASE}/shipments/{shipment.id}/deliver_shipment/').status_code, 400)

    def test_delivering_last_shipment_delivers_order(self):
        order = make_order(self.company, status='SHIPPED')
        shipment = make_shipment(self.company, warehouse=self.warehouse, order=order, status='SHIPPED')
        self.client.post(f'{BASE}/shipments/{shipment.id}/deliver_shipment/')
        order.refresh_from_db()
        self.assertEqual(order.status, 'DELIVERED')

    def test_track_by_tracking_number(self):
        make_shipment(self.company, warehouse=self.warehouse, tracking_number='TRK-42')
        r = self.client.get(f'{BASE}/shipments/track/', {'tracking_number': 'TRK-42'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['tracking_number'], 'TRK-42')
        self.assertEqual(self.client.get(f'{BASE}/shipments/track/', {'tracking_number': 'nope'}).status_code, 404)

    def test_tracking_report_counts_delayed(self):
        make_shipment(self.company, warehouse=self.warehouse, status='SHIPPED',
                      estimated_delivery=timezone.now() - timedelta(days=1))
        make_shipment(self.company, warehouse=self.warehouse, status='PENDING')
        data = self.client.get(f'{BASE}/shipments/tracking_report/').json()
        self.assertEqual(data['total_shipments'], 2)
        self.assertEqual(data['delayed_shipments'], 1)


@patch('apps.distribution.views.time.sleep')
@patch('apps.distribution.views.geocode_address', return_value=(-1.2921, 36.8219))
class RouteTests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.route = DeliveryRoute.objects.create(company=self.company, route_name='Nairobi CBD')
        self.shipment = make_shipment(self.company, status='SHIPPED')

    def add_stop(self, shipment=None):
        return self.client.post(f'{BASE}/routes/{self.route.id}/add_stop/', {
            'shipment_id': str((shipment or self.shipment).id), 'address': 'Kenyatta Avenue',
        }, format='json')

    def test_add_stop_numbers_stops(self, *_):
        self.assertEqual(self.add_stop().status_code, 200)
        self.assertEqual(self.add_stop(make_shipment(self.company)).status_code, 200)
        self.assertEqual(list(self.route.route_stops.values_list('stop_number', flat=True).order_by('stop_number')), [1, 2])

    def test_add_stop_rejects_other_company_shipment(self, *_):
        foreign = make_shipment(make_company())
        self.assertEqual(self.add_stop(foreign).status_code, 400)
        self.assertFalse(self.route.route_stops.exists())

    def test_route_and_stop_lifecycle(self, *_):
        self.add_stop()
        stop = self.route.route_stops.get()
        order = make_order(self.company, status='SHIPPED')
        self.shipment.order = order
        self.shipment.save()

        self.assertEqual(self.client.post(f'{BASE}/routes/{self.route.id}/start_route/').json()['status'], 'IN_PROGRESS')
        # Route can't complete with open stops
        self.assertEqual(self.client.post(f'{BASE}/routes/{self.route.id}/complete_route/').status_code, 400)

        self.assertEqual(self.client.post(f'{BASE}/route-stops/{stop.id}/arrive_at_stop/').json()['status'], 'ARRIVED')
        self.assertEqual(self.client.post(f'{BASE}/route-stops/{stop.id}/complete_stop/').json()['status'], 'COMPLETED')

        self.shipment.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(self.shipment.status, 'DELIVERED')
        self.assertEqual(order.status, 'DELIVERED')

        self.assertEqual(self.client.post(f'{BASE}/routes/{self.route.id}/complete_route/').json()['status'], 'COMPLETED')

    def test_cannot_fail_completed_stop(self, *_):
        self.add_stop()
        stop = self.route.route_stops.get()
        stop.status = 'COMPLETED'
        stop.save()
        self.assertEqual(self.client.post(f'{BASE}/route-stops/{stop.id}/fail_stop/', {'notes': 'x'}).status_code, 400)

    def test_fail_pending_stop(self, *_):
        self.add_stop()
        stop = self.route.route_stops.get()
        r = self.client.post(f'{BASE}/route-stops/{stop.id}/fail_stop/', {'notes': 'Customer absent'})
        self.assertEqual(r.json()['status'], 'FAILED')

    def test_update_geocodes_only_when_address_changes(self, geocode, sleep):
        self.add_stop()
        stop = self.route.route_stops.get()
        geocode.reset_mock()

        self.client.patch(f'{BASE}/route-stops/{stop.id}/', {'notes': 'Gate B'}, format='json')
        geocode.assert_not_called()

        self.client.patch(f'{BASE}/route-stops/{stop.id}/', {'address': 'Moi Avenue'}, format='json')
        geocode.assert_called_once_with('Moi Avenue')
        stop.refresh_from_db()
        self.assertAlmostEqual(float(stop.latitude), -1.2921, places=4)

    def test_direct_stop_create_points_to_add_stop(self, *_):
        r = self.client.post(f'{BASE}/route-stops/', {
            'shipment_id': str(self.shipment.id), 'address': 'Kenyatta Avenue', 'stop_number': 1,
        }, format='json')
        self.assertEqual(r.status_code, 405)
        self.assertIn('add_stop', r.json()['error'])


class RouteCreateTests(AuthenticatedAPITestCase):
    def test_create_route_with_driver(self):
        driver = make_user(company=self.company, is_driver=True)
        r = self.client.post(f'{BASE}/routes/', {'route_name': 'Westlands', 'driver_id': str(driver.id)}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(DeliveryRoute.objects.get(route_name='Westlands').driver, driver)

    def test_create_route_rejects_other_company_driver(self):
        driver = make_user(company=make_company(), is_driver=True)
        r = self.client.post(f'{BASE}/routes/', {'route_name': 'Karen', 'driver_id': str(driver.id)}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_route_detail_lists_stops(self):
        route = DeliveryRoute.objects.create(company=self.company, route_name='Kilimani')
        RouteStop.objects.create(route=route, shipment=make_shipment(self.company), stop_number=1, address='Argwings Kodhek Rd')
        r = self.client.get(f'{BASE}/routes/{route.id}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()['route_stops']), 1)
        self.assertEqual(self.client.get(f'{BASE}/route-stops/').status_code, 200)


class ShipmentEventRecordingTests(AuthenticatedAPITestCase):
    """Existing actions keep their behaviour and also append to the shipment's history."""

    def setUp(self):
        super().setUp()
        self.warehouse = make_warehouse(self.company)

    def events(self, shipment):
        return list(shipment.events.order_by('occurred_at', 'created_at').values_list('event_type', 'from_status', 'to_status'))

    def test_create_via_api_records_created(self):
        r = self.client.post(f'{BASE}/shipments/', {'shipment_number': 'SH-EV-1', 'warehouse_id': str(self.warehouse.id)}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        shipment = Shipment.objects.get(shipment_number='SH-EV-1')
        event = shipment.events.get()
        self.assertEqual((event.event_type, event.actor, event.company), ('CREATED', self.user, self.company))

    def test_status_flow_records_each_transition(self):
        shipment = make_shipment(self.company, warehouse=self.warehouse)
        for action in ('pick_shipment', 'pack_shipment', 'ship_shipment', 'deliver_shipment'):
            self.client.post(f'{BASE}/shipments/{shipment.id}/{action}/', {'carrier': 'G4S'})
        self.assertEqual(self.events(shipment), [
            ('STATUS_CHANGED', 'PENDING', 'PICKED'),
            ('STATUS_CHANGED', 'PICKED', 'PACKED'),
            ('STATUS_CHANGED', 'PACKED', 'SHIPPED'),
            ('STATUS_CHANGED', 'SHIPPED', 'DELIVERED'),
        ])
        self.assertEqual(shipment.events.get(to_status='SHIPPED').data['carrier'], 'G4S')

    def test_rejected_transition_records_nothing(self):
        shipment = make_shipment(self.company, warehouse=self.warehouse)
        self.client.post(f'{BASE}/shipments/{shipment.id}/deliver_shipment/')
        self.assertFalse(shipment.events.exists())

    def test_ship_order_records_created(self):
        order = make_order(self.company, status='PROCESSING')
        r = self.client.post(f'{BASE}/orders/{order.id}/ship_order/', {'warehouse_id': str(self.warehouse.id)})
        shipment = Shipment.objects.get(id=r.json()['shipment_id'])
        self.assertEqual(shipment.events.get().event_type, 'CREATED')
        self.assertIn(order.order_number, shipment.events.get().message)

    def test_reassigning_driver_records_assigned(self):
        shipment = make_shipment(self.company, warehouse=self.warehouse)
        driver = make_user(company=self.company, is_driver=True)
        r = self.client.patch(f'{BASE}/shipments/{shipment.id}/', {'driver_id': str(driver.id)}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(shipment.events.get().event_type, 'ASSIGNED')
        # Saving without a change records nothing new
        self.client.patch(f'{BASE}/shipments/{shipment.id}/', {'notes': 'Fragile'}, format='json')
        self.assertEqual(shipment.events.count(), 1)

    @patch('apps.distribution.views.time.sleep')
    @patch('apps.distribution.views.geocode_address', return_value=None)
    def test_route_stop_actions_record_stop_events(self, *_):
        route = DeliveryRoute.objects.create(company=self.company, route_name='CBD')
        delivered = make_shipment(self.company, warehouse=self.warehouse, status='SHIPPED')
        failed = make_shipment(self.company, warehouse=self.warehouse, status='SHIPPED')
        for s in (delivered, failed):
            self.client.post(f'{BASE}/routes/{route.id}/add_stop/', {'shipment_id': str(s.id), 'address': 'Moi Ave'}, format='json')
        stop_ok, stop_fail = route.route_stops.order_by('stop_number')

        self.client.post(f'{BASE}/route-stops/{stop_ok.id}/arrive_at_stop/')
        self.client.post(f'{BASE}/route-stops/{stop_ok.id}/complete_stop/')
        self.client.post(f'{BASE}/route-stops/{stop_fail.id}/fail_stop/', {'notes': 'Gate locked'})

        self.assertEqual(self.events(delivered), [
            ('STOP_ARRIVED', '', ''),
            ('STOP_COMPLETED', '', ''),
            ('STATUS_CHANGED', 'SHIPPED', 'DELIVERED'),
        ])
        fail_event = failed.events.get()
        self.assertEqual(fail_event.event_type, 'STOP_FAILED')
        self.assertEqual(fail_event.data['notes'], 'Gate locked')


class LogisticsModelTests(AuthenticatedAPITestCase):
    def test_vehicle_registration_unique_per_company_only(self):
        from django.db import IntegrityError, transaction
        from apps.distribution.models import Vehicle

        Vehicle.objects.create(company=self.company, registration='KCD 214T')
        Vehicle.objects.create(company=make_company(), registration='KCD 214T')  # other company: allowed
        with self.assertRaises(IntegrityError), transaction.atomic():
            Vehicle.objects.create(company=self.company, registration='KCD 214T')

    def test_exception_open_state(self):
        from apps.distribution.models import DeliveryException

        exc = DeliveryException.objects.create(company=self.company, exception_type='DELAY', title='Late truck')
        self.assertTrue(exc.is_open)
        exc.status = 'RESOLVED'
        self.assertFalse(exc.is_open)

    def test_company_less_children_resolve_their_company(self):
        from apps.distribution.models import ProofOfDelivery
        from utils.permissions import _owning_company

        proof = ProofOfDelivery.objects.create(shipment=make_shipment(self.company), recipient_name='Achieng')
        self.assertEqual(_owning_company(proof), self.company)

    def test_cancelled_and_returned_shipments_are_not_active(self):
        make_shipment(self.company, status='SHIPPED')
        make_shipment(self.company, status='CANCELLED')
        make_shipment(self.company, status='RETURNED')
        stats = self.client.get('/api/v1/auth/dashboard/overview/').json()['stats']
        self.assertEqual(stats['active_shipments'], 1)
