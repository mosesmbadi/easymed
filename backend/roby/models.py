from django.db import models
from patient.models import Patient
from customuser.models import CustomUser

# User = models.get_model('customuser', 'User')

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
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Triage Result for {self.id} - {self.patient.first_name} {self.patient.second_name} - {self.predicted_condition}"