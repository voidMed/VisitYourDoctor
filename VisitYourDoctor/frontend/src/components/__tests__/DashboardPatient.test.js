import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPatient from '../DashboardPatient';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';

jest.mock('../../api/api');

const mockLogout = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1, username: 'alice', first_name: 'Alice', last_name: 'Durand',
      email: 'alice@test.com', phone: '0612345678', role: 'patient',
      patient_profile: { blood_type: 'A+', allergies: 'Pollen', medical_history: '', emergency_contact: 'Bob', emergency_phone: '0698765432', chronic_diseases: '', past_surgeries: '', current_treatments: '' },
      vital_signs: [], medical_documents: [],
    },
    logout: mockLogout,
    token: 'fake-token',
  }),
}));

jest.mock('qrcode.react', () => ({
  QRCodeSVG: () => <svg data-testid="qr-code-svg">QR</svg>,
}));

const mockDoctors = [
  { id: 1, first_name: 'Jean', last_name: 'Martin', doctor_profile: { specialty: 'cardiologie' } },
  { id: 2, first_name: 'Marie', last_name: 'Curie', doctor_profile: { specialty: 'generaliste' } },
];

const mockAppointments = [
  {
    id: 1, date: '2026-07-15', time: '09:00:00', status: 'confirmed',
    reason: 'Check-up', doctor_detail: { first_name: 'Jean', last_name: 'Martin' },
    patient_detail: { first_name: 'Alice', last_name: 'Durand' },
  },
  {
    id: 2, date: '2026-08-01', time: '14:00:00', status: 'pending',
    reason: 'Suivi', doctor_detail: { first_name: 'Marie', last_name: 'Curie' },
    patient_detail: { first_name: 'Alice', last_name: 'Durand' },
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockLogout.mockClear();
  api.get.mockImplementation((url) => {
    if (url === '/appointments/') return Promise.resolve({ data: mockAppointments });
    if (url === '/users/doctors/') return Promise.resolve({ data: mockDoctors });
    return Promise.resolve({ data: [] });
  });
});

function renderDashboard() {
  return render(<DashboardPatient />);
}

test('renders header with app title', async () => {
  renderDashboard();
  expect(await screen.findByText('MA SANTÉ')).toBeInTheDocument();
});

test('renders header with user initials', async () => {
  renderDashboard();
  expect(await screen.findByText('AD')).toBeInTheDocument();
});

test('renders search section', async () => {
  renderDashboard();
  expect(await screen.findByText('PRENDRE UN RENDEZ-VOUS')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Chercher par spécialité, médecin...')).toBeInTheDocument();
});

test('shows top 3 specialties on home', async () => {
  renderDashboard();
  await waitFor(() => {
    expect(screen.getByText('Top Spécialités')).toBeInTheDocument();
  });
  expect(screen.getByText('Cardiologie')).toBeInTheDocument();
  expect(screen.getByText('Dentiste')).toBeInTheDocument();
  expect(screen.getByText('Pédiatrie')).toBeInTheDocument();
});

test('shows upcoming appointments section', async () => {
  renderDashboard();
  await waitFor(() => {
    expect(screen.getByText('Mes Prochains Rendez-vous')).toBeInTheDocument();
  });
  expect(screen.getByText('Dr. Jean Martin')).toBeInTheDocument();
});

test('shows empty state when no upcoming appointments', async () => {
  api.get.mockImplementation((url) => {
    if (url === '/appointments/') return Promise.resolve({ data: [] });
    if (url === '/users/doctors/') return Promise.resolve({ data: mockDoctors });
    return Promise.resolve({ data: [] });
  });
  renderDashboard();
  expect(await screen.findByText('Aucun rendez-vous à venir')).toBeInTheDocument();
  expect(screen.getByText('Prendre un RDV')).toBeInTheDocument();
});

test('navigates to agenda tab', async () => {
  renderDashboard();
  await screen.findByText('Dr. Jean Martin');
  fireEvent.click(screen.getByText('Agenda'));
  expect(await screen.findByText('Mon Agenda')).toBeInTheDocument();
});

test('navigates to profile tab', async () => {
  renderDashboard();
  await screen.findByText('Dr. Jean Martin');
  fireEvent.click(screen.getByText('Profil'));
  expect(await screen.findByText('Mon Profil')).toBeInTheDocument();
  expect(screen.getByText('alice@test.com')).toBeInTheDocument();
  expect(screen.getByText('0612345678')).toBeInTheDocument();
});

test('shows QR code modal when clicking Mon QR Code', async () => {
  renderDashboard();
  await screen.findByText('Dr. Jean Martin');
  fireEvent.click(screen.getByText('Profil'));
  await screen.findByText('Mon QR Code');
  fireEvent.click(screen.getByText('Mon QR Code'));
  expect(await screen.findByText('Mon QR Code Médical')).toBeInTheDocument();
  expect(screen.getByTestId('qr-code-svg')).toBeInTheDocument();
});

test('shows dossier modal when clicking Mon Dossier Médical', async () => {
  renderDashboard();
  await screen.findByText('Dr. Jean Martin');
  fireEvent.click(screen.getByText('Profil'));
  await screen.findByText('Mon Dossier Médical');
  fireEvent.click(screen.getByText('Mon Dossier Médical'));
  expect(await screen.findByText((content) => content.includes('Informations Médicales'))).toBeInTheDocument();
});

test('search filters specialties', async () => {
  renderDashboard();
  await screen.findByText('Top Spécialités');
  const searchInput = screen.getByPlaceholderText('Chercher par spécialité, médecin...');
  fireEvent.change(searchInput, { target: { value: 'cardio' } });
  expect(await screen.findByText('Spécialités correspondantes')).toBeInTheDocument();
  const found = await screen.findAllByText('Cardiologie');
  expect(found.length).toBeGreaterThanOrEqual(1);
  expect(screen.queryByText('Dentiste')).not.toBeInTheDocument();
});

test('search shows matching doctors', async () => {
  renderDashboard();
  await screen.findByText('Top Spécialités');
  const searchInput = screen.getByPlaceholderText('Chercher par spécialité, médecin...');
  fireEvent.change(searchInput, { target: { value: 'Curie' } });
  expect(await screen.findByText('Médecins trouvés')).toBeInTheDocument();
  expect(screen.getByText('Dr. Marie Curie')).toBeInTheDocument();
});

test('search shows no results message', async () => {
  renderDashboard();
  await screen.findByText('Top Spécialités');
  const searchInput = screen.getByPlaceholderText('Chercher par spécialité, médecin...');
  fireEvent.change(searchInput, { target: { value: 'zzzzzzz' } });
  expect(await screen.findByText(/Aucun résultat pour/)).toBeInTheDocument();
});

test('appointment form modal opens when FAB is clicked', async () => {
  renderDashboard();
  await screen.findByText('Top Spécialités');
  fireEvent.click(screen.getByText('+'));
  expect(await screen.findByText('Prendre un rendez-vous')).toBeInTheDocument();
});

test('appointment form modal opens when Prendre un RDV is clicked', async () => {
  api.get.mockImplementation((url) => {
    if (url === '/appointments/') return Promise.resolve({ data: [] });
    if (url === '/users/doctors/') return Promise.resolve({ data: mockDoctors });
    return Promise.resolve({ data: [] });
  });
  renderDashboard();
  expect(await screen.findByText('Prendre un RDV')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Prendre un RDV'));
  expect(await screen.findByText('Prendre un rendez-vous')).toBeInTheDocument();
});

test('logout button is in profile tab and works', async () => {
  renderDashboard();
  await screen.findByText('Dr. Jean Martin');
  fireEvent.click(screen.getByText('Profil'));
  await screen.findByText('Se déconnecter');
  fireEvent.click(screen.getByText('Se déconnecter'));
  expect(mockLogout).toHaveBeenCalled();
});
