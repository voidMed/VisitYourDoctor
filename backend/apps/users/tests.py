from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import User


class UserAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')
        self.login_url = reverse('login')

    def test_patient_registration(self):
        data = {
            'username': 'patient1',
            'email': 'patient@test.com',
            'first_name': 'Jean',
            'last_name': 'Dupont',
            'password': 'SecurePass123!',
            'password2': 'SecurePass123!',
            'role': 'patient',
            'phone': '0601020304',
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)

    def test_doctor_registration(self):
        data = {
            'username': 'doctor1',
            'email': 'doctor@test.com',
            'first_name': 'Sophie',
            'last_name': 'Bernard',
            'password': 'SecurePass123!',
            'password2': 'SecurePass123!',
            'role': 'doctor',
            'phone': '0601020304',
            'specialty': 'cardiologie',
            'license_number': 'LIC-12345',
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_login(self):
        User.objects.create_user(username='testuser', password='pass123', role='patient')
        response = self.client.post(self.login_url, {'username': 'testuser', 'password': 'pass123'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)