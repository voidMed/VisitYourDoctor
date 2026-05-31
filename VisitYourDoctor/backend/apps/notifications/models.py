from django.db import models
from apps.users.models import User


class Notification(models.Model):
    TYPE_CHOICES = [
        ('appointment_confirmed', 'RDV Confirmé'),
        ('appointment_cancelled', 'RDV Annulé'),
        ('appointment_reminder', 'Rappel RDV'),
        ('new_appointment', 'Nouveau RDV'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.type}] {self.user} - {self.title}"