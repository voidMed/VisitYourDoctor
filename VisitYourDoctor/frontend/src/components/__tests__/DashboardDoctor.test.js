import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardDoctor from '../DashboardDoctor';
import api from '../../api/api';

jest.mock('../../api/api');

const mockLogout = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 2, username: 'docmartin', first_name: 'Jean', last_name: 'Martin',
      email: 'jean@test.com', role: 'doctor',
      doctor_profile: { specialty: 'cardiologie' },
    },
    logout: mockLogout,
    token: 'fake-token',
  }),
}));

jest.mock('html5-qrcode', () => ({
  Html5Qrcode: jest.fn().mockImplementation(() => ({
    scanFile: jest.fn(),
    clear: jest.fn(),
  })),
}));

const mockAppointments = [
  {
    id: 1, date: new Date().toISOString().split('T')[0], time: '09:00:00',
    status: 'pending', reason: 'Douleur thoracique',
    doctor_detail: { first_name: 'Jean', last_name: 'Martin' },
    patient_detail: { id: 1, first_name: 'Alice', last_name: 'Durand', email: 'alice@test.com', date_of_birth: '1990-05-15', patient_profile: { medical_history: 'Asthme', blood_type: 'A+' } },
  },
  {
    id: 2, date: '2026-06-20', time: '14:30:00',
    status: 'confirmed', reason: 'Consultation',
    doctor_detail: { first_name: 'Jean', last_name: 'Martin' },
    patient_detail: { id: 3, first_name: 'Bob', last_name: 'Martin', email: 'bob@test.com', patient_profile: {} },
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockLogout.mockClear();
  api.get.mockImplementation((url) => {
    if (url === '/appointments/') return Promise.resolve({ data: mockAppointments });
    if (url === '/appointments/stats/') return Promise.resolve({
      data: { today_appointments: 1, new_patients: 2, cancellation_rate: 0 },
    });
    return Promise.resolve({ data: [] });
  });
});

function renderDashboard() {
  return render(<DashboardDoctor />);
}

test('renders sidebar with logo', async () => {
  renderDashboard();
  expect(await screen.findByText('Ma Santé')).toBeInTheDocument();
});

test('renders all navigation items', async () => {
  renderDashboard();
  expect(await screen.findByText('Analyses')).toBeInTheDocument();
  expect(screen.getByText('Mon Agenda')).toBeInTheDocument();
  expect(screen.getByText('Mes Patients')).toBeInTheDocument();
  expect(screen.getByText('Paramètres')).toBeInTheDocument();
});

test('renders topbar with doctor name', async () => {
  renderDashboard();
  expect(await screen.findByText((c) => c.includes('Dr. Jean Martin'))).toBeInTheDocument();
});

test('shows dashboard tab content by default', async () => {
  renderDashboard();
  await waitFor(() => {
    expect(screen.getByText('RDV Aujourd\'hui')).toBeInTheDocument();
  });
  expect(screen.getByText('Nouveaux Patients')).toBeInTheDocument();
  expect(screen.getByText('Taux de Confirmation')).toBeInTheDocument();
  expect(screen.getByText('Taux d\'Annulation')).toBeInTheDocument();
});

test('shows calendar', async () => {
  renderDashboard();
  await waitFor(() => {
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });
});

test('shows today appointments section', async () => {
  renderDashboard();
  const found = await screen.findAllByText((c) => c.includes('Douleur thoracique'));
  expect(found.length).toBeGreaterThanOrEqual(1);
});

test('shows patient detail section', async () => {
  renderDashboard();
  await waitFor(() => {
    expect(screen.getByText('Détails du Patient Prochain')).toBeInTheDocument();
  });
});

test('navigates to agenda tab', async () => {
  renderDashboard();
  await screen.findByText((c) => c.includes('Dr. Jean Martin'));
  fireEvent.click(screen.getByText('Mon Agenda'));
  const found = await screen.findAllByText((c) => c.includes('Mon Agenda'));
  expect(found.length).toBeGreaterThanOrEqual(1);
});

test('navigates to patients tab', async () => {
  renderDashboard();
  await screen.findByText((c) => c.includes('Dr. Jean Martin'));
  fireEvent.click(screen.getByText('Mes Patients'));
  const found = await screen.findAllByText((c) => c.includes('Mes Patients'));
  expect(found.length).toBeGreaterThanOrEqual(1);
  expect(await screen.findByText('bob@test.com')).toBeInTheDocument();
});

test('opens QR scanner modal when button clicked', async () => {
  renderDashboard();
  await screen.findByText((c) => c.includes('Dr. Jean Martin'));
  fireEvent.click(screen.getByText(/Scanner QR Patient/));
  expect(await screen.findByText((c) => c.includes("Glissez l'image QR ici"))).toBeInTheDocument();
});

test('logout on topbar click', async () => {
  renderDashboard();
  await screen.findByText((c) => c.includes('Dr. Jean Martin'));
  const profileBtn = screen.getByTitle('Déconnexion');
  fireEvent.click(profileBtn);
  expect(mockLogout).toHaveBeenCalled();
});
