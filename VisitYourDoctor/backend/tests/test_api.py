from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User


class GlobalAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_and_login_flow(self):
        register_data = {
            'username': 'newuser',
            'email': 'new@test.com',
            'first_name': 'Test',
            'last_name': 'User',
            'password': 'TestPass123!',
            'password2': 'TestPass123!',
            'role': 'patient',
        }
        reg_response = self.client.post(reverse('register'), register_data)
        self.assertEqual(reg_response.status_code, status.HTTP_201_CREATED)

        login_response = self.client.post(reverse('login'), {
            'username': 'newuser',
            'password': 'TestPass123!'
        })
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_response.data['tokens'])

    def test_protected_route_without_token(self):
        response = self.client.get(reverse('profile'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)