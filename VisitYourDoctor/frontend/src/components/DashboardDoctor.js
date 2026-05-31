import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import AppointmentList from './AppointmentList';
import { Html5Qrcode } from 'html5-qrcode';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Tableau de Bord', icon: '⊞' },
  { key: 'agenda', label: 'Mon Agenda', icon: '📅' },
  { key: 'patients', label: 'Mes Patients', icon: '👥' },
  { key: 'analyses', label: 'Analyses', icon: '📊' },
  { key: 'settings', label: 'Paramètres', icon: '⚙️' },
];

export default function DashboardDoctor() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState([]);
  const [todayApts, setTodayApts] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedApt, setSelectedApt] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showScanner, setShowScanner] = useState(false);
  const [scannedPatient, setScannedPatient] = useState(null);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [scanError, setScanError] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setScanError('');
    setScanLoading(true);
    setUploadPreview(URL.createObjectURL(file));
    try {
      const html5QrCode = new Html5Qrcode('qr-upload-reader');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      const data = JSON.parse(decodedText);
      const patientId = data.patient_id;
      if (!patientId) {
        setScanError('QR code invalide : aucun ID patient trouvé.');
        setScanLoading(false);
        return;
      }
      const res = await api.get(`/users/patients/${patientId}/`);
      setScannedPatient(res.data.patient);
      setPatientAppointments(res.data.appointments || []);
      setShowScanner(false);
      setUploadPreview(null);
    } catch (err) {
      setScanError(err.response?.data?.error || 'Impossible de lire le QR code. Vérifiez l\'image.');
    }
    setScanLoading(false);
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const openScanner = () => {
    setScanError('');
    setUploadPreview(null);
    setShowScanner(true);
  };

  const closeScanner = () => {
    setShowScanner(false);
    setUploadPreview(null);
    setScanError('');
  };

  useEffect(() => {
    api.get('/appointments/').then(res => {
      const data = res.data.results || res.data;
      setAppointments(data);
      const today = new Date().toISOString().split('T')[0];
      setTodayApts(data.filter(a => a.date === today));
      if (data.length > 0) setSelectedApt(data[0]);
    });
    api.get('/appointments/stats/').then(res => setStats(res.data)).catch(() => setStats({}));
  }, []);

  const confirmAppointment = async (id) => {
    await api.patch(`/appointments/${id}/`, { status: 'confirmed' });
    const res = await api.get('/appointments/');
    setAppointments(res.data.results || res.data);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    const adjustedFirst = (firstDay + 6) % 7;
    for (let i = 0; i < adjustedFirst; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  return (
    <div className="doctor-app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-dot">✦</span>
          <span className="logo-text">Ma Santé</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button key={item.key}
              className={`sidebar-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}>
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="doctor-main">
        {/* Top Bar */}
        <header className="doctor-topbar">
          <div className="search-bar-doctor">
            <span>🔍</span>
            <input type="text" placeholder="Chercher par spécialité, médecin..." />
          </div>
          <div className="topbar-right">
            <button className="notif-btn">🔔</button>
            <div className="doctor-profile-btn" onClick={logout} title="Déconnexion">
              <div className="doc-avatar-sm">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <span>Dr. {user?.first_name} {user?.last_name}</span>
              <span>▾</span>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="dashboard-content">
            <div className="dashboard-title-row">
              <h1>Tableau de Bord</h1>
              <div className="title-row-actions">
                <button className="btn-scan" onClick={openScanner}>
                  📷 Scanner QR Patient
                </button>
                <button className="btn-primary" onClick={() => setActiveTab('agenda')}>
                  Modifier de RDV
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card" onClick={() => setActiveTab('agenda')} style={{cursor:'pointer'}}>
                <div>
                  <p className="stat-label">RDV Aujourd'hui</p>
                  <p className="stat-value">{stats.today_appointments || todayApts.length}</p>
                </div>
                <span className="stat-icon">📅</span>
              </div>
              <div className="stat-card" onClick={() => setActiveTab('patients')} style={{cursor:'pointer'}}>
                <div>
                  <p className="stat-label">Nouveaux Patients</p>
                  <p className="stat-value">{stats.new_patients || 0}</p>
                </div>
                <span className="stat-icon">👥</span>
              </div>
              <div className="stat-card" onClick={() => setActiveTab('agenda')} style={{cursor:'pointer'}}>
                <div>
                  <p className="stat-label">Taux de Confirmation</p>
                  <p className="stat-value">
                    {appointments.length > 0
                      ? Math.round(appointments.filter(a => a.status === 'confirmed').length / appointments.length * 100)
                      : 0}%
                  </p>
                </div>
                <span className="stat-icon">✅</span>
              </div>
              <div className="stat-card" onClick={() => setActiveTab('agenda')} style={{cursor:'pointer'}}>
                <div>
                  <p className="stat-label">Taux d'Annulation</p>
                  <p className="stat-value">{stats.cancellation_rate || 0}%</p>
                </div>
                <span className="stat-icon">%</span>
              </div>
            </div>

            {/* Main Grid */}
            <div className="dashboard-grid">
              {/* Calendar */}
              <div className="dashboard-card calendar-card">
                <div className="calendar-header">
                  <span className="calendar-title">Calendar</span>
                  <div className="calendar-nav">
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>‹</button>
                    <span>{months[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>›</button>
                  </div>
                </div>
                <div className="calendar-grid">
                  {['Lu', 'Mu', 'Mu', 'Ju', 'Vv', 'Sa', 'Su'].map((d, i) => (
                    <div key={i} className="calendar-day-label">{d}</div>
                  ))}
                  {getDaysInMonth(currentMonth).map((day, i) => {
                    const today = new Date();
                    const isToday = day === today.getDate() &&
                      currentMonth.getMonth() === today.getMonth() &&
                      currentMonth.getFullYear() === today.getFullYear();
                    const hasApt = day && appointments.some(a =>
                      new Date(a.date).getDate() === day &&
                      new Date(a.date).getMonth() === currentMonth.getMonth()
                    );
                    return (
                      <div key={i}
                        className={`calendar-day ${day ? '' : 'empty'} ${isToday ? 'today' : ''} ${hasApt && !isToday ? 'has-apt' : ''}`}>
                        {day}
                      </div>
                    );
                  })}
                </div>
                <div className="calendar-legend">
                  <span className="legend-item">
                    <span className="legend-dot confirmed"></span> Confirmé
                  </span>
                  <span className="legend-item">
                    <span className="legend-dot pending"></span> Pendante
                  </span>
                </div>
              </div>

              {/* Today's Appointments */}
              <div className="dashboard-card today-card">
                <div className="today-header">
                  <span>Aujourd'hui</span>
                  <select className="status-filter">
                    <option>Confirmé</option>
                    <option>En attente</option>
                  </select>
                </div>
                <div className="today-list">
                  {todayApts.length === 0 ? (
                    <div className="empty-state">Aucun RDV aujourd'hui</div>
                  ) : (
                    todayApts.map(apt => (
                      <div key={apt.id}
                        className={`today-apt ${apt.status === 'pending' ? 'apt-pending' : 'apt-confirmed'}`}
                        onClick={() => setSelectedApt(apt)}>
                        <div className="today-apt-info">
                          <strong>{apt.time?.slice(0, 5)} - {apt.patient_detail?.first_name} {apt.patient_detail?.last_name}</strong>
                          <span>{apt.reason || 'Consultation'}</span>
                        </div>
                        {apt.status === 'pending' && (
                          <button className="btn-confirm-small" onClick={(e) => { e.stopPropagation(); confirmAppointment(apt.id); }}>
                            ✓ Confirmer
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Patient Detail */}
              <div className="dashboard-card detail-card">
                <h4>Détails du Patient Prochain</h4>
                {selectedApt ? (
                  <>
                    <div className="patient-detail-header">
                      <div className="doc-avatar">
                        {selectedApt.patient_detail?.first_name?.[0]}
                        {selectedApt.patient_detail?.last_name?.[0]}
                      </div>
                      <div>
                        <strong>Dr. {selectedApt.patient_detail?.first_name} {selectedApt.patient_detail?.last_name}</strong>
                        <span>Age : {selectedApt.patient_detail?.date_of_birth
                          ? new Date().getFullYear() - new Date(selectedApt.patient_detail.date_of_birth).getFullYear()
                          : '—'}</span>
                      </div>
                    </div>
                    <div className="patient-detail-section">
                      <label>Raison de visite</label>
                      <p>{selectedApt.reason || 'Non spécifié'}</p>
                    </div>
                    <div className="patient-detail-section">
                      <label>Histoire médicale</label>
                      <p>{selectedApt.patient_detail?.patient_profile?.medical_history || 'Aucune information disponible'}</p>
                    </div>
                    <div className="detail-actions">
                      <label>Actions :</label>
                      <button className="btn-outline">Ouvrir Dossier</button>
                      {selectedApt.status === 'pending' && (
                        <button className="btn-outline" onClick={() => confirmAppointment(selectedApt.id)}>
                          Confirmer RDV
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="empty-state">Sélectionner un RDV</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="dashboard-content">
            <h1>Mon Agenda</h1>
            <AppointmentList appointments={appointments} role="doctor" onConfirm={confirmAppointment} />
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="dashboard-content">
            <h1>Mes Patients</h1>
            <div className="patients-grid">
              {[...new Map(appointments.map(a => [a.patient, a])).values()].map(apt => (
                <div key={apt.patient} className="patient-list-card">
                  <div className="doc-avatar">
                    {apt.patient_detail?.first_name?.[0]}{apt.patient_detail?.last_name?.[0]}
                  </div>
                  <div>
                    <strong>{apt.patient_detail?.first_name} {apt.patient_detail?.last_name}</strong>
                    <span>{apt.patient_detail?.email}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* QR Upload Modal */}
      {showScanner && (
        <div className="modal-overlay" onClick={closeScanner}>
          <div className="modal-card scanner-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Scanner QR Patient</h3>
              <button className="close-btn" onClick={closeScanner}>✕</button>
            </div>
            <div
              className={`upload-dropzone ${scanLoading ? 'loading' : ''}`}
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadPreview ? (
                <img src={uploadPreview} alt="QR Preview" className="upload-preview" />
              ) : (
                <>
                  <span className="upload-icon">📁</span>
                  <p className="upload-text">Glissez l'image QR ici</p>
                  <p className="upload-subtext">ou cliquez pour sélectionner un fichier</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                style={{ display: 'none' }}
              />
            </div>
            {/* Hidden element needed by html5-qrcode scanFile */}
            <div id="qr-upload-reader" style={{ display: 'none' }}></div>
            {scanLoading && <p className="qr-hint">Analyse en cours...</p>}
            {scanError && <div className="alert alert-error">{scanError}</div>}
            <p className="qr-hint">Uploadez l'image du QR code du patient (PNG, JPG).</p>
          </div>
        </div>
      )}

      {/* Scanned Patient File Modal */}
      {scannedPatient && (
        <div className="modal-overlay" onClick={() => setScannedPatient(null)}>
          <div className="modal-card patient-file-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Dossier Médical</h3>
              <button className="close-btn" onClick={() => setScannedPatient(null)}>✕</button>
            </div>

            <div className="patient-file-content">
              {/* Patient Identity */}
              <div className="pf-identity">
                <div className="doc-avatar pf-avatar">
                  {scannedPatient.first_name?.[0]}{scannedPatient.last_name?.[0]}
                </div>
                <div>
                  <h4>{scannedPatient.first_name} {scannedPatient.last_name}</h4>
                  <span className="pf-meta">
                    {scannedPatient.date_of_birth
                      ? `${new Date().getFullYear() - new Date(scannedPatient.date_of_birth).getFullYear()} ans`
                      : 'Âge inconnu'}
                    {scannedPatient.patient_profile?.blood_type
                      ? ` • Groupe ${scannedPatient.patient_profile.blood_type}`
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
                    <p>{scannedPatient.patient_profile?.blood_type || '—'}</p>
                  </div>
                  <div className="pf-card">
                    <div className="pf-card-icon">⚠️</div>
                    <label>Allergies détaillées</label>
                    <p>{scannedPatient.patient_profile?.allergies || 'Aucune allergie connue'}</p>
                  </div>
                  <div className="pf-card pf-card-wide">
                    <div className="pf-card-icon">🩺</div>
                    <label>Antécédents médicaux (maladies chroniques)</label>
                    <p>{scannedPatient.patient_profile?.chronic_diseases || 'Aucun antécédent'}</p>
                  </div>
                  <div className="pf-card pf-card-wide">
                    <div className="pf-card-icon">🔪</div>
                    <label>Antécédents chirurgicaux</label>
                    <p>{scannedPatient.patient_profile?.past_surgeries || 'Aucune chirurgie'}</p>
                  </div>
                  <div className="pf-card pf-card-wide">
                    <div className="pf-card-icon">💊</div>
                    <label>Traitements en cours</label>
                    <p>{scannedPatient.patient_profile?.current_treatments || 'Aucun traitement'}</p>
                  </div>
                </div>
              </div>

              {/* 2. Vital Signs */}
              <div className="pf-section">
                <h4>💓 Signes Vitaux</h4>
                {scannedPatient.vital_signs && scannedPatient.vital_signs.length > 0 ? (
                  <div className="pf-vitals-card">
                    {(() => {
                      const latest = scannedPatient.vital_signs[0];
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
                {patientAppointments.length === 0 ? (
                  <p className="pf-empty">Aucune consultation précédente</p>
                ) : (
                  <div className="pf-history-list">
                    {patientAppointments.map(apt => (
                      <div key={apt.id} className="pf-history-item">
                        <div className="pf-history-date">
                          <strong>{new Date(apt.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                          <span>{apt.time?.slice(0, 5)}</span>
                        </div>
                        <div className="pf-history-info">
                          <span>{apt.reason || 'Consultation générale'}</span>
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
                {scannedPatient.medical_documents && scannedPatient.medical_documents.length > 0 ? (
                  <div className="pf-docs-list">
                    {scannedPatient.medical_documents.map(doc => (
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
                    <p>{scannedPatient.patient_profile?.emergency_contact || '—'}</p>
                    <p className="pf-small">{scannedPatient.patient_profile?.emergency_phone || ''}</p>
                  </div>
                  <div className="pf-card">
                    <div className="pf-card-icon">📧</div>
                    <label>Contact patient</label>
                    <p>{scannedPatient.email || '—'}</p>
                    <p className="pf-small">{scannedPatient.phone || ''}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scan Error Toast */}
      {scanError && !showScanner && (
        <div className="scan-toast" onClick={() => setScanError('')}>
          <span>⚠️ {scanError}</span>
          <button onClick={() => setScanError('')}>✕</button>
        </div>
      )}
    </div>
  );
}