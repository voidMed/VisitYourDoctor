import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import AppointmentForm from './AppointmentForm';
import AppointmentList from './AppointmentList';
import { QRCodeSVG } from 'qrcode.react';

const SPECIALTIES = [
  { label: 'Cardiologie', icon: '❤️', value: 'cardiologie' },
  { label: 'Dentiste', icon: '🦷', value: 'dentiste' },
  { label: 'Pédiatrie', icon: '👶', value: 'pediatrie' },
  { label: 'Généraliste', icon: '🩺', value: 'generaliste' },
  { label: 'Dermatologie', icon: '🔬', value: 'dermatologie' },
  { label: 'Ophtalmologie', icon: '👁️', value: 'ophtalmologie' },
];

export default function DashboardPatient() {
  const { user, logout } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [search, setSearch] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [showDossier, setShowDossier] = useState(false);
  const qrRef = useRef(null);

  const fetchAppointments = () => {
    api.get('/appointments/').then(res => setAppointments(res.data.results || res.data));
  };

  useEffect(() => {
    fetchAppointments();
    api.get('/users/doctors/').then(res => setDoctors(res.data)).catch(() => setDoctors([]));
  }, []);

  const cancelAppointment = async (id) => {
    if (window.confirm('Annuler ce rendez-vous ?')) {
      await api.patch(`/appointments/${id}/`, { status: 'cancelled' });
      fetchAppointments();
    }
  };

  const upcoming = appointments.filter(a =>
    ['confirmed', 'pending'].includes(a.status) && new Date(a.date) >= new Date()
  ).slice(0, 3);

  const searchLower = search.trim().toLowerCase();
  const isSearching = searchLower.length > 0;

  const filteredSpecialties = isSearching
    ? SPECIALTIES.filter(s => s.label.toLowerCase().includes(searchLower) || s.value.toLowerCase().includes(searchLower))
    : SPECIALTIES.slice(0, 3);

  const filteredDoctors = isSearching
    ? doctors.filter(d => {
        const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
        const specialty = d.doctor_profile?.specialty?.toLowerCase() || '';
        return fullName.includes(searchLower) || specialty.includes(searchLower);
      })
    : [];

  // QR Code data - contains patient ID + key medical info
  const qrData = JSON.stringify({
    patient_id: user?.id,
    name: `${user?.first_name} ${user?.last_name}`,
    blood_type: user?.patient_profile?.blood_type || '',
    allergies: user?.patient_profile?.allergies || '',
    medical_history: user?.patient_profile?.medical_history || '',
  });

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = `qr-patient-${user?.id}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="patient-app">
      {/* Header */}
      <div className="patient-header">
        <span className="app-title">MA SANTÉ</span>
        <button className="avatar-btn" onClick={logout} title="Déconnexion">
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </button>
      </div>

      {/* Content */}
      <div className="patient-content">
        {activeTab === 'home' && (
          <>
            {/* Hero Search */}
            <div className="hero-search">
              <h2>PRENDRE UN RENDEZ-VOUS</h2>
              <div className="search-bar">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Chercher par spécialité, médecin..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button className="search-clear-btn" onClick={() => setSearch('')}>✕</button>
                )}
              </div>
            </div>

            {/* Search Results */}
            {isSearching ? (
              <>
                {/* Matching Specialties */}
                {filteredSpecialties.length > 0 && (
                  <section className="section">
                    <h3 className="section-title">Spécialités correspondantes</h3>
                    <div className="specialty-grid">
                      {filteredSpecialties.map(s => (
                        <button key={s.value} className="specialty-card"
                          onClick={() => setShowForm(true)}>
                          <span className="specialty-icon">{s.icon}</span>
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Matching Doctors */}
                {filteredDoctors.length > 0 && (
                  <section className="section">
                    <h3 className="section-title">Médecins trouvés</h3>
                    <div className="search-results-list">
                      {filteredDoctors.map(doc => (
                        <div key={doc.id} className="search-result-card" onClick={() => setShowForm(true)}>
                          <div className="doc-avatar">
                            {doc.first_name?.[0]}{doc.last_name?.[0]}
                          </div>
                          <div className="search-result-info">
                            <strong>Dr. {doc.first_name} {doc.last_name}</strong>
                            <span>{doc.doctor_profile?.specialty
                              ? SPECIALTIES.find(s => s.value === doc.doctor_profile.specialty)?.label || doc.doctor_profile.specialty
                              : 'Spécialité non définie'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* No results */}
                {filteredSpecialties.length === 0 && filteredDoctors.length === 0 && (
                  <section className="section">
                    <div className="empty-card">
                      <p>Aucun résultat pour « {search} »</p>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <>
                {/* Top Specialties */}
                <section className="section">
                  <h3 className="section-title">Top Spécialités</h3>
                  <div className="specialty-grid">
                    {filteredSpecialties.map(s => (
                      <button key={s.value} className="specialty-card"
                        onClick={() => setShowForm(true)}>
                        <span className="specialty-icon">{s.icon}</span>
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Upcoming Appointments */}
                <section className="section">
                  <h3 className="section-title">Mes Prochains Rendez-vous</h3>
                  {upcoming.length === 0 ? (
                    <div className="empty-card">
                      <p>Aucun rendez-vous à venir</p>
                      <button className="btn-primary" onClick={() => setShowForm(true)}>
                        Prendre un RDV
                      </button>
                    </div>
                  ) : (
                    <div className="upcoming-grid">
                      {upcoming.map(apt => (
                        <div key={apt.id} className="upcoming-card">
                          <div className="doc-avatar">
                            {apt.doctor_detail?.first_name?.[0]}{apt.doctor_detail?.last_name?.[0]}
                          </div>
                          <div className="upcoming-info">
                            <strong>Dr. {apt.doctor_detail?.first_name} {apt.doctor_detail?.last_name}</strong>
                            <span>📅 {new Date(apt.date).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'short'
                            })}, {apt.time?.slice(0, 5)}</span>
                            <span className={`status-badge status-${apt.status}`}>
                              {apt.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}

        {activeTab === 'agenda' && (
          <section className="section">
            <div className="section-header">
              <h3 className="section-title">Mon Agenda</h3>
              <button className="btn-primary-sm" onClick={() => setShowForm(true)}>+ Nouveau</button>
            </div>
            <AppointmentList appointments={appointments} onCancel={cancelAppointment} role="patient" />
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="section">
            <h3 className="section-title">Mon Profil</h3>
            <div className="profile-card">
              <div className="profile-avatar large">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <h4>{user?.first_name} {user?.last_name}</h4>
              <p>{user?.email}</p>
              <p>{user?.phone}</p>
              <button className="btn-qr" onClick={() => setShowQR(true)}>
                <span>📱</span> Mon QR Code
              </button>
              <button className="btn-dossier" onClick={() => setShowDossier(true)}>
                <span>📋</span> Mon Dossier Médical
              </button>
              <button className="btn-danger" onClick={logout}>Se déconnecter</button>
            </div>
          </section>
        )}

        {/* QR Code Modal */}
        {showQR && (
          <div className="modal-overlay" onClick={() => setShowQR(false)}>
            <div className="modal-card qr-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Mon QR Code Médical</h3>
                <button className="close-btn" onClick={() => setShowQR(false)}>✕</button>
              </div>
              <div className="qr-display" ref={qrRef}>
                <QRCodeSVG
                  value={qrData}
                  size={220}
                  level="H"
                  includeMargin={true}
                  fgColor="#1a2332"
                  bgColor="#ffffff"
                />
              </div>
              <p className="qr-hint">Présentez ce QR code à votre médecin pour accéder à votre dossier médical.</p>
              <div className="qr-info-summary">
                <div className="qr-info-row"><span>👤</span><span>{user?.first_name} {user?.last_name}</span></div>
                {user?.patient_profile?.blood_type && (
                  <div className="qr-info-row"><span>🩸</span><span>Groupe: {user.patient_profile.blood_type}</span></div>
                )}
                {user?.patient_profile?.allergies && (
                  <div className="qr-info-row"><span>⚠️</span><span>Allergies: {user.patient_profile.allergies}</span></div>
                )}
              </div>
              <button className="btn-primary" onClick={downloadQR}>📥 Télécharger le QR Code</button>
            </div>
          </div>
        )}

        {/* Dossier Médical Modal */}
        {showDossier && (
          <div className="modal-overlay" onClick={() => setShowDossier(false)}>
            <div className="modal-card patient-file-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Mon Dossier Médical</h3>
                <button className="close-btn" onClick={() => setShowDossier(false)}>✕</button>
              </div>

              <div className="patient-file-content">
                {/* Patient Identity */}
                <div className="pf-identity">
                  <div className="doc-avatar pf-avatar">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </div>
                  <div>
                    <h4>{user?.first_name} {user?.last_name}</h4>
                    <span className="pf-meta">
                      {user?.date_of_birth
                        ? `${new Date().getFullYear() - new Date(user.date_of_birth).getFullYear()} ans`
                        : 'Âge non renseigné'}
                      {user?.patient_profile?.blood_type
                        ? ` • Groupe ${user.patient_profile.blood_type}`
                        : ''}
                    </span>
                  </div>
                </div>

                {/* 1. Medical Information */}
                <div className="pf-section">
                  <h4>🏥 Informations Médicales</h4>
                  <div className="pf-grid">
                    <div className="pf-card">
                      <div className="pf-card-icon">🩸</div>
                      <label>Groupe sanguin</label>
                      <p>{user?.patient_profile?.blood_type || '—'}</p>
                    </div>
                    <div className="pf-card">
                      <div className="pf-card-icon">⚠️</div>
                      <label>Allergies détaillées</label>
                      <p>{user?.patient_profile?.allergies || 'Aucune allergie connue'}</p>
                    </div>
                    <div className="pf-card pf-card-wide">
                      <div className="pf-card-icon">🩺</div>
                      <label>Antécédents médicaux (maladies chroniques)</label>
                      <p>{user?.patient_profile?.chronic_diseases || 'Aucun antécédent'}</p>
                    </div>
                    <div className="pf-card pf-card-wide">
                      <div className="pf-card-icon">🔪</div>
                      <label>Antécédents chirurgicaux</label>
                      <p>{user?.patient_profile?.past_surgeries || 'Aucune chirurgie'}</p>
                    </div>
                    <div className="pf-card pf-card-wide">
                      <div className="pf-card-icon">💊</div>
                      <label>Traitements en cours</label>
                      <p>{user?.patient_profile?.current_treatments || 'Aucun traitement'}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Vital Signs */}
                <div className="pf-section">
                  <h4>💓 Signes Vitaux</h4>
                  {user?.vital_signs && user.vital_signs.length > 0 ? (
                    <div className="pf-vitals-card">
                      {(() => {
                        const latest = user.vital_signs[0];
                        return (
                          <>
                            <div className="pf-vitals-date">
                              Dernière mesure : {new Date(latest.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="pf-vitals-grid">
                              <div className="pf-vital-item">
                                <span className="pf-vital-icon">🫀</span>
                                <span className="pf-vital-label">Tension</span>
                                <span className="pf-vital-value">
                                  {latest.blood_pressure_systolic && latest.blood_pressure_diastolic
                                    ? `${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic} mmHg`
                                    : '—'}
                                </span>
                              </div>
                              <div className="pf-vital-item">
                                <span className="pf-vital-icon">❤️</span>
                                <span className="pf-vital-label">Fréq. cardiaque</span>
                                <span className="pf-vital-value">{latest.heart_rate ? `${latest.heart_rate} bpm` : '—'}</span>
                              </div>
                              <div className="pf-vital-item">
                                <span className="pf-vital-icon">⚖️</span>
                                <span className="pf-vital-label">Poids</span>
                                <span className="pf-vital-value">{latest.weight ? `${latest.weight} kg` : '—'}</span>
                              </div>
                              <div className="pf-vital-item">
                                <span className="pf-vital-icon">📏</span>
                                <span className="pf-vital-label">Taille</span>
                                <span className="pf-vital-value">{latest.height ? `${latest.height} cm` : '—'}</span>
                              </div>
                              <div className="pf-vital-item">
                                <span className="pf-vital-icon">📊</span>
                                <span className="pf-vital-label">IMC</span>
                                <span className="pf-vital-value">{latest.bmi ? latest.bmi : '—'}</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="pf-empty">Aucune mesure enregistrée</p>
                  )}
                </div>

                {/* 3. Consultation History (enhanced) */}
                <div className="pf-section">
                  <h4>📅 Historique des Consultations</h4>
                  {appointments.length === 0 ? (
                    <p className="pf-empty">Aucune consultation</p>
                  ) : (
                    <div className="pf-history-list">
                      {appointments.map(apt => (
                        <div key={apt.id} className="pf-history-item">
                          <div className="pf-history-date">
                            <strong>{new Date(apt.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                            <span>{apt.time?.slice(0, 5)}</span>
                          </div>
                          <div className="pf-history-info">
                            <span>Dr. {apt.doctor_detail?.first_name} {apt.doctor_detail?.last_name}</span>
                            <span className={`status-badge status-${apt.status}`}>
                              {apt.status === 'confirmed' ? 'Confirmé' : apt.status === 'completed' ? 'Terminé' : apt.status === 'cancelled' ? 'Annulé' : 'En attente'}
                            </span>
                          </div>
                          {apt.reason && <p className="pf-history-notes">📌 Motif : {apt.reason}</p>}
                          {apt.diagnosis && <p className="pf-history-notes">🔬 Diagnostic : {apt.diagnosis}</p>}
                          {apt.notes && <p className="pf-history-notes">📝 Notes : {apt.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Medical Documents */}
                <div className="pf-section">
                  <h4>📄 Documents Médicaux</h4>
                  {user?.medical_documents && user.medical_documents.length > 0 ? (
                    <div className="pf-docs-list">
                      {user.medical_documents.map(doc => (
                        <div key={doc.id} className="pf-doc-item">
                          <div className="pf-doc-icon">
                            {doc.doc_type === 'prescription' ? '💊' : doc.doc_type === 'lab_result' ? '🧪' : doc.doc_type === 'report' ? '📄' : doc.doc_type === 'imaging' ? '🩻' : '📎'}
                          </div>
                          <div className="pf-doc-info">
                            <strong>{doc.title}</strong>
                            <span>{doc.doc_type_display} {doc.doctor_name ? `• ${doc.doctor_name}` : ''}</span>
                            <span className="pf-small">{new Date(doc.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          {doc.file && (
                            <a href={doc.file} target="_blank" rel="noopener noreferrer" className="pf-doc-dl">📥</a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="pf-empty">Aucun document</p>
                  )}
                </div>

                {/* Emergency Contact */}
                <div className="pf-section">
                  <h4>🆘 Contact d'urgence</h4>
                  <div className="pf-grid">
                    <div className="pf-card">
                      <div className="pf-card-icon">📞</div>
                      <label>Personne à contacter</label>
                      <p>{user?.patient_profile?.emergency_contact || '—'}</p>
                      <p className="pf-small">{user?.patient_profile?.emergency_phone || ''}</p>
                    </div>
                    <div className="pf-card">
                      <div className="pf-card-icon">📧</div>
                      <label>Contact patient</label>
                      <p>{user?.email || '—'}</p>
                      <p className="pf-small">{user?.phone || ''}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {[
          { key: 'home', icon: '🏠', label: 'Accueil' },
          { key: 'agenda', icon: '📅', label: 'Agenda' },
          { key: 'profile', icon: '👤', label: 'Profil' },
        ].map(tab => (
          <button key={tab.key}
            className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}>
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* New Appointment Modal */}
      {showForm && (
        <AppointmentForm
          onSuccess={fetchAppointments}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* FAB */}
      <button className="fab" onClick={() => setShowForm(true)}>+</button>
    </div>
  );
}