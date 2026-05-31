from django.urls import path
from . import views

urlpatterns = [
    path('', views.AppointmentListCreateView.as_view(), name='appointment-list'),
    path('<int:pk>/', views.AppointmentDetailView.as_view(), name='appointment-detail'),
    path('today/', views.TodayAppointmentsView.as_view(), name='today-appointments'),
    path('stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
]