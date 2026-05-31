from django.contrib import admin
from .models import User, DoctorProfile, PatientProfile, VitalSigns, MedicalDocument

admin.site.register(User)
admin.site.register(DoctorProfile)
admin.site.register(PatientProfile)
admin.site.register(VitalSigns)
admin.site.register(MedicalDocument)
