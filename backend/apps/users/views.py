from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, DoctorProfile
from .serializers import UserSerializer, RegisterSerializer, DoctorProfileSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)

        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            })
        return Response({'error': 'Identifiants invalides'}, status=status.HTTP_401_UNAUTHORIZED)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class DoctorListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        specialty = request.query_params.get('specialty', None)
        doctors = User.objects.filter(role='doctor')
        if specialty:
            doctors = doctors.filter(doctor_profile__specialty=specialty)
        serializer = UserSerializer(doctors, many=True)
        return Response(serializer.data)


class DoctorDetailView(generics.RetrieveAPIView):
    queryset = User.objects.filter(role='doctor')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class PatientDetailView(APIView):
    """Endpoint for doctors to retrieve a patient's medical file by patient ID (used after QR scan)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        if request.user.role != 'doctor':
            return Response({'error': 'Accès réservé aux médecins.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            patient = User.objects.get(pk=pk, role='patient')
        except User.DoesNotExist:
            return Response({'error': 'Patient introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        from apps.appointments.models import Appointment
        from apps.appointments.serializers import AppointmentSerializer

        patient_data = UserSerializer(patient).data
        appointments = Appointment.objects.filter(patient=patient, doctor=request.user).order_by('-date', '-time')
        appointments_data = AppointmentSerializer(appointments, many=True).data

        return Response({
            'patient': patient_data,
            'appointments': appointments_data,
        })