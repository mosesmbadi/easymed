from django.apps import AppConfig


class RobyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'roby'

    def ready(self):
        from . import signals