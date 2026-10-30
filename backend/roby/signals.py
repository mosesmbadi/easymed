from django.dispatch import Signal
from django.db.models.signals import post_save
from django.dispatch import receiver
from .task import process_triage_request

triage_request_signal = Signal()

@receiver(triage_request_signal)
def handle_triage_request(sender, patient_id, **kwargs):
    process_triage_request.delay(patient_id)