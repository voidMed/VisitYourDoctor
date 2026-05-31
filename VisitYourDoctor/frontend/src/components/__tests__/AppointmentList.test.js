import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AppointmentList from '../AppointmentList';

const mockAppointments = [
  {
    id: 1,
    date: '2026-06-15',
    time: '09:00:00',
    status: 'pending',
    reason: 'Douleur dentaire',
    doctor_detail: { first_name: 'Jean', last_name: 'Martin' },
    patient_detail: { first_name: 'Alice', last_name: 'Durand' },
  },
  {
    id: 2,
    date: '2026-06-20',
    time: '14:30:00',
    status: 'confirmed',
    reason: 'Consultation',
    doctor_detail: { first_name: 'Pierre', last_name: 'Dubois' },
    patient_detail: { first_name: 'Bob', last_name: 'Martin' },
  },
  {
    id: 3,
    date: '2026-05-01',
    time: '10:00:00',
    status: 'completed',
    reason: 'Bilan',
    doctor_detail: { first_name: 'Marie', last_name: 'Curie' },
    patient_detail: { first_name: 'Charlie', last_name: 'Durand' },
  },
];

test('renders empty state when no appointments', () => {
  render(<AppointmentList appointments={[]} role="patient" />);
  expect(screen.getByText('Aucun rendez-vous trouvé.')).toBeInTheDocument();
});

test('renders empty state when appointments is null', () => {
  render(<AppointmentList appointments={null} role="patient" />);
  expect(screen.getByText('Aucun rendez-vous trouvé.')).toBeInTheDocument();
});

test('renders appointments for patient role', () => {
  render(<AppointmentList appointments={mockAppointments} role="patient" />);
  expect(screen.getByText('Dr. Jean Martin')).toBeInTheDocument();
  expect(screen.getByText('Dr. Pierre Dubois')).toBeInTheDocument();
  expect(screen.getByText('En attente')).toBeInTheDocument();
  expect(screen.getByText('Confirmé')).toBeInTheDocument();
});

test('renders appointments for doctor role', () => {
  render(<AppointmentList appointments={mockAppointments} role="doctor" />);
  expect(screen.getByText('Alice Durand')).toBeInTheDocument();
  expect(screen.getByText('Bob Martin')).toBeInTheDocument();
});

test('shows confirm button for doctor on pending appointments', () => {
  const onConfirm = jest.fn();
  render(<AppointmentList appointments={mockAppointments} role="doctor" onConfirm={onConfirm} />);
  const confirmButtons = screen.getAllByText('✓ Confirmer');
  expect(confirmButtons.length).toBe(1);
  fireEvent.click(confirmButtons[0]);
  expect(onConfirm).toHaveBeenCalledWith(mockAppointments[0].id);
});

test('shows cancel button for patient on pending appointments', () => {
  const onCancel = jest.fn();
  render(<AppointmentList appointments={mockAppointments} role="patient" onCancel={onCancel} />);
  const cancelButtons = screen.getAllByText('Annuler');
  expect(cancelButtons.length).toBe(2);
  fireEvent.click(cancelButtons[0]);
  expect(onCancel).toHaveBeenCalledWith(mockAppointments[0].id);
});

test('does not show confirm button for patient role', () => {
  render(<AppointmentList appointments={mockAppointments} role="patient" />);
  expect(screen.queryByText('✓ Confirmer')).not.toBeInTheDocument();
});

test('shows cancelled and completed statuses', () => {
  const appointments = [
    { ...mockAppointments[0], id: 4, status: 'cancelled' },
    { ...mockAppointments[0], id: 5, status: 'completed' },
  ];
  render(<AppointmentList appointments={appointments} role="patient" />);
  expect(screen.getByText('Annulé')).toBeInTheDocument();
  expect(screen.getByText('Terminé')).toBeInTheDocument();
});
