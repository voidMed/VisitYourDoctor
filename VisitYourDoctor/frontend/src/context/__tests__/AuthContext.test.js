import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import api from '../../api/api';

jest.mock('../../api/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

function TestComponent() {
  const { user, token, login, register, logout, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="auth-status">
        {user ? `Logged in as ${user.username}` : 'Not logged in'}
      </div>
      <div data-testid="token-status">
        {token ? 'Has token' : 'No token'}
      </div>
      <button onClick={() => login('testuser', 'password')}>Login</button>
      <button onClick={() => register({ username: 'newuser', password: 'pass', password2: 'pass' })}>Register</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test('shows loading then not logged in when no token', async () => {
  renderWithProvider();
  expect(await screen.findByText('Not logged in')).toBeInTheDocument();
  expect(screen.getByText('No token')).toBeInTheDocument();
});

test('loads user profile when token exists', async () => {
  localStorage.setItem('access_token', 'fake-token');
  api.get.mockResolvedValue({ data: { id: 1, username: 'testuser', role: 'patient' } });

  renderWithProvider();
  expect(await screen.findByText('Logged in as testuser')).toBeInTheDocument();
  expect(screen.getByText('Has token')).toBeInTheDocument();
});

test('logs out user when profile fetch fails', async () => {
  localStorage.setItem('access_token', 'invalid-token');
  api.get.mockRejectedValue(new Error('Unauthorized'));

  renderWithProvider();
  expect(await screen.findByText('Not logged in')).toBeInTheDocument();
  expect(screen.getByText('No token')).toBeInTheDocument();
});

test('login sets user and token', async () => {
  api.get.mockResolvedValue({ data: { id: 1, username: 'testuser', role: 'patient' } });
  api.post.mockResolvedValue({
    data: {
      tokens: { access: 'new-access', refresh: 'new-refresh' },
      user: { id: 1, username: 'testuser', role: 'patient' },
    },
  });

  renderWithProvider();
  expect(await screen.findByText('Not logged in')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Login'));

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/users/login/', {
      username: 'testuser', password: 'password',
    });
  });

  expect(await screen.findByText('Logged in as testuser')).toBeInTheDocument();
  expect(screen.getByText('Has token')).toBeInTheDocument();
});

test('register sets user and token', async () => {
  api.get.mockResolvedValue({ data: { id: 2, username: 'newuser', role: 'patient' } });
  api.post.mockResolvedValue({
    data: {
      tokens: { access: 'new-access', refresh: 'new-refresh' },
      user: { id: 2, username: 'newuser', role: 'patient' },
    },
  });

  renderWithProvider();
  expect(await screen.findByText('Not logged in')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Register'));

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/users/register/', {
      username: 'newuser', password: 'pass', password2: 'pass',
    });
  });

  expect(await screen.findByText('Logged in as newuser')).toBeInTheDocument();
});

test('logout clears user and token', async () => {
  localStorage.setItem('access_token', 'fake-token');
  api.get.mockResolvedValue({ data: { id: 1, username: 'testuser', role: 'patient' } });

  renderWithProvider();
  expect(await screen.findByText('Logged in as testuser')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Logout'));

  expect(screen.getByText('Not logged in')).toBeInTheDocument();
  expect(screen.getByText('No token')).toBeInTheDocument();
  expect(localStorage.getItem('access_token')).toBeNull();
});
