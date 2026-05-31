from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, DoctorProfile, PatientProfile, VitalSigns, MedicalDocument


class DoctorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        fields = '__all__'


class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = '__all__'


class VitalSignsSerializer(serializers.ModelSerializer):
    bmi = serializers.ReadOnlyField()

    class Meta:
        model = VitalSigns
        fields = ['id', 'date', 'blood_pressure_systolic', 'blood_pressure_diastolic',
                  'heart_rate', 'weight', 'height', 'bmi']


class MedicalDocumentSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = MedicalDocument
        fields = ['id', 'doc_type', 'doc_type_display', 'title', 'description',
                  'file', 'created_at', 'doctor_name']

    def get_doctor_name(self, obj):
        if obj.doctor:
            return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"
        return None


class UserSerializer(serializers.ModelSerializer):
    doctor_profile = DoctorProfileSerializer(read_only=True)
    patient_profile = PatientProfileSerializer(read_only=True)
    vital_signs = VitalSignsSerializer(many=True, read_only=True)
    medical_documents = MedicalDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'role', 'phone', 'date_of_birth', 'profile_picture',
                  'doctor_profile', 'patient_profile', 'vital_signs', 'medical_documents']
        read_only_fields = ['id']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    specialty = serializers.CharField(required=False, allow_blank=True)
    license_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name',
                  'password', 'password2', 'role', 'phone',
                  'specialty', 'license_number']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas."})
        if attrs.get('role') == 'doctor':
            if not attrs.get('specialty'):
                raise serializers.ValidationError({"specialty": "La spécialité est requise pour les médecins."})
            if not attrs.get('license_number'):
                raise serializers.ValidationError({"license_number": "Le numéro de licence est requis."})
        return attrs

    def create(self, validated_data):
        specialty = validated_data.pop('specialty', '')
        license_number = validated_data.pop('license_number', '')
        validated_data.pop('password2')

        user = User.objects.create_user(**validated_data)

        if user.role == 'doctor':
            DoctorProfile.objects.create(
                user=user,
                specialty=specialty,
                license_number=license_number
            )
        else:
            PatientProfile.objects.create(user=user)

        return user