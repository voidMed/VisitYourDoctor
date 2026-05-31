import React from 'react';

const STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
  completed: 'Terminé',
};

const STATUS_COLORS = {
  pending: 'status-pending',
  confirmed: 'status-confirmed',
  cancelled: 'status-cancelled',
  completed: 'status-completed',
};

export default function AppointmentList({ appointments, onCancel, onConfirm, role }) {
  if (!appointments?.length) {
    return <div className="empty-state">Aucun rendez-vous trouvé.</div>;
  }

  return (
    <div className="appointment-list">
      {appointments.map(apt => (
        <div key={apt.id} className="appointment-card">
          <div className="apt-time">
            <span className="apt-hour">{apt.time?.slice(0, 5)}</span>
            <span className="apt-date">{new Date(apt.date).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short'
            })}</span>
          </div>
          <div className="apt-info">
            <div className="apt-name">
              {role === 'doctor'
                ? `${apt.patient_detail?.first_name} ${apt.patient_detail?.last_name}`
                : `Dr. ${apt.doctor_detail?.first_name} ${apt.doctor_detail?.last_name}`}
            </div>
            <div className="apt-reason">{apt.reason || 'Consultation'}</div>
          </div>
          <div className="apt-actions">
            <span className={`status-badge ${STATUS_COLORS[apt.status]}`}>
              {STATUS_LABELS[apt.status]}
            </span>
            {apt.status === 'pending' && role === 'doctor' && onConfirm && (
              <button className="btn-confirm-small"
                onClick={() => onConfirm(apt.id)}>✓ Confirmer</button>
            )}
            {apt.status === 'pending' && role === 'patient' && onCancel && (
              <button className="btn-cancel-small"
                onClick={() => onCancel(apt.id)}>Annuler</button>
            )}
            {apt.status === 'confirmed' && role === 'patient' && onCancel && (
              <button className="btn-cancel-small"
                onClick={() => onCancel(apt.id)}>Annuler</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}