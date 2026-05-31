from .models import Notification


def create_notification(user, notif_type, title, message):
    return Notification.objects.create(
        user=user,
        type=notif_type,
        title=title,
        message=message,
    )


def notify_appointment_confirmed(appointment):
    create_notification(
        user=appointment.patient,
        notif_type='appointment_confirmed',
        title='Rendez-vous confirmé',
        message=f'Votre RDV avec Dr. {appointment.doctor.get_full_name()} le {appointment.date} à {appointment.time} est confirmé.',
    )


def notify_new_appointment(appointment):
    create_notification(
        user=appointment.doctor,
        notif_type='new_appointment',
        title='Nouveau rendez-vous',
        message=f'Nouveau RDV avec {appointment.patient.get_full_name()} le {appointment.date} à {appointment.time}.',
    )