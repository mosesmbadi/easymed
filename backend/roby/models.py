from django.db import models
from patient.models import Patient

class TriageResult(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('error', 'Error'),
    )
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    predicted_condition = models.TextField(blank=True, null=True)
    gemini_response = models.JSONField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    def __str__(self):
        return f"Triage Result for {self.patient.first_name} {self.patient.second_name} - {self.predicted_condition}"