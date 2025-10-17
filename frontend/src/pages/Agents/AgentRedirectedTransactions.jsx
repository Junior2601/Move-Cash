// src/pages/agent/AgentRedirectedTransactions.jsx
import React, { useEffect, useState } from "react";
import { 
  RefreshCcw, 
  Filter, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowRightLeft,
  User,
  Eye
} from "lucide-react";
import useAgentApi from "../../hooks/useAgentApi";
import { Link } from "react-router-dom";

export default function AgentRedirectedTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
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

  const fetchRedirectedTransactions = async (page = 1) => {
    setLoading(true);
    setError("");
    setDebugInfo("");
    try {
      console.log('🔄 Chargement des transactions redirigées...');
      
      const response = await api.get("/transactions/agent/redirected-transactions", {
        params: {
          page,
          limit: pagination.limit,
          status: filters.status || undefined,
          search: filters.search || undefined
        }
      });

      console.log('✅ Données reçues:', response.data);

      // Gestion sécurisée des données
      const transactionsData = response.data?.data?.transactions || response.data?.transactions || [];
      
      // Debug des données
      if (transactionsData.length > 0) {
        const firstTransaction = transactionsData[0];
        setDebugInfo(`
          Nombre: ${transactionsData.length}
          Premier élément - 
          Redirection ID: ${firstTransaction.redirection_id}
          Status: ${firstTransaction.redirection_status}
          Transaction ID: ${firstTransaction.transaction_id}
          From Agent: ${firstTransaction.from_agent_id}
          To Agent: ${firstTransaction.to_agent_id}
        `);
      }

      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      
      // Gérer la pagination
      const paginationData = response.data?.pagination || response.data?.data?.pagination;
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
      console.error("❌ Erreur détaillée:", err);
      console.error("❌ Response error:", err.response?.data);
      
      if (err.response?.status === 403) {
        setError("Accès refusé. Vous n'avez pas les permissions nécessaires.");
      } else if (err.response?.status === 401) {
        setError("Session expirée. Veuillez vous reconnecter.");
      } else if (err.response?.status === 404) {
        setError("Fonctionnalité en cours de développement. Veuillez réessayer ultérieurement.");
      } else {
        setError("Erreur lors du chargement des transactions redirigées: " + 
          (err.response?.data?.message || err.message || "Erreur inconnue"));
      }
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour accepter une redirection
  const handleAcceptRedirection = async (redirectionId) => {
    if (!confirm("Êtes-vous sûr de vouloir accepter cette redirection ?")) {
      return;
    }
    
    setProcessing(redirectionId);
    try {
      console.log('🔄 Acceptation redirection:', redirectionId);
      await api.put(`/transactions/redirections/${redirectionId}/accept`);
      await fetchRedirectedTransactions(pagination.page);
    } catch (err) {
      console.error("Erreur lors de l'acceptation de la redirection", err);
      setError("Erreur lors de l'acceptation: " + 
        (err.response?.data?.message || err.message || "Erreur inconnue"));
    } finally {
      setProcessing(null);
    }
  };

  // Fonction pour rejeter une redirection
  const handleRejectRedirection = async (redirectionId) => {
    if (!confirm("Êtes-vous sûr de vouloir rejeter cette redirection ?")) {
      return;
    }
    
    setProcessing(redirectionId);
    try {
      console.log('🔄 Rejet redirection:', redirectionId);
      await api.put(`/transactions/redirections/${redirectionId}/reject`);
      await fetchRedirectedTransactions(pagination.page);
    } catch (err) {
      console.error("Erreur lors du rejet de la redirection", err);
      setError("Erreur lors du rejet: " + 
        (err.response?.data?.message || err.message || "Erreur inconnue"));
    } finally {
      setProcessing(null);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyFilters = () => {
    fetchRedirectedTransactions(1);
  };

  const clearFilters = () => {
    setFilters({ status: "", search: "" });
    fetchRedirectedTransactions(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchRedirectedTransactions(newPage);
    }
  };

  // Fonction pour vérifier si on peut traiter la redirection
  const canProcessRedirection = (transaction) => {
    const redirectionStatus = transaction.redirection_status || transaction.status;
    const canProcess = redirectionStatus === 'pending';
    
    console.log('🔍 Vérification boutons:', {
      redirectionId: transaction.redirection_id,
      redirectionStatus: redirectionStatus,
      canProcess: canProcess
    });
    
    return canProcess;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { label: 'En attente', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      'accepted': { label: 'Acceptée', class: 'bg-green-100 text-green-800 border-green-200' },
      'rejected': { label: 'Rejetée', class: 'bg-red-100 text-red-800 border-red-200' },
      'en_attente': { label: 'Transaction en attente', class: 'bg-blue-100 text-blue-800 border-blue-200' },
      'effectuee': { label: 'Transaction effectuée', class: 'bg-green-100 text-green-800 border-green-200' }
    };

    const actualStatus = status || 'pending';
    const config = statusConfig[actualStatus] || { label: actualStatus, class: 'bg-gray-100 text-gray-800 border-gray-200' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${config.class}`}>
        {config.label}
      </span>
    );
  };

  // Fonction pour formater le montant
  const formatAmount = (amount, currencyCode) => {
    if (!amount) return "0.00";
    const formattedAmount = parseFloat(amount).toFixed(2);
    return currencyCode ? `${formattedAmount} ${currencyCode}` : formattedAmount;
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

  // Refresh automatique
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRedirectedTransactions(pagination.page);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [pagination.page]);

  useEffect(() => {
    fetchRedirectedTransactions(1);
  }, []);

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCcw className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des transactions redirigées...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ArrowRightLeft className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Transactions Redirigées
            </h1>
          </div>
          <p className="text-gray-600">
            Transactions que d'autres agents vous ont redirigées
          </p>
        </div>

        {/* Debug info */}
        {/* {debugInfo && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700 font-medium">Info Debug:</span>
              <button 
                onClick={() => setDebugInfo("")}
                className="text-blue-500 hover:text-blue-700"
              >
                ×
              </button>
            </div>
            <pre className="text-xs text-blue-600 mt-1 whitespace-pre-wrap">{debugInfo}</pre>
          </div>
        )} */}

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
                  placeholder="Code de suivi, agent expéditeur..."
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
                Statut redirection
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="accepted">Acceptées</option>
                <option value="rejected">Rejetées</option>
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
                onClick={() => fetchRedirectedTransactions(pagination.page)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Tableau des transactions redirigées */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {transactions.map((transaction) => (
            <div key={transaction.redirection_id} className="border-b border-gray-200 p-6 hover:bg-gray-50">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Informations principales */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <code className="font-mono text-sm bg-gray-100 px-3 py-1 rounded border">
                      {transaction.tracking_code}
                    </code>
                    <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                    {getStatusBadge(transaction.redirection_status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">De l'agent:</div>
                      <div className="font-medium flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {transaction.from_agent_name || `Agent #${transaction.from_agent_id}`}
                      </div>
                      {transaction.from_agent_email && (
                        <div className="text-sm text-gray-500 mt-1">{transaction.from_agent_email}</div>
                      )}
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Montant redirigé:</div>
                      <div className="font-medium text-lg text-green-600">
                        {formatAmount(transaction.redirected_amount, transaction.from_currency_code)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Total: {formatAmount(transaction.send_amount, transaction.from_currency_code)}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Date:</div>
                      <div className="text-sm">
                        {formatDate(transaction.redirection_created_at)}
                      </div>
                    </div>
                  </div>

                  {transaction.redirection_reason && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                      <strong>Raison de la redirection:</strong> {transaction.redirection_reason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Bouton Détails */}
                  <Link
                    to={`/agent/transaction/${transaction.transaction_id}`}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Détails
                  </Link>

                  {/* Boutons Accepter/Rejeter */}
                  {canProcessRedirection(transaction) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRedirection(transaction.redirection_id)}
                        disabled={processing === transaction.redirection_id}
                        className="inline-flex items-center justify-center px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                      >
                        {processing === transaction.redirection_id ? (
                          <RefreshCcw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Accepter
                      </button>

                      <button
                        onClick={() => handleRejectRedirection(transaction.redirection_id)}
                        disabled={processing === transaction.redirection_id}
                        className="inline-flex items-center justify-center px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                      >
                        {processing === transaction.redirection_id ? (
                          <RefreshCcw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-2" />
                        )}
                        Rejeter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* État vide */}
          {transactions.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <ArrowRightLeft className="mx-auto h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune transaction redirigée</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                {filters.status || filters.search 
                  ? "Aucune transaction redirigée ne correspond à vos critères de recherche." 
                  : "Aucun autre agent ne vous a redirigé de transaction pour le moment."
                }
              </p>
              {(filters.status || filters.search) && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Voir toutes les redirections
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
              Total: {pagination.total} redirection{pagination.total > 1 ? 's' : ''}
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