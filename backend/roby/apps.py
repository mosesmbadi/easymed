from django.apps import AppConfig


class RobyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'roby'

    def ready(self):
        from .signals import triage_request_signal
        from .tasks import process_triage_request

        def call_process_triage_task(sender, **kwargs):
            patient_id = kwargs.get('patient_id')
            if patient_id:
                process_triage_request.delay(patient_id)

        triage_request_signal.connect(call_process_triage_task)