import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import Register from '../Register';

jest.mock('../../api/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
}));

const api = require('../../api/api');

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <Register />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test('renders register form', () => {
  renderRegister();
  expect(screen.getByText('Créer un compte')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Prénom')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Nom')).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Nom d'utilisateur")).toBeInTheDocument();
  expect(screen.getByPlaceholderText('email@exemple.com')).toBeInTheDocument();
  expect(screen.getByText('Créer mon compte')).toBeInTheDocument();
});

test('shows error when passwords do not match', async () => {
  renderRegister();

  fireEvent.change(screen.getByPlaceholderText('Prénom'), { target: { value: 'John' } });
  fireEvent.change(screen.getByPlaceholderText('Nom'), { target: { value: 'Doe' } });
  fireEvent.change(screen.getByPlaceholderText("Nom d'utilisateur"), { target: { value: 'johndoe' } });
  fireEvent.change(screen.getByPlaceholderText('email@exemple.com'), { target: { value: 'john@test.com' } });
  fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'pass1' } });
  fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], { target: { value: 'pass2' } });
  fireEvent.click(screen.getByText('Créer mon compte'));

  expect(await screen.findByText('Les mots de passe ne correspondent pas.')).toBeInTheDocument();
});

test('shows doctor fields when role is doctor', () => {
  renderRegister();

  const selects = screen.getAllByRole('combobox');
  const roleSelect = selects[0];
  fireEvent.change(roleSelect, { target: { value: 'doctor' } });

  expect(screen.getByText('Spécialité')).toBeInTheDocument();
  expect(screen.getByText("N° de licence")).toBeInTheDocument();
});

test('submits form successfully', async () => {
  api.post.mockResolvedValueOnce({
    data: {
      tokens: { access: 'fake-access', refresh: 'fake-refresh' },
      user: { id: 1, username: 'johndoe', role: 'patient' },
    },
  });

  renderRegister();

  fireEvent.change(screen.getByPlaceholderText('Prénom'), { target: { value: 'John' } });
  fireEvent.change(screen.getByPlaceholderText('Nom'), { target: { value: 'Doe' } });
  fireEvent.change(screen.getByPlaceholderText("Nom d'utilisateur"), { target: { value: 'johndoe' } });
  fireEvent.change(screen.getByPlaceholderText('email@exemple.com'), { target: { value: 'john@test.com' } });
  fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'password123' } });
  fireEvent.change(screen.getAllByPlaceholderText('••••••••')[1], { target: { value: 'password123' } });
  fireEvent.click(screen.getByText('Créer mon compte'));

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/users/register/', expect.any(Object));
  });
});

test('has link to login page', () => {
  renderRegister();
  const link = screen.getByText('Se connecter');
  expect(link).toBeInTheDocument();
  expect(link.closest('a')).toHaveAttribute('href', '/login');
});
