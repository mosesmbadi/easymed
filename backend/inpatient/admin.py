from django.contrib import admin
from .models import Ward, Bed, PatientAdmission

# Register your models here.
admin.site.register(Ward)
admin.site.register(Bed)
admin.site.register(PatientAdmission)
