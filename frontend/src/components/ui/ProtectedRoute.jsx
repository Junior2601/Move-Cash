import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;

  // Optionnel: contrôle de rôle via payload (si tu inclus role dans token)
  if (role && user?.payload?.role !== role) return <Navigate to="/admin/login" replace />;

  return children;
}