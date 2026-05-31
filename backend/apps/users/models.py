from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('patient', 'Patient'),
        ('doctor', 'Médecin'),
        ('admin', 'Administrateur'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='patient')
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"


class DoctorProfile(models.Model):
    SPECIALTY_CHOICES = [
        ('cardiologie', 'Cardiologie'),
        ('dentiste', 'Dentiste'),
        ('pediatrie', 'Pédiatrie'),
        ('generaliste', 'Médecin Généraliste'),
        ('dermatologie', 'Dermatologie'),
        ('ophtalmologie', 'Ophtalmologie'),
        ('neurologie', 'Neurologie'),
        ('orthopédie', 'Orthopédie'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    specialty = models.CharField(max_length=50, choices=SPECIALTY_CHOICES)
    license_number = models.CharField(max_length=50, unique=True)
    hospital = models.CharField(max_length=100, blank=True)
    consultation_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    bio = models.TextField(blank=True)
    available_from = models.TimeField(default='08:00')
    available_to = models.TimeField(default='18:00')

    def __str__(self):
        return f"Dr. {self.user.get_full_name()} - {self.specialty}"


class PatientProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    blood_type = models.CharField(max_length=5, blank=True)
    allergies = models.TextField(blank=True)
    medical_history = models.TextField(blank=True)
    emergency_contact = models.CharField(max_length=100, blank=True)
    emergency_phone = models.CharField(max_length=20, blank=True)
    # New fields
    chronic_diseases = models.TextField(blank=True, verbose_name='Antécédents médicaux')
    past_surgeries = models.TextField(blank=True, verbose_name='Antécédents chirurgicaux')
    current_treatments = models.TextField(blank=True, verbose_name='Traitements en cours')

    def __str__(self):
        return f"Patient: {self.user.get_full_name()}"


class VitalSigns(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vital_signs')
    date = models.DateTimeField(auto_now_add=True)
    blood_pressure_systolic = models.IntegerField(null=True, blank=True, verbose_name='Pression systolique')
    blood_pressure_diastolic = models.IntegerField(null=True, blank=True, verbose_name='Pression diastolique')
    heart_rate = models.IntegerField(null=True, blank=True, verbose_name='Fréquence cardiaque')
    weight = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True, verbose_name='Poids (kg)')
    height = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, verbose_name='Taille (cm)')

    @property
    def bmi(self):
        if self.weight and self.height and self.height > 0:
            h_m = float(self.height) / 100
            return round(float(self.weight) / (h_m * h_m), 1)
        return None

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Signes vitaux - {self.patient.get_full_name()} ({self.date.strftime('%d/%m/%Y')})"


class MedicalDocument(models.Model):
    DOC_TYPE_CHOICES = [
        ('prescription', 'Ordonnance'),
        ('lab_result', 'Résultat d\'analyse'),
        ('report', 'Compte rendu médical'),
        ('imaging', 'Imagerie'),
        ('other', 'Autre'),
    ]
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medical_documents')
    doctor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='issued_documents')
    doc_type = models.CharField(max_length=20, choices=DOC_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='medical_documents/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_doc_type_display()} - {self.title}"