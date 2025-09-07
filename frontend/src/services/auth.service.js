// src/services/auth.service.js
import api from '../api/api';
import jwt_decode from 'jwt-decode';

const ADMIN_TOKEN_KEY = 'admin_token';

export async function adminLogin({ email, password }) {
  // adapte endpoint si nécessaire
  const res = await api.post('/admin/login', { email, password });
  const { token } = res.data;
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }
  return res.data;
}

export function logout() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function getAdminProfileFromToken() {
  const token = getAdminToken();
  if (!token) return null;
  try {
    return jwt_decode(token);
  } catch {
    return null;
  }
}

export async function fetchAdminProfile() {
  // endpoint backend : /api/admin/profile (adapter si différent)
  const res = await api.get('/admin/profile');
  return res.data;
}
