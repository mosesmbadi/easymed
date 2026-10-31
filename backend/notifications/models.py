from django.db import models


class OutboundMessage(models.Model):
    """
    A message to a patient or a referring facility -- results ready, a sample
    turned away. Recorded whether or not the channel is set up, so the lab
    can see what was sent, what failed and what nobody could be told.
    """
    class Channel(models.TextChoices):
        SMS = 'sms', 'SMS'
        WHATSAPP = 'whatsapp', 'WhatsApp'
        EMAIL = 'email', 'Email'

    class Status(models.TextChoices):
        QUEUED = 'queued', 'Queued'
        SENT = 'sent', 'Sent'
        FAILED = 'failed', 'Failed'
        SKIPPED = 'skipped', 'Not sent: channel not set up'

    channel = models.CharField(max_length=10, choices=Channel.choices)
    recipient = models.CharField(max_length=254)
    subject = models.CharField(max_length=200, blank=True, default='')
    body = models.TextField()
    # One message per event and recipient, however often the event fires.
    dedupe_key = models.CharField(max_length=200, unique=True)
    # Results to attach as a PDF, for an email to a referring facility.
    lab_results = models.ForeignKey(
        'laboratory.ProcessTestRequest', on_delete=models.SET_NULL, null=True, blank=True)
    patient = models.ForeignKey('patient.Patient', on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.QUEUED)
    attempts = models.PositiveIntegerField(default=0)
    provider_reference = models.CharField(max_length=200, blank=True, default='')
    error = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['status'], name='outbound_message_status_idx')]

    def __str__(self):
        return f"{self.get_channel_display()} to {self.recipient}: {self.get_status_display()}"
