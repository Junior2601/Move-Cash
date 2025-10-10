import React, { useEffect, useState, useCallback } from "react";
import api from "../../api/api";
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Download,
  FileText,
  MapPin,
  User,
  Calendar,
  CreditCard,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  DollarSign,
  Hash,
  X
} from "lucide-react";

export default function TransactionsList() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 10
  });

  const [filters, setFilters] = useState({
    tracking_code: "",
    from_country_id: "",
    agent_id: "",
    status: "",
    start_date: "",
    end_date: ""
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Fonction de recherche avec debounce
  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      
      if (!token) {
        setError("Token d'authentification manquant. Veuillez vous connecter.");
        setLoading(false);
        return;
      }
      
      // Nettoyer les paramètres vides
      const params = {
        page,
        limit: pagination.limit
      };

      // Ajouter seulement les filtres non vides
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "") {
          params[key] = value;
        }
      });

      console.log('📤 Paramètres envoyés au backend:', params);

      const res = await api.get("/transactions/all-transactions", { 
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("✅ API Response:", res.data);
      
      // Gérer la réponse selon la structure réelle de votre API
      if (res.data && res.data.success) {
        setTransactions(res.data.data || []);
        setPagination(res.data.pagination || { 
          page: 1, 
          pages: 1, 
          total: (res.data.data || []).length,
          limit: 10
        });
      } else if (Array.isArray(res.data)) {
        setTransactions(res.data);
        setPagination(prev => ({ ...prev, page: 1, pages: 1, total: res.data.length }));
      } else if (res.data && Array.isArray(res.data.data)) {
        setTransactions(res.data.data);
        setPagination(res.data.pagination || { 
          page: 1, 
          pages: 1, 
          total: res.data.data.length,
          limit: 10
        });
      } else {
        setTransactions([]);
        setPagination({ page: 1, pages: 1, total: 0, limit: 10 });
      }
      
    } catch (err) {
      console.error("💥 Erreur détaillée fetch transactions:", err);
      
      if (err.code === 'ERR_NETWORK') {
        setError("Impossible de se connecter au serveur. Vérifiez que le backend est démarré.");
      } else if (err.response?.status === 401) {
        setError("Token invalide ou expiré. Veuillez vous reconnecter.");
      } else if (err.response?.status === 404) {
        setError("Endpoint non trouvé. Vérifiez la route API.");
      } else if (err.response?.status === 500) {
        const serverMessage = err.response.data?.message || err.response.data?.error;
        setError(`Erreur serveur: ${serverMessage || 'Veuillez contacter l\'administrateur'}`);
      } else {
        setError("Erreur lors de la récupération des transactions.");
      }
      
      setTransactions([]);
      setPagination({ page: 1, pages: 1, total: 0, limit: 10 });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  // Effet pour la recherche avec debounce
  useEffect(() => {
    // Annuler le timeout précédent
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Réinitialiser à la page 1 quand les filtres changent
    setPagination(prev => ({ ...prev, page: 1 }));

    // Débounce de 300ms pour les recherches texte, instantané pour les sélecteurs
    const isTextSearch = filters.tracking_code || filters.agent_id || filters.from_country_id;
    const delay = isTextSearch ? 300 : 0;

    const timeoutId = setTimeout(() => {
      fetchTransactions(1);
    }, delay);

    setSearchTimeout(timeoutId);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [filters, pagination.limit]);

  const formatAmount = (amount) => {
    if (!amount || isNaN(amount)) return '0.00';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDateMobile = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
      case "validated":
      case "effectuee":
        return <CheckCircle size={16} className="text-green-600" />;
      case "pending":
      case "en_attente":
        return <Clock size={16} className="text-yellow-600" />;
      case "cancelled":
      case "echouee":
      case "expiree":
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <AlertCircle size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
      case "validated":
      case "effectuee":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
      case "en_attente":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
      case "echouee":
      case "expiree":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const translateStatus = (status) => {
    const statusMap = {
      "en_attente": "En attente",
      "effectuee": "Effectuée",
      "echouee": "Échouée",
      "expiree": "Expirée",
      "pending": "En attente",
      "completed": "Complétée",
      "validated": "Validée",
      "cancelled": "Annulée"
    };
    return statusMap[status] || status || "Inconnu";
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchTransactions(newPage);
    }
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value);
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({
      tracking_code: "",
      from_country_id: "",
      agent_id: "",
      status: "",
      start_date: "",
      end_date: ""
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilter = (key) => {
    setFilters(prev => ({
      ...prev,
      [key]: ""
    }));
  };

  const showTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
  };

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = Object.values(filters).some(filter => filter !== "");

  // Obtenir les filtres actifs pour l'affichage
  const activeFilters = Object.entries(filters)
    .filter(([_, value]) => value !== "")
    .map(([key, value]) => ({ key, value }));

  return (
    <div className="p-3 sm:p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* En-tête */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 flex items-center gap-2 truncate">
              <FileText size={20} className="text-indigo-600 flex-shrink-0" />
              <span className="truncate">Gestion des Transactions</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Suivez et gérez toutes les transactions</p>
          </div>
          
          <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
            >
              <Filter size={14} />
              <span className="hidden xs:inline">Filtres</span>
              {hasActiveFilters && (
                <span className="bg-indigo-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
                  {activeFilters.length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => fetchTransactions(pagination.page)}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span className="hidden xs:inline">
                {loading ? "Chargement..." : "Actualiser"}
              </span>
              <span className="xs:hidden">
                {loading ? "..." : "Rafraîchir"}
              </span>
            </button>
          </div>
        </div>

        {/* Filtres */}
        {showFilters && (
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* Code de suivi */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">Code de suivi</label>
                <div className="relative">
                  <Hash size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="TRK-123456"
                    value={filters.tracking_code}
                    onChange={(e) => handleFilterChange('tracking_code', e.target.value)}
                    className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                  {filters.tracking_code && (
                    <button
                      onClick={() => clearFilter('tracking_code')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Pays */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">Pays</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="France"
                    value={filters.from_country_id}
                    onChange={(e) => handleFilterChange('from_country_id', e.target.value)}
                    className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                  {filters.from_country_id && (
                    <button
                      onClick={() => clearFilter('from_country_id')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Agent */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">Agent</label>
                <div className="relative">
                  <User size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Jean Dupont"
                    value={filters.agent_id}
                    onChange={(e) => handleFilterChange('agent_id', e.target.value)}
                    className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                  {filters.agent_id && (
                    <button
                      onClick={() => clearFilter('agent_id')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Statut */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">Statut</label>
                <div className="relative">
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-transparent text-sm"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="effectuee">Effectuée</option>
                    <option value="en_attente">En attente</option>
                    <option value="echouee">Échouée</option>
                    <option value="expiree">Expirée</option>
                  </select>
                  {filters.status && (
                    <button
                      onClick={() => clearFilter('status')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Date de début */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">Date de début</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => handleFilterChange('start_date', e.target.value)}
                    className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                  {filters.start_date && (
                    <button
                      onClick={() => clearFilter('start_date')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Date de fin */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">Date de fin</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => handleFilterChange('end_date', e.target.value)}
                    className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                  {filters.end_date && (
                    <button
                      onClick={() => clearFilter('end_date')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-gray-600 hover:text-gray-800 text-xs hover:bg-gray-100 rounded transition-colors"
              >
                Tout réinitialiser
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-xs transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Indicateur de filtres actifs */}
        {hasActiveFilters && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Filter size={14} />
                <span className="font-medium">{activeFilters.length} filtre(s) actif(s)</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {activeFilters.map(({ key, value }) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                  >
                    {key === 'start_date' && 'À partir du '}
                    {key === 'end_date' && 'Jusqu\'au '}
                    {key === 'start_date' || key === 'end_date' ? formatDateForInput(value) : value}
                    <button
                      onClick={() => clearFilter(key)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <button
                  onClick={resetFilters}
                  className="text-blue-700 hover:text-blue-900 text-xs underline ml-2"
                >
                  Tout effacer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
          {error.includes("Token") && (
            <button
              onClick={() => window.location.href = '/login'}
              className="mt-2 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
            >
              Se connecter
            </button>
          )}
        </div>
      )}

      {/* Statistiques */}
      {!loading && !error && pagination.total > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg mb-4 flex flex-col xs:flex-row justify-between items-center gap-2 text-sm">
          <div className="flex items-center gap-2">
            <FileText size={14} />
            <span className="font-medium">{pagination.total} transaction(s)</span>
          </div>
          <div className="text-xs">
            Page {pagination.page} sur {pagination.pages}
          </div>
        </div>
      )}

      {/* États de chargement et résultats */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-3 text-gray-600 text-sm">Chargement des transactions...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-600 mb-2">Erreur de chargement</h3>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchTransactions(1)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            Réessayer
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <Search size={32} className="text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-600 mb-2">Aucune transaction trouvée</h3>
          <p className="text-gray-500 text-sm">
            {hasActiveFilters 
              ? "Aucune transaction ne correspond à vos critères" 
              : "Aucune transaction enregistrée"}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-3 px-3 py-1 text-indigo-600 hover:text-indigo-800 text-sm"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tableau pour tablette et desktop */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pays
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Hash size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="font-mono text-blue-600 font-medium text-sm truncate max-w-[120px]">
                            {t.tracking_code || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-gray-600 truncate max-w-[80px]">{t.from_country_name || 'N/A'}</span>
                          <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900 truncate max-w-[80px]">{t.to_country_name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-semibold text-gray-900 text-sm">
                          <DollarSign size={12} className="text-green-600 flex-shrink-0" />
                          {formatAmount(t.send_amount || 0)} {t.from_currency_code || ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <User size={12} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[100px]">{t.agent_name || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(t.status)}`}>
                          {getStatusIcon(t.status)}
                          <span className="hidden sm:inline">{translateStatus(t.status)}</span>
                          <span className="sm:hidden">{translateStatus(t.status).charAt(0)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                          {formatDateMobile(t.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button 
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            title="Voir les détails"
                            onClick={() => showTransactionDetails(t)}
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                            title="Télécharger"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cartes pour mobile */}
          <div className="md:hidden space-y-3">
            {transactions.map((t) => (
              <div key={t.id} className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
                {/* En-tête de la carte */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Hash size={14} className="text-blue-600 flex-shrink-0" />
                    <span className="font-mono text-blue-600 font-medium text-sm truncate">
                      {t.tracking_code || 'N/A'}
                    </span>
                  </div>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(t.status)} flex-shrink-0 ml-2`}>
                    {getStatusIcon(t.status)}
                    <span className="hidden xs:inline">{translateStatus(t.status)}</span>
                    <span className="xs:hidden">{translateStatus(t.status).split(' ').map(word => word[0]).join('')}</span>
                  </div>
                </div>

                {/* Contenu de la carte */}
                <div className="space-y-2 text-sm">
                  {/* Ligne Pays */}
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <span className="text-gray-600 text-xs truncate flex-1">{t.from_country_name || 'N/A'}</span>
                      <ArrowRight size={10} className="text-gray-400 flex-shrink-0 mx-1" />
                      <span className="font-medium text-gray-900 text-xs truncate flex-1">{t.to_country_name || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Ligne Montant */}
                  <div className="flex items-center gap-2">
                    <DollarSign size={12} className="text-green-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-gray-900 text-sm">
                        {formatAmount(t.send_amount || 0)} {t.from_currency_code || ''}
                      </span>
                      {t.receive_amount && (
                        <div className="text-xs text-gray-500 truncate">
                          → {formatAmount(t.receive_amount)} {t.to_currency_code || ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ligne Agent et Date */}
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <User size={12} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700 text-xs truncate">{t.agent_name || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600 text-xs">
                        {formatDateMobile(t.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Méthodes de paiement */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <CreditCard size={12} className="text-gray-400 flex-shrink-0" />
                    <div className="flex items-center gap-1 flex-1 overflow-hidden">
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border text-gray-700 truncate flex-1">
                        {t.sender_method_name || 'N/A'}
                      </span>
                      <ArrowRight size={8} className="text-gray-400 flex-shrink-0 mx-1" />
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border text-gray-700 truncate flex-1">
                        {t.receiver_method_name || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    {formatDate(t.created_at)}
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded hover:bg-indigo-50 transition-colors"
                      title="Voir les détails"
                      onClick={() => showTransactionDetails(t)}
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      className="text-green-600 hover:text-green-900 p-1.5 rounded hover:bg-green-50 transition-colors"
                      title="Télécharger"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination responsive */}
          {pagination.pages > 1 && (
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mt-4 border border-gray-200">
              <div className="flex flex-col xs:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2 order-2 xs:order-1">
                  <span className="text-xs text-gray-600">Lignes:</span>
                  <select
                    value={pagination.limit}
                    onChange={handleLimitChange}
                    className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 order-1 xs:order-2">
                  <span className="text-xs text-gray-600">
                    {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total}
                  </span>
                </div>

                <div className="flex items-center gap-1 order-3">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.page === 1}
                    className="p-1.5 rounded border border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    title="Première page"
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="p-1.5 rounded border border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    title="Page précédente"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <div className="flex items-center gap-1 mx-1">
                    {Array.from({ length: Math.min(3, pagination.pages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(pagination.pages - 2, pagination.page - 1)) + i;
                      if (pageNum > pagination.pages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                            pagination.page === pageNum
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="p-1.5 rounded border border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    title="Page suivante"
                  >
                    <ChevronRight size={14} />
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(pagination.pages)}
                    disabled={pagination.page === pagination.pages}
                    className="p-1.5 rounded border border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    title="Dernière page"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}