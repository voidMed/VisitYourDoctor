import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import DashboardPatient from './components/DashboardPatient';
import DashboardDoctor from './components/DashboardDoctor';

function PrivateRoute({ children, role }) {
  const { user, token } = useAuth();
  if (!token) return <Navigate to="/login" />;
  if (role && user?.role !== role) return <Navigate to="/dashboard" />;
  return children;
}

function DashboardRouter() {
  const { user } = useAuth();
  if (user?.role === 'doctor') return <DashboardDoctor />;
  return <DashboardPatient />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={
            <PrivateRoute><DashboardRouter /></PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}