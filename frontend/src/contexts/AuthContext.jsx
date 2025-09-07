import React, { createContext, useState, useEffect } from 'react';
import {jwtDecode} from 'jwt-decode';
import api from '../api/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return null;
    try {
      const payload = jwtDecode(token);
      return { token, payload };
    } catch {
      return null;
    }
  });

  const login = async (credentials) => {
    // Attention: endpoint d'admin login à adapter si ton backend utilise /api/admin/login
    const res = await api.post('/admin/login', credentials);
    const { token } = res.data;
    localStorage.setItem('admin_token', token);
    const payload = jwtDecode(token);
    setUser({ token, payload });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setUser(null);
  };

  const isAuthenticated = !!user;

  useEffect(() => {
    // Optionnel: vérifier token expiré
    if (user) {
      const now = Date.now() / 1000;
      if (user.payload.exp && user.payload.exp < now) logout();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}
