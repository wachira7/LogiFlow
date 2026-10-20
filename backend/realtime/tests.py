from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase, override_settings
from rest_framework_simplejwt.tokens import AccessToken

from logistics_project.asgi import application
from realtime.broadcast import publish
from utils.testing import make_company, make_shipment, make_user

ORIGIN = [(b'origin', b'http://localhost:3000')]
MEMORY_LAYER = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}


@override_settings(CHANNEL_LAYERS=MEMORY_LAYER, CORS_ALLOWED_ORIGINS=['http://localhost:3000'], CORS_ALLOW_ALL_ORIGINS=False)
class RealtimeTests(TransactionTestCase):
    """TransactionTestCase so on_commit publishing actually runs."""

    def setUp(self):
        self.company = make_company()
        self.user = make_user(company=self.company)
        self.token = str(AccessToken.for_user(self.user))

    async def connect(self, origin=ORIGIN):
        comm = WebsocketCommunicator(application, '/ws/ops/', headers=origin)
        connected, _ = await comm.connect()
        return comm, connected

    async def authed(self, token=None):
        comm, _ = await self.connect()
        await comm.send_json_to({'type': 'auth', 'token': token or self.token})
        return comm, await comm.receive_json_from(timeout=3)

    async def test_requires_a_valid_token_first(self):
        comm, connected = await self.connect()
        self.assertTrue(connected)
        await comm.send_json_to({'type': 'subscribe'})  # anything before auth closes the socket
        self.assertEqual((await comm.receive_output(timeout=3))['code'], 4401)

        comm, reply = await self.authed('not-a-jwt')
        self.assertEqual(reply['type'], 'error')
        await comm.disconnect()

    async def test_other_origins_are_rejected(self):
        _, connected = await self.connect([(b'origin', b'https://evil.example')])
        self.assertFalse(connected)

    async def test_company_members_get_their_company_events_only(self):
        comm, ready = await self.authed()
        self.assertEqual(ready, {'type': 'ready', 'company_id': str(self.company.id)})
        other = await sync_to_async(make_company)()
        await sync_to_async(publish)(other.id, 'exception.updated', {'id': 'theirs'})
        await sync_to_async(publish)(self.company.id, 'exception.updated', {'id': 'ours'})
        msg = await comm.receive_json_from(timeout=3)
        self.assertEqual((msg['type'], msg['data']), ('exception.updated', {'id': 'ours'}))
        self.assertTrue(await comm.receive_nothing(timeout=0.3))
        await comm.send_json_to({'type': 'ping'})
        self.assertEqual(await comm.receive_json_from(timeout=3), {'type': 'pong'})
        await comm.disconnect()

    async def test_api_changes_are_pushed(self):
        comm, _ = await self.authed()

        def raise_one():
            from apps.ops import services
            shipment = make_shipment(self.company, status='SHIPPED')
            services.raise_exception(self.company, exception_type='DAMAGED', title='Crushed carton', shipment=shipment, severity='HIGH')
            return shipment
        shipment = await sync_to_async(raise_one)()
        got = {}
        for _ in range(2):
            m = await comm.receive_json_from(timeout=3)
            got[m['type']] = m['data']
        self.assertEqual(got['exception.updated']['severity'], 'HIGH')
        self.assertTrue(got['exception.updated']['created'])
        self.assertEqual(got['shipment.event']['shipment']['number'], shipment.shipment_number)
        await comm.disconnect()

    async def test_inactive_company_cant_connect(self):
        self.company.is_active = False
        await sync_to_async(self.company.save)()
        comm, reply = await self.authed()
        self.assertEqual(reply['type'], 'error')

    def test_publish_never_raises_without_a_layer(self):
        with override_settings(CHANNEL_LAYERS={}):
            publish(self.company.id, 'x', {'a': 1})  # no exception
