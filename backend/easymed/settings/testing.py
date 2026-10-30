import logging

from .base import *

logging.disable(logging.ERROR)

DEBUG = False

TEMPLATE_DEBUG = False

DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}


CELERY_TASK_ALWAYS_EAGER = True  # Execute tasks immediately in tests
CELERY_TASK_EAGER_PROPAGATES = True  # Raise exceptions immediately in tests

# CELERY_BROKER_URL = "memory://"