import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/api';

export default function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAgent() {
      setLoading(true);
      setError(null);
      try {
        console.log('Tentative de récupération de l\'agent ID:', id);
        const res = await api.get(`/agent/${id}`);
        
        console.log('Réponse API AgentDetail:', res);
        console.log('Données reçues:', res.data);
        
        if (res.data) {
          setAgent(res.data);
        } else {
          setError('Aucune donnée reçue');
        }
      } catch (err) {
        console.error('Erreur détaillée:', err);
        console.error('Response error:', err.response);
        
        if (err.response) {
          // Erreur avec réponse du serveur
          setError(`Erreur ${err.response.status}: ${err.response.data?.message || 'Agent non trouvé'}`);
        } else if (err.request) {
          // Erreur de réseau
          setError('Erreur de connexion au serveur');
        } else {
          // Autre erreur
          setError('Erreur inattendue');
        }
        setAgent(null);
      } finally {
        setLoading(false);
      }
    }
    
    if (id) {
      fetchAgent();
    } else {
      setError('ID d\'agent manquant');
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3">Chargement...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold mb-4">Détails Agent</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          <strong>Erreur :</strong> {error}
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold mb-4">Détails Agent</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-xl">
          Agent introuvable
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Détails Agent #{agent.id}</h1>
      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <strong className="block text-gray-600 mb-1">Nom :</strong>
            <span>{agent.name || 'Non spécifié'}</span>
          </div>
          <div>
            <strong className="block text-gray-600 mb-1">Email :</strong>
            <span>{agent.email || 'Non spécifié'}</span>
          </div>
          <div>
            <strong className="block text-gray-600 mb-1">Statut :</strong>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              agent.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {agent.status || 'inconnu'}
            </span>
          </div>
          <div>
            <strong className="block text-gray-600 mb-1">Pays :</strong>
            <span>{agent.country || 'Non spécifié'}</span>
          </div>
        </div>
        
        {/* Informations supplémentaires si disponibles */}
        {agent.createdAt && (
          <div className="pt-4 border-t">
            <strong className="block text-gray-600 mb-1">Date de création :</strong>
            <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}