from django.contrib import admin

from .models import Bed, PatientAdmission, Ward, WardNurseAssignment, PatientDischarge

# Register your models here.
admin.site.register(Ward)
admin.site.register(Bed)
admin.site.register(PatientAdmission)
admin.site.register(PatientDischarge)
admin.site.register(WardNurseAssignment)

