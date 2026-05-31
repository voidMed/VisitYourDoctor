from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('apps.users.urls')),
    path('api/appointments/', include('apps.appointments.urls')),
    path('api/notifications/', include('apps.notifications.urls', namespace='notifications')),
]