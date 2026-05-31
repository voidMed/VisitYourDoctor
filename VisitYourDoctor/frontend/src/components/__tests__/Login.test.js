import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import Login from '../Login';
import api from '../../api/api';

jest.mock('../../api/api');

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test('renders login form', () => {
  renderLogin();
  expect(screen.getByText('Connexion')).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Votre nom d'utilisateur")).toBeInTheDocument();
  expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  expect(screen.getByText('Se connecter')).toBeInTheDocument();
});

test('shows error on failed login', async () => {
  api.post.mockRejectedValueOnce(new Error('Invalid credentials'));
  renderLogin();

  fireEvent.change(screen.getByPlaceholderText("Votre nom d'utilisateur"), {
    target: { value: 'wrong' },
  });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), {
    target: { value: 'wrong' },
  });
  fireEvent.click(screen.getByText('Se connecter'));

  expect(await screen.findByText('Identifiants incorrects. Veuillez réessayer.')).toBeInTheDocument();
});

test('disables submit button while loading', async () => {
  api.post.mockImplementation(() => new Promise(() => {}));
  renderLogin();

  fireEvent.change(screen.getByPlaceholderText("Votre nom d'utilisateur"), {
    target: { value: 'testuser' },
  });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), {
    target: { value: 'password' },
  });
  fireEvent.click(screen.getByText('Se connecter'));

  expect(await screen.findByText('Connexion...')).toBeInTheDocument();
  expect(screen.getByText('Connexion...')).toBeDisabled();
});

test('has link to register page', () => {
  renderLogin();
  const link = screen.getByText("S'inscrire");
  expect(link).toBeInTheDocument();
  expect(link.closest('a')).toHaveAttribute('href', '/register');
});
