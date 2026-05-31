from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import Appointment
from .serializers import AppointmentSerializer


class AppointmentListCreateView(generics.ListCreateAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'doctor':
            return Appointment.objects.filter(doctor=user)
        return Appointment.objects.filter(patient=user)

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)


class AppointmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'doctor':
            return Appointment.objects.filter(doctor=user)
        return Appointment.objects.filter(patient=user)


class TodayAppointmentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        user = request.user
        if user.role == 'doctor':
            appointments = Appointment.objects.filter(doctor=user, date=today)
        else:
            appointments = Appointment.objects.filter(patient=user, date=today)
        serializer = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        if user.role == 'doctor':
            total = Appointment.objects.filter(doctor=user)
            total_count = total.count()
            cancelled = total.filter(status='cancelled').count()
            return Response({
                'today_appointments': total.filter(date=today).count(),
                'new_patients': total.filter(date=today).values('patient').distinct().count(),
                'cancellation_rate': round((cancelled / total_count * 100), 1) if total_count else 0,
                'pending_rate': 0,
            })
        appointments = Appointment.objects.filter(patient=user)
        return Response({
            'total_appointments': appointments.count(),
            'upcoming': appointments.filter(date__gte=today, status='confirmed').count(),
            'pending': appointments.filter(status='pending').count(),
        })