from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User, PatientProfile
from apps.notifications.models import Notification


class NotificationListTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='notifuser', password='Pass123!', role='patient',
        )
        PatientProfile.objects.create(user=self.user)
        Notification.objects.create(
            user=self.user, type='appointment',
            title='Rappel', message='Vous avez un RDV demain.',
        )
        Notification.objects.create(
            user=self.user, type='system',
            title='Bienvenue', message='Bienvenue sur Ma Santé !',
        )
        other_user = User.objects.create_user(
            username='othernotif', password='Pass123!', role='patient',
        )
        PatientProfile.objects.create(user=other_user)
        Notification.objects.create(
            user=other_user, type='appointment',
            title='Secret', message='Ne pas voir',
        )
        self.client.force_authenticate(user=self.user)

    def test_list_own_notifications(self):
        response = self.client.get(reverse('notifications:list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_notifications_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse('notifications:list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_notification_has_expected_fields(self):
        response = self.client.get(reverse('notifications:list'))
        notif = response.data[0]
        self.assertIn('id', notif)
        self.assertIn('title', notif)
        self.assertIn('message', notif)
        self.assertIn('type', notif)
        self.assertIn('is_read', notif)
        self.assertIn('created_at', notif)


class MarkReadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='markuser', password='Pass123!', role='patient',
        )
        PatientProfile.objects.create(user=self.user)
        self.notif = Notification.objects.create(
            user=self.user, type='appointment',
            title='Test', message='Marquer comme lu',
        )
        self.client.force_authenticate(user=self.user)

    def test_mark_notification_as_read(self):
        response = self.client.post(reverse('notifications:mark-read', args=[self.notif.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ok')
        self.notif.refresh_from_db()
        self.assertTrue(self.notif.is_read)

    def test_mark_nonexistent_notification(self):
        response = self.client.post(reverse('notifications:mark-read', args=[9999]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_mark_another_users_notification(self):
        other_user = User.objects.create_user(
            username='othermark', password='Pass123!', role='patient',
        )
        PatientProfile.objects.create(user=other_user)
        other_notif = Notification.objects.create(
            user=other_user, type='system',
            title='Privé', message='Ne pas marquer',
        )
        response = self.client.post(reverse('notifications:mark-read', args=[other_notif.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
