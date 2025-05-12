import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

User = get_user_model()

class MedicationNotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.ward_id = self.scope['url_route']['kwargs']['ward_id']
        self.group_name = f"ward_{self.ward_id}_notifications"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_notification(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'message': message
        }))