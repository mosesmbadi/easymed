from channels.generic.websocket import AsyncWebsocketConsumer
import json


'''
consumer opens up socket connection and sends notifs to doctor_notifications group members who's joined the
socket connection in this case, doctors
'''
class DoctorAppointmentNotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "doctor_notifications"
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def send_notification(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'message': message
        }))    