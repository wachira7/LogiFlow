# apps/demo/seed.py
"""
Fill a demo company with a believable two weeks of business in Nairobi and Mombasa: catalogue,
stock in two warehouses, orders and shipments at every stage, a route on the road with a moving
driver, fleet, exceptions, production and transfers.

Everything goes through the same services the app uses (so stock, ledgers and timelines agree),
then history is moved back in time so charts and timelines look lived-in.
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from apps.distribution import services as ship_svc
from apps.distribution.events import record_event
from apps.distribution.models import (
    CustomerOrder, DeliveryRoute, LocationPing, OrderItem, ProofOfDelivery, RouteStop, Shipment, ShipmentEvent, ShipmentItem, Vehicle,
)
from apps.inventory.models import Category, InventoryItem, InventoryTransaction, Product, Warehouse
from apps.ops import services as ops
from apps.production import services as prod_svc
from apps.production.models import ProductionMaterial, ProductionOrder, ProductionStep
from apps.warehousing import services as wh_svc
from apps.warehousing.models import TransferItem, WarehouseTransfer

# Industrial Area depot and delivery areas, with real coordinates so the maps make sense
DEPOT = (-1.3095, 36.8510)
AREAS = [
    ('Westlands', 'Woodvale Grove, Westlands, Nairobi', (-1.2676, 36.8108)),
    ('CBD', 'Moi Avenue, Nairobi CBD, Nairobi', (-1.2841, 36.8233)),
    ('Kilimani', 'Argwings Kodhek Rd, Kilimani, Nairobi', (-1.2921, 36.7856)),
    ('Eastleigh', 'First Avenue, Eastleigh, Nairobi', (-1.2756, 36.8508)),
    ('Karen', 'Karen Rd, Karen, Nairobi', (-1.3197, 36.7076)),
    ('Embakasi', 'Outer Ring Rd, Embakasi, Nairobi', (-1.3236, 36.8986)),
    ('Kasarani', 'Thika Rd, Kasarani, Nairobi', (-1.2180, 36.8970)),
    ('Ngong Road', 'Ngong Rd, Adams Arcade, Nairobi', (-1.3001, 36.7836)),
]
CUSTOMERS = [
    ('Wanjiku Stores', '+254711200301'), ('Mwangi Hardware & Grocers', '+254722400512'), ('Achieng Supermarket', '+254733100245'),
    ('Kamau Wholesalers', '+254700881230'), ('Otieno Mini-Mart', '+254712660987'), ('Njeri Fresh Foods', '+254726330114'),
    ('Baraka Cash & Carry', '+254798410022'), ('Shiru Corner Shop', '+254745220871'),
]
CATALOGUE = [
    # name, sku, category, cost, price, unit, reorder, max
    ('Maize Flour 2kg', 'MF-2KG', 'Cereals & Flour', 140, 185, 'ea', 120, 900),
    ('Wheat Flour 2kg', 'WF-2KG', 'Cereals & Flour', 160, 210, 'ea', 80, 600),
    ('Rice 5kg', 'RC-5KG', 'Cereals & Flour', 620, 780, 'ea', 40, 300),
    ('Cooking Oil 3L', 'CO-3L', 'Cooking Oils', 690, 860, 'ea', 50, 400),
    ('Sugar 2kg', 'SG-2KG', 'Groceries', 270, 330, 'ea', 100, 700),
    ('Tea Leaves 500g', 'TL-500', 'Beverages', 260, 340, 'ea', 60, 400),
    ('Bottled Water 24-pack', 'BW-24', 'Beverages', 480, 620, 'pack', 40, 250),
    ('Long-life Milk 12x500ml', 'LM-12', 'Beverages', 840, 1050, 'case', 30, 200),
    ('Laundry Soap 1kg', 'LS-1KG', 'Household', 190, 250, 'ea', 70, 500),
    ('Spaghetti 400g', 'SP-400', 'Groceries', 95, 130, 'ea', 90, 600),
]
RAW = [('Maize Grain 90kg bag', 'RAW-MG90', 'Raw materials', 4200, 0, 'bag', 5, 60),
       ('Flour Packaging (pack of 100)', 'RAW-PK100', 'Raw materials', 900, 0, 'pack', 4, 40)]


def _path(a, b, steps):
    return [(a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps) for i in range(1, steps + 1)]


class Seeder:
    def __init__(self, company, owner, driver, rng=None):
        self.c, self.owner, self.driver = company, owner, driver
        self.rng = rng or random.Random(company.slug)
        self.now = timezone.now()
        self.products, self.raw = {}, {}
        self.order_seq = 0

    # ── catalogue and stock ────────────────────────────────────────────────
    def catalogue(self):
        cats = {}
        for row in CATALOGUE + RAW:
            name, sku, cat, cost, price, unit, reorder, mx = row
            if cat not in cats:
                cats[cat] = Category.objects.create(company=self.c, name=cat)
            p = Product.objects.create(company=self.c, name=name, sku=sku, category=cats[cat], cost_price=Decimal(cost),
                                       unit_price=Decimal(price), unit_of_measure=unit, reorder_point=reorder, max_stock_level=mx,
                                       min_stock_level=reorder // 2, lead_time_days=self.rng.choice([2, 3, 5, 7]))
            (self.raw if row in RAW else self.products)[sku] = p
        self.nbo = Warehouse.objects.create(company=self.c, name='Nairobi Central', code='NBO-1', address='Enterprise Rd, Industrial Area',
                                            city='Nairobi', country='Kenya', capacity=6000, manager=self.owner)
        self.msa = Warehouse.objects.create(company=self.c, name='Mombasa Port Depot', code='MSA-1', address='Port Reitz Rd, Changamwe',
                                            city='Mombasa', country='Kenya', capacity=4000)

    def receive(self, product, warehouse, qty, days_ago, ref):
        item, _ = InventoryItem.objects.get_or_create(product=product, warehouse=warehouse, defaults={'quantity': 0, 'location': f'{chr(65 + self.rng.randint(0, 5))}-{self.rng.randint(1, 20):02d}'})
        item.quantity += qty
        item.save()
        tx = InventoryTransaction.objects.create(inventory_item=item, transaction_type='RECEIPT', quantity=qty, reference=ref,
                                                 notes='Supplier delivery', performed_by=self.owner)
        InventoryTransaction.objects.filter(pk=tx.pk).update(timestamp=self.now - timedelta(days=days_ago, hours=self.rng.randint(1, 8)))

    def stock(self):
        for i, (sku, p) in enumerate(self.products.items()):
            self.receive(p, self.nbo, int(p.max_stock_level * self.rng.uniform(0.85, 1.0)), 13 - i % 4, f'PO-{2401 + i}')
            self.receive(p, self.nbo, int(p.max_stock_level * 0.4), 6, f'PO-{2421 + i}')  # mid-period restock
            if i % 2 == 0:
                self.receive(p, self.msa, int(p.max_stock_level * self.rng.uniform(0.25, 0.4)), 10 - i % 3, f'PO-{2451 + i}')
        for p in self.raw.values():
            self.receive(p, self.nbo, p.max_stock_level, 9, 'PO-2490')

    # ── orders and shipments ───────────────────────────────────────────────
    def order(self, customer, area, lines, status='NEW', days_ago=0):
        self.order_seq += 1
        when = self.now - timedelta(days=days_ago, hours=self.rng.randint(1, 6))
        name, phone = customer
        o = CustomerOrder.objects.create(
            company=self.c, order_number=f'ORD-{when:%Y%m%d}-{self.order_seq:03d}', customer_name=name, customer_phone=phone,
            customer_email=f'orders@{name.split()[0].lower()}.example', shipping_address=area[1], status=status,
            total_amount=0, shipping_amount=Decimal(self.rng.choice([0, 250, 400])),
        )
        total = Decimal(0)
        for sku, qty in lines:
            p = self.products[sku]
            OrderItem.objects.create(order=o, product=p, quantity=qty, unit_price=p.unit_price, total_price=p.unit_price * qty)
            total += p.unit_price * qty
        o.total_amount = total + o.shipping_amount
        o.save()
        CustomerOrder.objects.filter(pk=o.pk).update(created_at=when)
        return o

    def shipment_for(self, o, area, warehouse=None):
        s = Shipment.objects.create(
            company=self.c, order=o, warehouse=warehouse or self.nbo, status='PENDING',
            shipment_number=f'SH-{o.order_number[4:12]}-{o.order_number[-3:]}', destination_address=o.shipping_address,
            recipient_name=o.customer_name, recipient_phone=o.customer_phone,
            destination_latitude=Decimal(f'{area[2][0]:.6f}'), destination_longitude=Decimal(f'{area[2][1]:.6f}'),
        )
        record_event(s, 'CREATED', actor=self.owner, message=f'Created from order {o.order_number}')
        for item in o.order_items.all():
            ShipmentItem.objects.create(shipment=s, order_item=item, product=item.product, quantity=item.quantity)
        if o.status == 'NEW':
            o.status = 'PROCESSING'
            o.save()
        return s

    def lines(self, n=None):
        skus = self.rng.sample(list(self.products), n or self.rng.randint(1, 3))
        return [(sku, self.rng.choice([5, 10, 12, 20, 24, 30])) for sku in skus]

    def backdate(self, s, start):
        """Spread a shipment's history out from `start` to roughly now (or delivery)."""
        events = list(s.events.order_by('occurred_at', 'created_at'))
        end = s.actual_delivery or self.now - timedelta(minutes=5)
        span = max((end - start).total_seconds(), 600)
        for i, e in enumerate(events):
            ShipmentEvent.objects.filter(pk=e.pk).update(occurred_at=start + timedelta(seconds=span * i / max(len(events) - 1, 1)))
        Shipment.objects.filter(pk=s.pk).update(created_at=start)
        if s.shipping_date:
            Shipment.objects.filter(pk=s.pk).update(shipping_date=start + timedelta(seconds=span * 0.4))
            InventoryTransaction.objects.filter(reference=s.shipment_number).update(timestamp=start + timedelta(seconds=span * 0.4))

    def history(self):
        """Two weeks of delivered orders so trends, on-time rate and analytics have data."""
        for day in range(13, 0, -1):
            for _ in range(self.rng.randint(1, 3)):
                area = self.rng.choice(AREAS)
                o = self.order(self.rng.choice(CUSTOMERS), area, self.lines(), days_ago=day)
                s = self.shipment_for(o, area)
                start = self.now - timedelta(days=day, hours=self.rng.randint(4, 9))
                eta = start + timedelta(hours=self.rng.choice([6, 8, 24]))
                ship_svc.ship(s, self.owner, carrier='Own fleet', estimated_delivery=eta, allow_unpacked=True)
                delivered = eta + timedelta(hours=self.rng.choice([-3, -2, -1, -1, 1]))  # mostly on time
                ship_svc.deliver(s, self.driver, delivered)
                s.refresh_from_db()
                self.backdate(s, start)

    def today(self):
        """Today's board: something in every column, a route on the road and a late delivery."""
        made = {}
        for key, (cust, area_i, n) in {
            'new1': (0, 6, 2), 'new2': (5, 7, 1),
        }.items():
            made[key] = self.order(CUSTOMERS[cust], AREAS[area_i], self.lines(n), status='NEW')

        for key, cust, area_i, to in (('pick', 1, 4, 'PENDING'), ('pack', 2, 5, 'PICKED'), ('ready', 3, 2, 'PACKED')):
            o = self.order(CUSTOMERS[cust], AREAS[area_i], self.lines(), status='PROCESSING')
            s = self.shipment_for(o, AREAS[area_i])
            if to in ('PICKED', 'PACKED'):
                ship_svc.advance(s, 'PICKED', self.owner)
            if to == 'PACKED':
                ship_svc.advance(s, 'PACKED', self.owner)
            s.refresh_from_db()
            self.backdate(s, self.now - timedelta(hours=self.rng.randint(1, 4)))
            made[key] = s

        # Delivered earlier today, with proof of delivery
        for cust, area_i in ((6, 3), (7, 0)):
            o = self.order(CUSTOMERS[cust], AREAS[area_i], self.lines(), status='PROCESSING')
            s = self.shipment_for(o, AREAS[area_i])
            start = self.now - timedelta(hours=self.rng.randint(5, 7))
            ship_svc.ship(s, self.owner, carrier='Own fleet', estimated_delivery=start + timedelta(hours=4), allow_unpacked=True)
            ship_svc.deliver(s, self.driver, start + timedelta(hours=3))
            ProofOfDelivery.objects.create(shipment=s, recipient_name=CUSTOMERS[cust][0].split()[0], captured_by=self.driver,
                                           captured_at=start + timedelta(hours=3), latitude=Decimal(f'{AREAS[area_i][2][0]:.6f}'),
                                           longitude=Decimal(f'{AREAS[area_i][2][1]:.6f}'))
            s.refresh_from_db()
            self.backdate(s, start)

        # Late: shipped this morning, ETA has passed (the board raises a DELAY exception for it)
        o = self.order(CUSTOMERS[4], AREAS[6], self.lines(2), status='PROCESSING')
        late = self.shipment_for(o, AREAS[6], warehouse=self.nbo)
        ship_svc.ship(late, self.owner, carrier='Swift Couriers', tracking_number='SWC-88213',
                      estimated_delivery=self.now - timedelta(hours=2), allow_unpacked=True)
        late.refresh_from_db()
        self.backdate(late, self.now - timedelta(hours=6))
        made['late'] = late
        return made

    # ── fleet, route and live driver ───────────────────────────────────────
    def fleet_and_route(self):
        van = Vehicle.objects.create(company=self.c, registration='KDA 245Q', name='Blue van', vehicle_type='VAN', status='AVAILABLE',
                                     capacity_kg=Decimal(1500), default_driver=self.driver)
        Vehicle.objects.create(company=self.c, registration='KCB 812M', name='Big truck', vehicle_type='TRUCK', status='AVAILABLE', capacity_kg=Decimal(7000))
        Vehicle.objects.create(company=self.c, registration='KMEX 330P', name='Rider', vehicle_type='MOTORBIKE', status='MAINTENANCE',
                               notes='Brake pads due for replacement')
        route = DeliveryRoute.objects.create(company=self.c, route_name='Westlands & CBD run', driver=self.driver, fleet_vehicle=van,
                                             start_location='Nairobi Central', notes='Call ahead at Woodvale Grove; gate code changes daily.')
        stops = []
        for n, (cust, area_i) in enumerate(((1, 1), (0, 0), (2, 2)), start=1):
            o = self.order(CUSTOMERS[cust], AREAS[area_i], self.lines(), status='PROCESSING')
            s = self.shipment_for(o, AREAS[area_i])
            stops.append(RouteStop.objects.create(route=route, shipment=s, stop_number=n, address=AREAS[area_i][1],
                                                  latitude=Decimal(f'{AREAS[area_i][2][0]:.6f}'), longitude=Decimal(f'{AREAS[area_i][2][1]:.6f}')))
        # Start the route the way the app does: everything on it ships, the van goes into use
        start = self.now - timedelta(minutes=95)
        for st in stops:
            ship_svc.ship(st.shipment, self.driver, carrier='Own fleet', estimated_delivery=self.now + timedelta(minutes=40 * st.stop_number),
                          allow_unpacked=True)
        route.status, route.start_time = 'IN_PROGRESS', start
        route.save()
        ops.set_vehicle_status_for_route(route)
        # Stop 1 done, driver now heading to stop 2
        first = stops[0]
        first.status, first.actual_arrival, first.departure_time = 'COMPLETED', self.now - timedelta(minutes=40), self.now - timedelta(minutes=32)
        first.save()
        record_event(first.shipment, 'STOP_ARRIVED', actor=self.driver, message='Arrived at stop 1', occurred_at=first.actual_arrival)
        ship_svc.deliver(first.shipment, self.driver, first.departure_time)
        ProofOfDelivery.objects.create(shipment=first.shipment, route_stop=first, recipient_name='Peter', captured_by=self.driver,
                                       captured_at=first.departure_time, latitude=first.latitude, longitude=first.longitude)
        for st in stops:
            st.shipment.refresh_from_db()
            self.backdate(st.shipment, start - timedelta(minutes=30))
        # GPS trail: depot → stop 1 → most of the way to stop 2, last point just now
        a, b, c = DEPOT, AREAS[1][2], AREAS[0][2]
        points = _path(a, b, 14) + _path(b, c, 12)[:8]
        t0 = start
        pings = []
        for i, (lat, lng) in enumerate(points):
            t = t0 + (self.now - t0) * (i / (len(points) - 1))
            pings.append(LocationPing(company=self.c, driver=self.driver, vehicle=van, route=route, latitude=round(Decimal(lat), 6),
                                      longitude=round(Decimal(lng), 6), speed_kmh=self.rng.uniform(18, 42), heading=315.0, recorded_at=t))
        LocationPing.objects.bulk_create(pings)
        return route, stops

    def exceptions(self, made):
        ops.raise_delay_exceptions(company=self.c)
        e = ops.raise_exception(self.c, user=self.owner, shipment=made['pack'], exception_type='ADDRESS_ISSUE', severity='MEDIUM',
                                title='Plot number missing for Embakasi delivery',
                                description='Customer gave the estate name only; the driver will need a landmark.',
                                recommended_action='Call the customer for a pin or landmark before dispatch.')
        ops.set_exception_status(e, 'ACKNOWLEDGED', self.owner)
        done = ops.raise_exception(self.c, user=self.driver, exception_type='DAMAGED', severity='LOW', title='Two cartons of milk dented in transit',
                                   description='Customer accepted the rest of the order.')
        ops.set_exception_status(done, 'RESOLVED', self.owner, 'Credit note issued for two cartons.')

    # ── production and transfers ───────────────────────────────────────────
    def production(self):
        po = ProductionOrder.objects.create(company=self.c, order_number=f'PO-{self.now:%Y%m%d}-001', product=self.products['MF-2KG'], quantity=200,
                                            output_warehouse=self.nbo, created_by=self.owner, start_date=self.now - timedelta(hours=5),
                                            end_date=self.now + timedelta(hours=3), notes='Weekly milling run')
        ProductionMaterial.objects.create(production_order=po, product=self.raw['RAW-MG90'], quantity=5, warehouse=self.nbo)
        ProductionMaterial.objects.create(production_order=po, product=self.raw['RAW-PK100'], quantity=2, warehouse=self.nbo)
        for i, (name, hours) in enumerate((('Cleaning & milling', 3), ('Packing 2kg bags', 2), ('Quality check', 1)), start=1):
            ProductionStep.objects.create(production_order=po, name=name, duration_hours=hours, assigned_to=self.owner if i == 3 else None)
        prod_svc.start(po, self.owner)
        first = po.production_steps.order_by('created_at').first()
        if first and first.status == 'IN_PROGRESS':
            prod_svc.complete_step(first)
        ProductionOrder.objects.create(company=self.c, order_number=f'PO-{self.now:%Y%m%d}-002', product=self.products['WF-2KG'], quantity=150,
                                       output_warehouse=self.nbo, created_by=self.owner, start_date=self.now + timedelta(days=1), notes='Planned for tomorrow')

    def transfers(self):
        moving = WarehouseTransfer.objects.create(company=self.c, transfer_number=f'TR-{self.now:%Y%m%d}-001', source_warehouse=self.nbo,
                                                  destination_warehouse=self.msa, initiated_by=self.owner, notes='Restock coast for the weekend')
        TransferItem.objects.create(transfer=moving, product=self.products['CO-3L'], quantity=40)
        TransferItem.objects.create(transfer=moving, product=self.products['RC-5KG'], quantity=25)
        wh_svc.dispatch(moving, self.owner)
        pending = WarehouseTransfer.objects.create(company=self.c, transfer_number=f'TR-{self.now:%Y%m%d}-002', source_warehouse=self.msa,
                                                   destination_warehouse=self.nbo, initiated_by=self.owner, notes='Return surplus sugar')
        TransferItem.objects.create(transfer=pending, product=self.products['SG-2KG'], quantity=30)

    def low_stock(self):
        """A couple of things worth reordering, so the reorder list and alerts have something real."""
        for sku, qty in (('LM-12', 18), ('TL-500', 35)):
            item = InventoryItem.objects.get(product=self.products[sku], warehouse=self.nbo)
            delta = qty - item.quantity
            if delta >= 0:
                continue
            item.quantity = qty
            item.save()
            InventoryTransaction.objects.create(inventory_item=item, transaction_type='ADJUSTMENT', quantity=delta, reference='Stock count',
                                                notes='Monthly count: damaged stock written off', performed_by=self.owner)

    def run(self):
        self.catalogue()
        self.stock()
        self.history()
        made = self.today()
        self.fleet_and_route()
        self.exceptions(made)
        self.production()
        self.transfers()
        self.low_stock()
