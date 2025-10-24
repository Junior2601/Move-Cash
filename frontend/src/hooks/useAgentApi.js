// src/hooks/useAgentApi.js
import axios from 'axios';

const useAgentApi = () => {
  const agentToken = localStorage.getItem("agentToken");
  
  if (!agentToken) {
    throw new Error("Aucun token agent trouvé");
  }

  const api = axios.create({
    baseURL: "https://api.movecah.online/api",
    headers: {
      Authorization: `Bearer ${agentToken}`,
      "Content-Type": "application/json"
    }
  });

  // Intercepteur pour gérer les erreurs d'authentification
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("agentToken");
        localStorage.removeItem("agentInfo");
        window.location.href = '/agent/login';
      }
      return Promise.reject(error);
    }
  );

  return api;
};

export default useAgentApi;