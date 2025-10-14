// src/pages/agent/MyTransactions.jsx
import React, { useEffect, useState } from "react";
import { RefreshCcw, Filter, Search, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import useAgentApi from "../../hooks/useAgentApi";
import { Link } from "react-router-dom";

export default function MyTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    search: ""
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Initialisation de l'API agent
  let api;
  try {
    api = useAgentApi();
  } catch (err) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Session expirée</h2>
          <p className="text-gray-600 mb-4">Veuillez vous reconnecter</p>
          <Link
            to="/agent/login"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const fetchData = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      // Récupérer les transactions de l'agent
      const resTx = await api.get("/transactions/agent/transactions", {
        params: {
          page,
          limit: pagination.limit,
          status: filters.status || undefined,
          search: filters.search || undefined
        }
      });
      
      // Récupérer la liste des agents pour la redirection
      const resAgents = await api.get("/agent/agents/list-for-redirection");
      
      // Gestion sécurisée des données agents
      const agentsData = resAgents.data?.data || resAgents.data?.agents || [];
      setAgents(Array.isArray(agentsData) ? agentsData : []);

      // Gestion sécurisée des transactions
      const transactionsData = resTx.data?.data?.transactions || resTx.data?.transactions || resTx.data;
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      
      // Gérer la pagination
      const paginationData = resTx.data?.pagination || resTx.data?.data?.pagination;
      if (paginationData) {
        setPagination(prev => ({
          ...prev,
          ...paginationData,
          page
        }));
      } else {
        setPagination(prev => ({
          ...prev,
          page,
          total: Array.isArray(transactionsData) ? transactionsData.length : 0,
          pages: Math.ceil((Array.isArray(transactionsData) ? transactionsData.length : 0) / prev.limit)
        }));
      }
    } catch (err) {
      console.error("Erreur lors du chargement des transactions", err);
      
      if (err.response?.status === 403) {
        setError("Accès refusé. Vous n'avez pas les permissions nécessaires.");
      } else if (err.response?.status === 401) {
        setError("Session expirée. Veuillez vous reconnecter.");
      } else {
        setError("Erreur lors du chargement des transactions: " + 
          (err.response?.data?.message || err.message || "Erreur inconnue"));
      }
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour confirmer les actions critiques
  const confirmAction = (action, transactionId, transactionCode) => {
    return window.confirm(`Êtes-vous sûr de vouloir ${action} la transaction ${transactionCode} ?`);
  };

  // Valider une transaction
  const handleValidate = async (transactionId) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!confirmAction('valider', transactionId, transaction.tracking_code)) {
      return;
    }
    
    setProcessing(transactionId);
    try {
      await api.put(`/transactions/${transactionId}/validate-agent`);
      await fetchData(pagination.page);
    } catch (err) {
      console.error("Erreur lors de la validation", err);
      setError("Erreur lors de la validation: " + 
        (err.response?.data?.message || err.message || "Erreur inconnue"));
    } finally {
      setProcessing(null);
    }
  };

  // Annuler une transaction
  const handleCancel = async (transactionId) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!confirmAction('annuler', transactionId, transaction.tracking_code)) {
      return;
    }
    
    setProcessing(transactionId);
    try {
      await api.put(`/transactions/${transactionId}/cancel-agent`);
      await fetchData(pagination.page);
    } catch (err) {
      console.error("Erreur lors de l'annulation", err);
      setError("Erreur lors de l'annulation: " + 
        (err.response?.data?.message || err.message || "Erreur inconnue"));
    } finally {
      setProcessing(null);
    }
  };

  const handleRedirect = async (transactionId, newAgentId) => {
    if (!newAgentId) return;
    
    const transaction = transactions.find(t => t.id === transactionId);
    if (!confirmAction('rediriger', transactionId, transaction.tracking_code)) {
      return;
    }
    
    setRedirecting(transactionId);
    try {
      await api.post("/transactions/redirect", {
        transaction_id: transactionId,
        to_agent_id: newAgentId,
        redirected_amount: transaction?.send_amount || 0,
        reason: "Redirection manuelle par l'agent"
      });
      
      await fetchData(pagination.page);
    } catch (err) {
      console.error("Erreur lors de la redirection", err);
      setError("Erreur lors de la redirection: " + 
        (err.response?.data?.message || err.message || "Erreur inconnue"));
    } finally {
      setRedirecting(null);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyFilters = () => {
    fetchData(1);
  };

  const clearFilters = () => {
    setFilters({ status: "", search: "" });
    fetchData(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchData(newPage);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'en_attente': { label: 'En attente', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      'effectuee': { label: 'Effectuée', class: 'bg-green-100 text-green-800 border-green-200' },
      'echouee': { label: 'Échouée', class: 'bg-red-100 text-red-800 border-red-200' },
      'expiree': { label: 'Expirée', class: 'bg-gray-100 text-gray-800 border-gray-200' },
      'pending': { label: 'En attente', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      'completed': { label: 'Complétée', class: 'bg-green-100 text-green-800 border-green-200' },
      'failed': { label: 'Échouée', class: 'bg-red-100 text-red-800 border-red-200' },
      'expired': { label: 'Expirée', class: 'bg-gray-100 text-gray-800 border-gray-200' }
    };

    const config = statusConfig[status] || { label: status, class: 'bg-gray-100 text-gray-800 border-gray-200' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${config.class}`}>
        {config.label}
      </span>
    );
  };

  // Fonction pour formater le montant avec le bon code de devise
  const formatAmount = (amount, currencyCode) => {
    if (!amount) return "0.00";
    const formattedAmount = parseFloat(amount).toFixed(2);
    return currencyCode ? `${formattedAmount} ${currencyCode}` : formattedAmount;
  };

  // Fonction pour obtenir le code de devise correct
  const getCurrencyCode = (transaction, type = 'send') => {
    if (type === 'send') {
      return transaction.from_currency_code || 'EUR';
    } else {
      return transaction.to_currency_code || 'EUR';
    }
  };

  // Fonction pour formater le numéro de téléphone avec l'indicatif du pays
  const formatPhoneNumber = (transaction) => {
    const phone = transaction.sender_phone || transaction.customer_phone;
    const countryPrefix = transaction.from_country_phone_prefix; // Utilisez le phone_prefix du pays
    
    if (!phone) return "—";
    
    // Si le numéro commence déjà par '+', le retourner tel quel
    if (phone.startsWith('+')) return phone;
    
    // Ajouter l'indicatif si disponible
    if (countryPrefix) {
      return `+${countryPrefix} ${phone}`;
    }
    
    return phone;
  };

  // Fonction pour détecter les transactions urgentes (expirant bientôt)
  const isUrgent = (transaction) => {
    if (transaction.status !== 'en_attente' && transaction.status !== 'pending') return false;
    if (!transaction.expires_at) return false;
    
    const expiresAt = new Date(transaction.expires_at);
    const now = new Date();
    const hoursLeft = (expiresAt - now) / (1000 * 60 * 60);
    return hoursLeft < 1 && hoursLeft > 0; // Moins d'1 heure mais pas encore expiré
  };

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilteredAgents = (transaction) => {
    if (!Array.isArray(agents)) return [];
    return agents.filter(agent => agent.id !== transaction.assigned_agent_id);
  };

  // Vérifier si une transaction peut être validée/annulée
  const canProcessTransaction = (transaction) => {
    return transaction.status === 'en_attente' || transaction.status === 'pending';
  };

  // Refresh automatique des données
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData(pagination.page);
      }
    }, 30000); // Toutes les 30 secondes

    return () => clearInterval(interval);
  }, [pagination.page]);

  useEffect(() => {
    fetchData(1);
  }, []);

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCcw className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de vos transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Mes Transactions
          </h1>
          <p className="text-gray-600">
            Gérez et suivez toutes vos transactions
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="mt-2 text-red-600 hover:text-red-800 text-sm"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Filtres et recherche */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            {/* Recherche */}
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Code de suivi, client..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filtre statut */}
            <div className="w-full sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="effectuee">Effectuée</option>
                <option value="echouee">Échouée</option>
                <option value="expiree">Expirée</option>
              </select>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Appliquer
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Effacer
              </button>
              <button
                onClick={() => fetchData(pagination.page)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Tableau des transactions */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Version desktop */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code & Détails
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {transaction.tracking_code}
                        </code>
                        {isUrgent(transaction) && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            <Clock className="w-3 h-3" />
                            Urgent
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {transaction.sender_method_name} → {transaction.receiver_method_name}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatAmount(transaction.send_amount, getCurrencyCode(transaction, 'send'))}
                      </div>
                      <div className="text-sm text-gray-500">
                        → {formatAmount(transaction.receive_amount, getCurrencyCode(transaction, 'receive'))}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium">
                        {formatPhoneNumber(transaction)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.customer_name || "Non spécifié"}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.created_at)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* Voir détails */}
                        <Link
                          to={`/agent/transaction/${transaction.id}`}
                          className="inline-flex items-center px-3 py-1 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                        >
                          Détails
                        </Link>

                        {/* Boutons Valider/Annuler pour les transactions en attente */}
                        {canProcessTransaction(transaction) && (
                          <>
                            <button
                              onClick={() => handleValidate(transaction.id)}
                              disabled={processing === transaction.id}
                              className="inline-flex items-center px-3 py-1 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processing === transaction.id ? (
                                <RefreshCcw className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              )}
                              Valider
                            </button>

                            <button
                              onClick={() => handleCancel(transaction.id)}
                              disabled={processing === transaction.id}
                              className="inline-flex items-center px-3 py-1 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processing === transaction.id ? (
                                <RefreshCcw className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              Annuler
                            </button>
                          </>
                        )}

                        {/* Redirection pour les transactions en attente */}
                        {canProcessTransaction(transaction) && (
                          <div className="relative">
                            <select
                              onChange={(e) => handleRedirect(transaction.id, e.target.value)}
                              defaultValue=""
                              disabled={redirecting === transaction.id}
                              className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-1 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">Rediriger...</option>
                              {getFilteredAgents(transaction).map(agent => (
                                <option key={agent.id} value={agent.id}>
                                  {agent.name} {agent.email ? `(${agent.email})` : ''}
                                </option>
                              ))}
                            </select>
                            {redirecting === transaction.id && (
                              <RefreshCcw className="animate-spin w-4 h-4 text-gray-500 absolute right-2 top-1/2 transform -translate-y-1/2" />
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Version mobile */}
          <div className="md:hidden">
            <div className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="font-mono text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {transaction.tracking_code}
                        </code>
                        {isUrgent(transaction) && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            <Clock className="w-3 h-3" />
                            Urgent
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">
                        {formatPhoneNumber(transaction)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(transaction.created_at)}
                      </div>
                    </div>
                    {getStatusBadge(transaction.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-gray-500">Montant envoyé</div>
                      <div className="text-sm font-medium">
                        {formatAmount(transaction.send_amount, getCurrencyCode(transaction, 'send'))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Montant reçu</div>
                      <div className="text-sm font-medium">
                        {formatAmount(transaction.receive_amount, getCurrencyCode(transaction, 'receive'))}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    {transaction.sender_method_name} → {transaction.receiver_method_name}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Link
                      to={`/agent/transaction/${transaction.id}`}
                      className="flex-1 text-center px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                    >
                      Détails
                    </Link>

                    {canProcessTransaction(transaction) && (
                      <>
                        <button
                          onClick={() => handleValidate(transaction.id)}
                          disabled={processing === transaction.id}
                          className="flex-1 text-center px-3 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing === transaction.id ? (
                            <RefreshCcw className="w-3 h-3 animate-spin mx-auto" />
                          ) : (
                            "Valider"
                          )}
                        </button>

                        <button
                          onClick={() => handleCancel(transaction.id)}
                          disabled={processing === transaction.id}
                          className="flex-1 text-center px-3 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing === transaction.id ? (
                            <RefreshCcw className="w-3 h-3 animate-spin mx-auto" />
                          ) : (
                            "Annuler"
                          )}
                        </button>
                      </>
                    )}

                    {canProcessTransaction(transaction) && (
                      <div className="flex-1 relative">
                        <select
                          onChange={(e) => handleRedirect(transaction.id, e.target.value)}
                          defaultValue=""
                          disabled={redirecting === transaction.id}
                          className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Rediriger...</option>
                          {getFilteredAgents(transaction).map(agent => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name}
                            </option>
                          ))}
                        </select>
                        {redirecting === transaction.id && (
                          <RefreshCcw className="animate-spin w-4 h-4 text-gray-500 absolute right-2 top-1/2 transform -translate-y-1/2" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* État vide */}
          {transactions.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune transaction</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                {filters.status || filters.search 
                  ? "Aucune transaction ne correspond à vos critères de recherche." 
                  : "Vous n'avez aucune transaction pour le moment."
                }
              </p>
              {(filters.status || filters.search) && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Voir toutes les transactions
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Page {pagination.page} sur {pagination.pages} • 
              Total: {pagination.total} transaction{pagination.total > 1 ? 's' : ''}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Précédent
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}