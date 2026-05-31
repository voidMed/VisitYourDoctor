import React, { useState, useEffect } from 'react';
import api from '../api/api';

export default function AppointmentForm({ onSuccess, onClose }) {
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    doctor: '', date: '', time: '', reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users/doctors/').then(res => setDoctors(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/appointments/', form);
      onSuccess && onSuccess();
      onClose && onClose();
    } catch (err) {
      setError(err.response?.data?.non_field_errors?.[0] || 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Prendre un rendez-vous</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Médecin</label>
            <select value={form.doctor}
              onChange={e => setForm({ ...form, doctor: e.target.value })} required>
              <option value="">Choisir un médecin...</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  Dr. {d.first_name} {d.last_name}
                  {d.doctor_profile && ` - ${d.doctor_profile.specialty}`}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Heure</label>
              <select value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })} required>
                <option value="">Choisir...</option>
                {timeSlots.map(t => <option key={t} value={t + ':00'}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Motif de consultation</label>
            <textarea value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder="Décrivez brièvement votre motif de visite..."
              rows={3} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Confirmation...' : 'Confirmer le RDV'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}