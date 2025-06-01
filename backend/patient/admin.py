from django.contrib import admin
from django.contrib import admin
from .models import *

admin.site.register(InsuranceCompany)
admin.site.register(Patient)
admin.site.register(ContactDetails)
admin.site.register(NextOfKin)
admin.site.register(PrescribedDrug)
admin.site.register(Prescription)
admin.site.register(PublicAppointment)
admin.site.register(Consultation)
admin.site.register(Triage)
admin.site.register(AttendanceProcess)
admin.site.register(Referral)