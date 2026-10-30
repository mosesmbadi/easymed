from django.contrib import admin
from django.contrib import admin
from .models import *

# admin.site.register(Patient)
admin.site.register(ContactDetails)
admin.site.register(NextOfKin)
admin.site.register(PrescribedDrug)
admin.site.register(Prescription)
admin.site.register(PublicAppointment)
admin.site.register(Consultation)
admin.site.register(Triage)
admin.site.register(AttendanceProcess)
admin.site.register(Referral)


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'unique_id', 'first_name', 'second_name',
        'date_of_birth', 'gender', 'phone', 'email',
        )