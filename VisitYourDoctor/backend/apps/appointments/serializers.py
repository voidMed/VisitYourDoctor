from rest_framework import serializers
from .models import Appointment
from apps.users.serializers import UserSerializer


class AppointmentSerializer(serializers.ModelSerializer):
    patient_detail = UserSerializer(source='patient', read_only=True)
    doctor_detail = UserSerializer(source='doctor', read_only=True)

    class Meta:
        model = Appointment
        fields = ['id', 'patient', 'doctor', 'patient_detail', 'doctor_detail',
                  'date', 'time', 'status', 'reason', 'notes', 'diagnosis', 'created_at', 'updated_at']
        read_only_fields = ['id', 'patient', 'created_at', 'updated_at']

    def validate(self, attrs):
        doctor = attrs.get('doctor')
        if doctor and doctor.role != 'doctor':
            raise serializers.ValidationError("L'utilisateur sélectionné n'est pas un médecin.")
        return attrs