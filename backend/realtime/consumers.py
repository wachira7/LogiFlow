# realtime/consumers.py
"""
One socket per browser tab for live updates. The client authenticates with its first message
({"type": "auth", "token": <access JWT>}) so tokens never appear in URLs or access logs; until
then nothing is sent. Members join their company's group (and their own), and receive the
events published by realtime.broadcast.
"""
import asyncio

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .broadcast import company_group, user_group

AUTH_TIMEOUT_SECONDS = 10
CLOSE_UNAUTHORIZED = 4401
CLOSE_AUTH_TIMEOUT = 4408


@database_sync_to_async
def user_for_token(token):
    from rest_framework_simplejwt.exceptions import TokenError
    from rest_framework_simplejwt.tokens import AccessToken
    from apps.users.models import User

    try:
        claims = AccessToken(token)
    except (TokenError, ValueError, TypeError):
        return None
    user = User.objects.select_related('company').filter(pk=claims.get('user_id'), is_active=True).first()
    if user is None or user.company_id is None or not user.company.is_active:
        return None
    return user


class OpsConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = None
        self.groups_joined = []
        await self.accept()
        self.auth_timer = asyncio.get_running_loop().call_later(AUTH_TIMEOUT_SECONDS, lambda: asyncio.ensure_future(self._auth_timeout()))

    async def _auth_timeout(self):
        if self.user is None:
            await self.close(code=CLOSE_AUTH_TIMEOUT)

    async def disconnect(self, code):
        if getattr(self, 'auth_timer', None):
            self.auth_timer.cancel()
        for group in self.groups_joined:
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        kind = content.get('type') if isinstance(content, dict) else None
        if kind == 'auth':
            user = await user_for_token(content.get('token') or '')
            if user is None:
                await self.send_json({'type': 'error', 'message': 'Not signed in.'})
                await self.close(code=CLOSE_UNAUTHORIZED)
                return
            self.auth_timer.cancel()
            # re-auth (after a token refresh) may move nothing, but never leaves stale groups behind
            for group in self.groups_joined:
                await self.channel_layer.group_discard(group, self.channel_name)
            self.user = user
            self.groups_joined = [company_group(user.company_id), user_group(user.id)]
            for group in self.groups_joined:
                await self.channel_layer.group_add(group, self.channel_name)
            await self.send_json({'type': 'ready', 'company_id': str(user.company_id)})
        elif kind == 'ping':
            await self.send_json({'type': 'pong'})
        elif self.user is None:
            await self.close(code=CLOSE_UNAUTHORIZED)

    async def realtime_event(self, message):
        """Fan-out from realtime.broadcast.publish."""
        await self.send_json({'type': message['event'], 'data': message['data'], 'at': message['at']})
