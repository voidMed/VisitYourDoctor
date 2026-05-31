import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AppointmentForm from '../AppointmentForm';

jest.mock('../../api/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
}));

const api = require('../../api/api');

const mockDoctors = [
  { id: 1, first_name: 'Jean', last_name: 'Martin', doctor_profile: { specialty: 'cardiologie' } },
  { id: 2, first_name: 'Marie', last_name: 'Curie', doctor_profile: { specialty: 'generaliste' } },
];

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: mockDoctors });
});

test('renders the form with title', () => {
  render(<AppointmentForm onClose={jest.fn()} onSuccess={jest.fn()} />);
  expect(screen.getByText('Prendre un rendez-vous')).toBeInTheDocument();
});

test('loads doctors on mount', async () => {
  render(<AppointmentForm onClose={jest.fn()} onSuccess={jest.fn()} />);
  await waitFor(() => {
    expect(api.get).toHaveBeenCalledWith('/users/doctors/');
  });
});

test('renders doctor options', async () => {
  render(<AppointmentForm onClose={jest.fn()} onSuccess={jest.fn()} />);
  await screen.findByText('Dr. Jean Martin - cardiologie');
  expect(screen.getByText('Dr. Marie Curie - generaliste')).toBeInTheDocument();
});

test('submits the form', async () => {
  api.post.mockResolvedValueOnce({ data: { id: 1 } });
  const onSuccess = jest.fn();
  const onClose = jest.fn();

  const { container } = render(<AppointmentForm onSuccess={onSuccess} onClose={onClose} />);

  await screen.findByText('Dr. Jean Martin - cardiologie');

  fireEvent.change(screen.getByDisplayValue('Choisir un médecin...'), {
    target: { value: '1' },
  });

  const dateInput = container.querySelector('input[type="date"]');
  fireEvent.change(dateInput, { target: { value: '2026-06-20' } });

  fireEvent.change(screen.getByDisplayValue('Choisir...'), {
    target: { value: '09:00:00' },
  });

  fireEvent.change(screen.getByPlaceholderText('Décrivez brièvement votre motif de visite...'), {
    target: { value: 'Douleur dentaire' },
  });

  fireEvent.click(screen.getByText('Confirmer le RDV'));

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/appointments/', {
      doctor: '1', date: '2026-06-20', time: '09:00:00', reason: 'Douleur dentaire',
    });
  });

  expect(onSuccess).toHaveBeenCalled();
  expect(onClose).toHaveBeenCalled();
});

test('shows error on submission failure', async () => {
  api.post.mockRejectedValueOnce({
    response: { data: { non_field_errors: ['Créneau déjà pris.'] } },
  });

  const { container } = render(<AppointmentForm onClose={jest.fn()} onSuccess={jest.fn()} />);

  await screen.findByText('Dr. Jean Martin - cardiologie');

  fireEvent.change(screen.getByDisplayValue('Choisir un médecin...'), {
    target: { value: '1' },
  });

  const dateInput = container.querySelector('input[type="date"]');
  fireEvent.change(dateInput, { target: { value: '2026-06-20' } });

  fireEvent.change(screen.getByDisplayValue('Choisir...'), { target: { value: '09:00:00' } });

  fireEvent.click(screen.getByText('Confirmer le RDV'));

  expect(await screen.findByText('Créneau déjà pris.')).toBeInTheDocument();
});

test('calls onClose when cancel button is clicked', () => {
  const onClose = jest.fn();
  render(<AppointmentForm onClose={onClose} onSuccess={jest.fn()} />);
  fireEvent.click(screen.getByText('Annuler'));
  expect(onClose).toHaveBeenCalled();
});
