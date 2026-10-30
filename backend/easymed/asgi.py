"""
ASGI config for easymed project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'easymed.settings')

application = get_asgi_application()

# Get the ASGI application
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path, re_path
from channels.auth import AuthMiddlewareStack
from patient.consumers import DoctorAppointmentNotificationConsumer
from inventory.consumers import InventoryNotificationConsumer
from pharmacy.consumers import MedicationNotificationConsumer

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("ws/doctor_notifications/", DoctorAppointmentNotificationConsumer.as_asgi()),
            path("ws/inventory_notifications/", InventoryNotificationConsumer.as_asgi()),
            re_path(r"ws/pharmacy_notifications/(?P<ward_id>\d+)/$", MedicationNotificationConsumer.as_asgi()),
        ])
    ),
})
