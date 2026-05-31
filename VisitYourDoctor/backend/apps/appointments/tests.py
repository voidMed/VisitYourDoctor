from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User, DoctorProfile, PatientProfile
from .models import Appointment
from datetime import date, time


class AppointmentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(username='patient', password='pass', role='patient')
        PatientProfile.objects.create(user=self.patient)
        self.doctor = User.objects.create_user(username='doctor', password='pass', role='doctor',
                                               first_name='Sophie', last_name='Bernard')
        DoctorProfile.objects.create(user=self.doctor, specialty='cardiologie', license_number='LIC-001')

    def test_create_appointment(self):
        self.client.force_authenticate(user=self.patient)
        data = {
            'doctor': self.doctor.id,
            'date': '2025-12-01',
            'time': '10:00:00',
            'reason': 'Consultation cardiologie',
        }
        response = self.client.post(reverse('appointment-list'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_list_appointments(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.get(reverse('appointment-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)