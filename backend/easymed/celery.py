from __future__ import absolute_import, unicode_literals
import os
from celery import Celery

# set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'easymed.settings.base')

# create a Celery instance and configure it using the settings from Django
app = Celery('easymed')

# Load task modules from all registered Django app configs.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Discover and auto-reload tasks from all installed apps
app.autodiscover_tasks()
