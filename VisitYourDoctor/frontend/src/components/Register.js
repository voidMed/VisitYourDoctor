import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '',
    password: '', password2: '', role: 'patient', phone: '',
    specialty: '', license_number: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password2) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Erreur lors de l\'inscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <span className="logo-icon">🏥</span>
          <h1>Ma Santé</h1>
        </div>
        <h2>Créer un compte</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Prénom</label>
              <input type="text" value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
                placeholder="Prénom" required />
            </div>
            <div className="form-group">
              <label>Nom</label>
              <input type="text" value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
                placeholder="Nom" required />
            </div>
          </div>
          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input type="text" value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="Nom d'utilisateur" required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="email@exemple.com" required />
          </div>
          <div className="form-group">
            <label>Téléphone</label>
            <input type="tel" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="06 01 02 03 04" />
          </div>
          <div className="form-group">
            <label>Vous êtes</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="patient">Patient</option>
              <option value="doctor">Médecin</option>
            </select>
          </div>
          {form.role === 'doctor' && (
            <div className="form-row">
              <div className="form-group">
                <label>Spécialité</label>
                <select value={form.specialty}
                  onChange={e => setForm({ ...form, specialty: e.target.value })} required>
                  <option value="">Choisir...</option>
                  <option value="cardiologie">Cardiologie</option>
                  <option value="dentiste">Dentiste</option>
                  <option value="pediatrie">Pédiatrie</option>
                  <option value="generaliste">Généraliste</option>
                  <option value="dermatologie">Dermatologie</option>
                  <option value="ophtalmologie">Ophtalmologie</option>
                </select>
              </div>
              <div className="form-group">
                <label>N° de licence</label>
                <input type="text" value={form.license_number}
                  onChange={e => setForm({ ...form, license_number: e.target.value })}
                  placeholder="LIC-12345" required />
              </div>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label>Mot de passe</label>
              <input type="password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••" required />
            </div>
            <div className="form-group">
              <label>Confirmer</label>
              <input type="password" value={form.password2}
                onChange={e => setForm({ ...form, password2: e.target.value })}
                placeholder="••••••••" required />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Inscription...' : 'Créer mon compte'}
          </button>
        </form>
        <p className="auth-link">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}