// src/pages/agent/MyTransactions.jsx
import React, { useEffect, useState } from "react";
import { RefreshCcw, CheckCircle, XCircle, Eye, AlertCircle } from "lucide-react";
import api from "../../api/api";
import { Link } from "react-router-dom";

export default function MyTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState(null);

  // Fonction pour récupérer l'agent connecté de manière sécurisée
  const getCurrentAgent = () => {
    try {
      // Essayer différentes méthodes pour récupérer l'agent
      const agentToken = localStorage.getItem('agent_token');
      if (!agentToken) {
        throw new Error('Agent non connecté');
      }

      // Méthode 1: agent_id direct
      const agentId = localStorage.getItem('agent_id');
      if (agentId) {
        return { id: parseInt(agentId) };
      }

      // Méthode 2: objet agent dans localStorage
      const agentData = localStorage.getItem('agent');
      if (agentData) {
        const agent = JSON.parse(agentData);
        if (agent && agent.id) {
          return agent;
        }
      }

      // Méthode 3: depuis le token (si stocké avec les données)
      const tokenData = JSON.parse(atob(agentToken.split('.')[1]));
      if (tokenData && tokenData.agentId) {
        return { id: tokenData.agentId };
      }

      throw new Error('Impossible de récupérer les informations de l\'agent');
    } catch (err) {
      console.error('Erreur récupération agent:', err);
      return null;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const currentAgent = getCurrentAgent();
      if (!currentAgent) {
        throw new Error('Agent non connecté. Veuillez vous reconnecter.');
      }

      console.log('Agent connecté:', currentAgent);

      // Récupérer les transactions de l'agent
      const resTx = await api.get(`/transactions/agent/transactions`);
      
      // Récupérer la liste des agents (pour la redirection)
      const resAgents = await api.get("/agents/list");
      
      setTransactions(resTx.data?.transactions || resTx.data || []);
      setAgents(resAgents.data || []);
    } catch (err) {
      console.error("Erreur transactions agent", err);
      if (err.response?.status === 401) {
        setError("Session expirée. Veuillez vous reconnecter.");
        // Redirection vers la page de login si nécessaire
        // window.location.href = '/agent/login';
      } else {
        setError(err.response?.data?.message || err.message || "Erreur lors du chargement des transactions");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (transactionId) => {
    setProcessing(transactionId);
    setError(null);
    try {
      await api.put(`/transactions/${transactionId}/validate-agent`);
      await fetchData(); // refresh
    } catch (err) {
      console.error("Erreur validation", err);
      setError(err.response?.data?.message || "Erreur lors de la validation");
    } finally {
      setProcessing(null);
    }
  };

  const handleCancel = async (transactionId) => {
    setProcessing(transactionId);
    setError(null);
    try {
      await api.put(`/transactions/${transactionId}/cancel-agent`);
      await fetchData(); // refresh
    } catch (err) {
      console.error("Erreur annulation", err);
      setError(err.response?.data?.message || "Erreur lors de l'annulation");
    } finally {
      setProcessing(null);
    }
  };

  const handleRedirect = async (transactionId, newAgentId) => {
    if (!newAgentId) return;
    
    setRedirecting(transactionId);
    setError(null);
    try {
      const transaction = transactions.find(t => t.id === transactionId);
      await api.post(`/transactions/redirect`, {
        transaction_id: transactionId,
        to_agent_id: newAgentId,
        redirected_amount: transaction?.send_amount || 0,
        reason: "Redirection par l'agent"
      });
      await fetchData(); // refresh
    } catch (err) {
      console.error("Erreur redirection", err);
      setError(err.response?.data?.message || "Erreur lors de la redirection");
    } finally {
      setRedirecting(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fonction pour formater le statut en français
  const getStatusText = (status) => {
    const statusMap = {
      'en_attente': 'En attente',
      'effectuee': 'Effectuée',
      'echouee': 'Échouée',
      'expiree': 'Expirée',
      'pending': 'En attente',
      'completed': 'Terminée',
      'failed': 'Échouée',
      'expired': 'Expirée'
    };
    return statusMap[status] || status;
  };

  // Fonction pour obtenir la classe CSS du statut
  const getStatusClass = (status) => {
    switch (status) {
      case 'en_attente':
      case 'pending':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'effectuee':
      case 'completed':
        return "bg-green-100 text-green-800 border-green-200";
      case 'echouee':
      case 'failed':
        return "bg-red-100 text-red-800 border-red-200";
      case 'expiree':
      case 'expired':
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Mes Transactions</h1>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="text-red-500" size={20} />
          <span className="text-red-700">{error}</span>
          {error.includes('Session expirée') && (
            <Link 
              to="/agent/login" 
              className="ml-auto text-blue-600 hover:text-blue-800 underline"
            >
              Se reconnecter
            </Link>
          )}
        </div>
      )}

      {/* Version Desktop */}
      <div className="hidden md:block bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Montant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {transaction.tracking_code}
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      {transaction.send_amount} {transaction.from_currency_code || transaction.origin_currency}
                    </span>
                    <span className="text-sm text-gray-500">
                      → {transaction.receive_amount} {transaction.to_currency_code}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-medium">{transaction.sender_phone}</span>
                    <span className="text-sm text-gray-500">→ {transaction.receiver_phone}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusClass(transaction.status)}`}>
                    {getStatusText(transaction.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {/* Voir détails */}
                    <Link
                      to={`/agent/transaction/${transaction.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Eye size={14} />
                      <span className="text-xs">Détails</span>
                    </Link>

                    {/* Actions selon le statut */}
                    {transaction.status === 'en_attente' && (
                      <>
                        {/* Valider */}
                        <button
                          onClick={() => handleValidate(transaction.id)}
                          disabled={processing === transaction.id}
                          className="inline-flex items-center gap-1 px-3 py-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                        >
                          <CheckCircle size={14} />
                          <span className="text-xs">
                            {processing === transaction.id ? "..." : "Valider"}
                          </span>
                        </button>

                        {/* Annuler */}
                        <button
                          onClick={() => handleCancel(transaction.id)}
                          disabled={processing === transaction.id}
                          className="inline-flex items-center gap-1 px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          <span className="text-xs">
                            {processing === transaction.id ? "..." : "Annuler"}
                          </span>
                        </button>

                        {/* Redirection */}
                        <div className="relative">
                          <select
                            onChange={(e) => handleRedirect(transaction.id, e.target.value)}
                            defaultValue=""
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={redirecting === transaction.id}
                          >
                            <option value="">Rediriger...</option>
                            {agents
                              .filter((agent) => agent.id !== transaction.assigned_agent_id)
                              .map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                  {agent.name}
                                </option>
                              ))}
                          </select>
                          {redirecting === transaction.id && (
                            <RefreshCcw className="animate-spin w-3 h-3 text-gray-500 absolute right-2 top-2" />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle size={32} className="text-gray-400" />
                    <span>Aucune transaction trouvée</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Version Mobile */}
      <div className="md:hidden space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="bg-white rounded-xl shadow p-4">
            <div className="flex justify-between items-start mb-3">
              <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {transaction.tracking_code}
              </code>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusClass(transaction.status)}`}>
                {getStatusText(transaction.status)}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Montant:</span>
                <span className="font-semibold">
                  {transaction.send_amount} {transaction.from_currency_code || transaction.origin_currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reçu:</span>
                <span className="font-semibold">
                  {transaction.receive_amount} {transaction.to_currency_code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expéditeur:</span>
                <span>{transaction.sender_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Destinataire:</span>
                <span>{transaction.receiver_phone}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
              <Link
                to={`/agent/transaction/${transaction.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors text-sm"
              >
                <Eye size={14} />
                Détails
              </Link>

              {transaction.status === 'en_attente' && (
                <>
                  <button
                    onClick={() => handleValidate(transaction.id)}
                    disabled={processing === transaction.id}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50 text-sm"
                  >
                    <CheckCircle size={14} />
                    {processing === transaction.id ? "..." : "Valider"}
                  </button>

                  <button
                    onClick={() => handleCancel(transaction.id)}
                    disabled={processing === transaction.id}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 text-sm"
                  >
                    <XCircle size={14} />
                    {processing === transaction.id ? "..." : "Annuler"}
                  </button>

                  <div className="w-full mt-2">
                    <select
                      onChange={(e) => handleRedirect(transaction.id, e.target.value)}
                      defaultValue=""
                      className="w-full text-xs border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={redirecting === transaction.id}
                    >
                      <option value="">Rediriger vers un autre agent...</option>
                      {agents
                        .filter((agent) => agent.id !== transaction.assigned_agent_id)
                        .map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {transactions.length === 0 && (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Aucune transaction trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}