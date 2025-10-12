import axios from 'axios';

export const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  // Vérifier si c'est un agent ou admin
  const agentToken = localStorage.getItem('agent_token');
  const adminToken = localStorage.getItem('admin_token');
  
  if (agentToken) {
    config.headers.Authorization = `Bearer ${agentToken}`;
  } else if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  
  return config;
});

export default api;