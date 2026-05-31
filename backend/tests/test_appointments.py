from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User, DoctorProfile, PatientProfile
from apps.appointments.models import Appointment
from datetime import date, time


class AppointmentCreateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            username='aptpatient', password='Pass123!', role='patient',
            first_name='Alice', last_name='Patient',
        )
        PatientProfile.objects.create(user=self.patient)
        self.doctor = User.objects.create_user(
            username='aptdoctor', password='Pass123!', role='doctor',
            first_name='Bob', last_name='Doctor',
        )
        DoctorProfile.objects.create(user=self.doctor, specialty='generaliste', license_number='LIC-APT')
        self.client.force_authenticate(user=self.patient)

    def test_create_appointment(self):
        response = self.client.post(reverse('appointment-list'), {
            'doctor': self.doctor.id,
            'date': '2026-07-01',
            'time': '10:00:00',
            'reason': 'Consultation de routine',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['reason'], 'Consultation de routine')
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(Appointment.objects.count(), 1)

    def test_create_appointment_without_auth(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(reverse('appointment-list'), {
            'doctor': self.doctor.id,
            'date': '2026-07-01', 'time': '10:00:00',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_appointment_with_invalid_doctor(self):
        response = self.client.post(reverse('appointment-list'), {
            'doctor': self.patient.id,
            'date': '2026-07-01', 'time': '10:00:00',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_appointment_nonexistent_doctor(self):
        response = self.client.post(reverse('appointment-list'), {
            'doctor': 9999,
            'date': '2026-07-01', 'time': '10:00:00',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AppointmentListTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            username='aptlistpatient', password='Pass123!', role='patient',
        )
        PatientProfile.objects.create(user=self.patient)
        self.doctor = User.objects.create_user(
            username='aptlistdoctor', password='Pass123!', role='doctor',
        )
        DoctorProfile.objects.create(user=self.doctor, specialty='generaliste', license_number='LIC-LIST')
        self.apt1 = Appointment.objects.create(
            patient=self.patient, doctor=self.doctor,
            date='2026-07-15', time='09:00:00', reason='Check-up',
            status='pending',
        )
        self.apt2 = Appointment.objects.create(
            patient=self.patient, doctor=self.doctor,
            date='2026-08-01', time='14:00:00', reason='Suivi',
            status='confirmed',
        )

    def test_patient_lists_own_appointments(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.get(reverse('appointment-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_doctor_lists_own_appointments(self):
        self.client.force_authenticate(user=self.doctor)
        response = self.client.get(reverse('appointment-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_patient_does_not_see_other_patients_appointments(self):
        other_patient = User.objects.create_user(
            username='otherpatient', password='Pass123!', role='patient',
        )
        PatientProfile.objects.create(user=other_patient)
        Appointment.objects.create(
            patient=other_patient, doctor=self.doctor,
            date='2026-09-01', time='11:00:00', reason='Autre',
        )
        self.client.force_authenticate(user=self.patient)
        response = self.client.get(reverse('appointment-list'))
        self.assertEqual(len(response.data), 2)


class AppointmentDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            username='aptdetpatient', password='Pass123!', role='patient',
        )
        PatientProfile.objects.create(user=self.patient)
        self.doctor = User.objects.create_user(
            username='aptdetdoctor', password='Pass123!', role='doctor',
        )
        DoctorProfile.objects.create(user=self.doctor, specialty='generaliste', license_number='LIC-DET')
        self.apt = Appointment.objects.create(
            patient=self.patient, doctor=self.doctor,
            date='2026-07-15', time='09:00:00', reason='Consultation',
            status='pending',
        )

    def test_retrieve_appointment(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.get(reverse('appointment-detail', args=[self.apt.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.apt.id)

    def test_update_appointment_status(self):
        self.client.force_authenticate(user=self.doctor)
        response = self.client.patch(reverse('appointment-detail', args=[self.apt.id]), {
            'status': 'confirmed',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'confirmed')

    def test_delete_appointment(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.delete(reverse('appointment-detail', args=[self.apt.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Appointment.objects.count(), 0)

    def test_retrieve_nonexistent_appointment(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.get(reverse('appointment-detail', args=[9999]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patient_cannot_see_anothers_appointment(self):
        other_patient = User.objects.create_user(
            username='otherapt', password='Pass123!', role='patient',
        )
        PatientProfile.objects.create(user=other_patient)
        other_apt = Appointment.objects.create(
            patient=other_patient, doctor=self.doctor,
            date='2026-09-01', time='10:00:00', reason='Secret',
        )
        self.client.force_authenticate(user=self.patient)
        response = self.client.get(reverse('appointment-detail', args=[other_apt.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class AppointmentStatusFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            username='flowpatient', password='Pass123!', role='patient',
        )
        PatientProfile.objects.create(user=self.patient)
        self.doctor = User.objects.create_user(
            username='flowdoctor', password='Pass123!', role='doctor',
        )
        DoctorProfile.objects.create(user=self.doctor, specialty='generaliste', license_number='LIC-FLOW')
        self.apt = Appointment.objects.create(
            patient=self.patient, doctor=self.doctor,
            date='2026-07-20', time='11:00:00', reason='Suivi',
            status='pending',
        )

    def test_patient_cancels_pending_appointment(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.patch(reverse('appointment-detail', args=[self.apt.id]), {
            'status': 'cancelled',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'cancelled')

    def test_doctor_confirms_appointment(self):
        self.client.force_authenticate(user=self.doctor)
        response = self.client.patch(reverse('appointment-detail', args=[self.apt.id]), {
            'status': 'confirmed',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'confirmed')


class TodayAppointmentsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            username='todaypatient', password='Pass123!', role='patient',
        )
        PatientProfile.objects.create(user=self.patient)
        self.doctor = User.objects.create_user(
            username='todaydoctor', password='Pass123!', role='doctor',
        )
        DoctorProfile.objects.create(user=self.doctor, specialty='generaliste', license_number='LIC-TODAY')
        self.today_str = date.today().isoformat()
        Appointment.objects.create(
            patient=self.patient, doctor=self.doctor,
            date=self.today_str, time='09:00:00', reason='Urgence',
            status='pending',
        )
        Appointment.objects.create(
            patient=self.patient, doctor=self.doctor,
            date='2026-12-25', time='10:00:00', reason='Futur',
            status='pending',
        )

    def test_today_appointments_patient(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.get(reverse('today-appointments'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['reason'], 'Urgence')

    def test_today_appointments_doctor(self):
        self.client.force_authenticate(user=self.doctor)
        response = self.client.get(reverse('today-appointments'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class DashboardStatsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            username='statspatient', password='Pass123!', role='patient',
        )
        PatientProfile.objects.create(user=self.patient)
        self.doctor = User.objects.create_user(
            username='statsdoctor', password='Pass123!', role='doctor',
        )
        DoctorProfile.objects.create(user=self.doctor, specialty='generaliste', license_number='LIC-STATS')
        self.today_str = date.today().isoformat()
        Appointment.objects.create(
            patient=self.patient, doctor=self.doctor,
            date=self.today_str, time='09:00:00', status='pending',
        )
        Appointment.objects.create(
            patient=self.patient, doctor=self.doctor,
            date='2026-06-15', time='10:00:00', status='confirmed',
        )

    def test_patient_stats(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.get(reverse('dashboard-stats'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_appointments', response.data)
        self.assertIn('upcoming', response.data)
        self.assertIn('pending', response.data)
        self.assertEqual(response.data['total_appointments'], 2)

    def test_doctor_stats(self):
        self.client.force_authenticate(user=self.doctor)
        response = self.client.get(reverse('dashboard-stats'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('today_appointments', response.data)
        self.assertIn('new_patients', response.data)
        self.assertIn('cancellation_rate', response.data)
