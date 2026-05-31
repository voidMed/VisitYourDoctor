from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User, DoctorProfile, PatientProfile


class RegisterTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_patient_success(self):
        data = {
            'username': 'patient1', 'email': 'patient@test.com',
            'first_name': 'Alice', 'last_name': 'Durand',
            'password': 'StrongPass123!', 'password2': 'StrongPass123!',
            'role': 'patient', 'phone': '0612345678',
        }
        response = self.client.post(reverse('register'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['user']['username'], 'patient1')
        self.assertEqual(response.data['user']['role'], 'patient')
        self.assertTrue(PatientProfile.objects.filter(user__username='patient1').exists())
        self.assertTrue(User.objects.filter(username='patient1').exists())

    def test_register_doctor_success(self):
        data = {
            'username': 'doc1', 'email': 'doctor@test.com',
            'first_name': 'Jean', 'last_name': 'Martin',
            'password': 'StrongPass123!', 'password2': 'StrongPass123!',
            'role': 'doctor', 'phone': '0698765432',
            'specialty': 'cardiologie', 'license_number': 'LIC-12345',
        }
        response = self.client.post(reverse('register'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['role'], 'doctor')
        self.assertTrue(DoctorProfile.objects.filter(user__username='doc1').exists())
        doctor_profile = DoctorProfile.objects.get(user__username='doc1')
        self.assertEqual(doctor_profile.specialty, 'cardiologie')
        self.assertEqual(doctor_profile.license_number, 'LIC-12345')

    def test_register_password_mismatch(self):
        data = {
            'username': 'bob', 'email': 'bob@test.com',
            'first_name': 'Bob', 'last_name': 'Doe',
            'password': 'Pass123!', 'password2': 'DifferentPass456!',
            'role': 'patient',
        }
        response = self.client.post(reverse('register'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_doctor_missing_specialty(self):
        data = {
            'username': 'doc2', 'email': 'doc2@test.com',
            'first_name': 'Pierre', 'last_name': 'Dubois',
            'password': 'StrongPass123!', 'password2': 'StrongPass123!',
            'role': 'doctor', 'license_number': 'LIC-99999',
        }
        response = self.client.post(reverse('register'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_doctor_missing_license(self):
        data = {
            'username': 'doc3', 'email': 'doc3@test.com',
            'first_name': 'Marie', 'last_name': 'Curie',
            'password': 'StrongPass123!', 'password2': 'StrongPass123!',
            'role': 'doctor', 'specialty': 'generaliste',
        }
        response = self.client.post(reverse('register'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_username(self):
        User.objects.create_user(username='existing', password='Pass123!')
        data = {
            'username': 'existing', 'email': 'dup@test.com',
            'first_name': 'Dup', 'last_name': 'Dup',
            'password': 'Pass123!', 'password2': 'Pass123!',
            'role': 'patient',
        }
        response = self.client.post(reverse('register'), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'TestPass123!'
        self.user = User.objects.create_user(
            username='logintest', email='login@test.com',
            first_name='Test', last_name='User',
            password=self.password, role='patient',
        )

    def test_login_success(self):
        response = self.client.post(reverse('login'), {
            'username': 'logintest', 'password': self.password,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['user']['username'], 'logintest')

    def test_login_wrong_password(self):
        response = self.client.post(reverse('login'), {
            'username': 'logintest', 'password': 'WrongPassword!',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        response = self.client.post(reverse('login'), {
            'username': 'ghost', 'password': 'SomePass123!',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'TestPass123!'
        self.user = User.objects.create_user(
            username='profiletest', email='profile@test.com',
            first_name='Profile', last_name='Test',
            password=self.password, role='patient',
        )
        PatientProfile.objects.create(user=self.user)
        self.client.force_authenticate(user=self.user)

    def test_get_profile(self):
        response = self.client.get(reverse('profile'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'profiletest')

    def test_get_profile_without_token(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse('profile'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_profile(self):
        response = self.client.patch(reverse('profile'), {
            'first_name': 'UpdatedName', 'phone': '0606060606',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'UpdatedName')
        self.assertEqual(response.data['phone'], '0606060606')


class DoctorListTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            username='patientdoc', password='Pass123!', role='patient',
        )
        self.doctor1 = User.objects.create_user(
            username='doc_a', password='Pass123!', role='doctor',
            first_name='Alpha', last_name='Doc',
        )
        DoctorProfile.objects.create(user=self.doctor1, specialty='cardiologie', license_number='LIC-001')
        self.doctor2 = User.objects.create_user(
            username='doc_b', password='Pass123!', role='doctor',
            first_name='Beta', last_name='Doc',
        )
        DoctorProfile.objects.create(user=self.doctor2, specialty='generaliste', license_number='LIC-002')
        self.client.force_authenticate(user=self.patient)

    def test_list_all_doctors(self):
        response = self.client.get(reverse('doctor-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_doctors_filter_by_specialty(self):
        response = self.client.get(reverse('doctor-list'), {'specialty': 'cardiologie'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['username'], 'doc_a')

    def test_list_doctors_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse('doctor-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DoctorDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            username='patientdd', password='Pass123!', role='patient',
        )
        self.doctor = User.objects.create_user(
            username='doc_detail', password='Pass123!', role='doctor',
            first_name='Detail', last_name='Doc',
        )
        DoctorProfile.objects.create(user=self.doctor, specialty='cardiologie', license_number='LIC-DTL')
        self.client.force_authenticate(user=self.patient)

    def test_get_doctor_detail(self):
        response = self.client.get(reverse('doctor-detail', args=[self.doctor.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'doc_detail')
        self.assertIn('doctor_profile', response.data)

    def test_get_doctor_detail_not_found(self):
        response = self.client.get(reverse('doctor-detail', args=[9999]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PatientDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'Pass123!'
        self.patient = User.objects.create_user(
            username='patientpd', password=self.password, role='patient',
            first_name='PatientPD', last_name='Test',
        )
        PatientProfile.objects.create(user=self.patient)
        self.doctor = User.objects.create_user(
            username='doctorpd', password=self.password, role='doctor',
            first_name='DoctorPD', last_name='Test',
        )
        DoctorProfile.objects.create(user=self.doctor, specialty='generaliste', license_number='LIC-PD')

    def test_doctor_can_access_patient_detail(self):
        self.client.force_authenticate(user=self.doctor)
        from apps.appointments.models import Appointment
        Appointment.objects.create(
            patient=self.patient, doctor=self.doctor,
            date='2026-06-15', time='09:00:00',
        )
        response = self.client.get(reverse('patient-detail', args=[self.patient.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('patient', response.data)
        self.assertIn('appointments', response.data)
        self.assertEqual(response.data['patient']['username'], 'patientpd')

    def test_patient_cannot_access_patient_detail(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.get(reverse('patient-detail', args=[self.patient.id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_detail_not_found(self):
        self.client.force_authenticate(user=self.doctor)
        response = self.client.get(reverse('patient-detail', args=[9999]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
