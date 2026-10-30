import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer

class InventoryNotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """
        Join the WebSocket group.
        """
        self.room_group_name = 'inventory_notifications'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()


    async def disconnect(self, close_code):
        """
        Leave the WebSocket group.
        """
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        

    async def receive(self, text_data):
        """
        Receive a message from the WebSocket.
        """
        data = json.loads(text_data)
        message = data['message']
        
        await self.send(text_data=json.dumps({
            'message': message
        }))


    async def send_notification(self, event):
        """
        Send a notification message to the WebSocket.
        """
        await self.send(text_data=json.dumps({
            'notification': event['message']
        }))


   