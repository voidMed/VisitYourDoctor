import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('./api/api');

beforeEach(() => {
  localStorage.clear();
});

test('renders login page when not authenticated', async () => {
  render(<App />);
  expect(await screen.findByText('Connexion')).toBeInTheDocument();
  expect(screen.getByText('Ma Santé')).toBeInTheDocument();
});

test('renders login form elements', async () => {
  render(<App />);
  expect(await screen.findByText('Nom d\'utilisateur')).toBeInTheDocument();
  expect(screen.getByText('Mot de passe')).toBeInTheDocument();
  expect(screen.getByText('Se connecter')).toBeInTheDocument();
});

test('has a link to register page', async () => {
  render(<App />);
  const registerLink = await screen.findByText('S\'inscrire');
  expect(registerLink).toBeInTheDocument();
  expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
});
