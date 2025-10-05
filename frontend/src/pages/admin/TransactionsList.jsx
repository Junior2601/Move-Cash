import React, { useEffect, useState } from "react";
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
  Hash
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
    trackingCode: "",
    country: "",
    agent: "",
    status: ""
  });

  const [showFilters, setShowFilters] = useState(false);

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      
      if (!token) {
        setError("Token d'authentification manquant. Veuillez vous connecter.");
        setLoading(false);
        return;
      }
      
      const params = {
        ...filters,
        page,
        limit: pagination.limit
      };

      const res = await api.get("/transactions/all-transactions", { 
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("API Response:", res.data);
      
      if (Array.isArray(res.data)) {
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
        console.warn("Structure de réponse inattendue:", res.data);
      }
      
    } catch (err) {
      console.error("Erreur fetch transactions", err);
      
      if (err.code === 'ERR_NETWORK') {
        setError("Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur le port 5000.");
      } else if (err.response?.status === 401) {
        setError("Token invalide ou expiré. Veuillez vous reconnecter.");
      } else if (err.response?.status === 404) {
        setError("Endpoint non trouvé. Vérifiez la route API.");
      } else {
        setError("Erreur lors de la récupération des transactions.");
      }
      
      setTransactions([]);
      setPagination({ page: 1, pages: 1, total: 0, limit: 10 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, [filters]);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    setTimeout(() => fetchTransactions(1), 100);
  };

  const resetFilters = () => {
    setFilters({
      trackingCode: "",
      country: "",
      agent: "",
      status: ""
    });
  };

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText size={24} className="text-indigo-600" />
            Gestion des Transactions
          </h1>
          <p className="text-sm text-gray-600 mt-1">Suivez et géz toutes les transactions</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filtres</span>
          </button>
          
          <button
            onClick={() => fetchTransactions(pagination.page)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code de suivi</label>
              <div className="relative">
                <Hash size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="TRK-123456"
                  value={filters.trackingCode}
                  onChange={(e) => setFilters({ ...filters, trackingCode: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pays destination</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="France"
                  value={filters.country}
                  onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom agent</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Jean Dupont"
                  value={filters.agent}
                  onChange={(e) => setFilters({ ...filters, agent: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Tous les statuts</option>
                <option value="effectuee">Effectuée</option>
                <option value="en_attente">En attente</option>
                <option value="echouee">Échouée</option>
                <option value="expiree">Expirée</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Réinitialiser
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              Appliquer
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <AlertCircle size={20} className="mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Statistiques */}
      {pagination.total > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-2 sm:mb-0">
            <FileText size={18} />
            <span className="font-medium">{pagination.total} transaction(s) trouvée(s)</span>
          </div>
          <div className="text-sm">
            Page {pagination.page} sur {pagination.pages}
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Search size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">Aucune transaction trouvée</h3>
          <p className="text-gray-500">
            {Object.values(filters).some(filter => filter !== "") 
              ? "Essayez de modifier vos critères de recherche" 
              : "Aucune transaction n'a été enregistrée pour le moment"}
          </p>
        </div>
      ) : (
        <>
          {/* Tableau desktop */}
          <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pays
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Méthode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Hash size={16} className="text-gray-400" />
                          <span className="font-mono text-blue-600 font-medium">{t.tracking_code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{t.from_country_name || 'N/A'}</span>
                          <ArrowRight size={14} className="text-gray-400" />
                          <span className="text-sm font-medium">{t.to_country_name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded border">
                            {t.sender_method_name || 'N/A'}
                          </span>
                          <ArrowRight size={12} className="text-gray-400" />
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded border">
                            {t.receiver_method_name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-semibold">
                          <DollarSign size={14} className="text-green-600" />
                          {formatAmount(t.send_amount || 0)} {t.from_currency_code || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400" />
                          {t.agent_name || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(t.status)}`}>
                          {getStatusIcon(t.status)}
                          {translateStatus(t.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          {t.created_at ? formatDate(t.created_at) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors">
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cartes mobile */}
          <div className="lg:hidden space-y-3">
            {transactions.map((t) => (
              <div key={t.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Hash size={16} className="text-blue-600" />
                    <span className="font-mono text-blue-600 font-medium text-sm">{t.tracking_code}</span>
                  </div>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(t.status)}`}>
                    {getStatusIcon(t.status)}
                    {translateStatus(t.status)}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span>{t.from_country_name || 'N/A'}</span>
                    <ArrowRight size={12} className="text-gray-400" />
                    <span className="font-medium">{t.to_country_name || 'N/A'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CreditCard size={14} className="text-gray-400" />
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded border">
                      {t.sender_method_name || 'N/A'}
                    </span>
                    <ArrowRight size={10} className="text-gray-400" />
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded border">
                      {t.receiver_method_name || 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-green-600" />
                    <span className="font-semibold">
                      {formatAmount(t.send_amount || 0)} {t.from_currency_code || ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400" />
                    <span>{t.agent_name || "-"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {t.created_at ? formatDate(t.created_at) : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
                  <button className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors">
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-white rounded-xl shadow-sm p-4 mt-6 border border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Lignes par page:</span>
                  <select
                    value={pagination.limit}
                    onChange={handleLimitChange}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.page === 1}
                    className="p-2 rounded border border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="p-2 rounded border border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1 mx-2">
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(pagination.pages - 4, pagination.page - 2)) + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 h-8 rounded text-sm ${
                            pagination.page === pageNum
                              ? 'bg-indigo-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
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
                    className="p-2 rounded border border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(pagination.pages)}
                    disabled={pagination.page === pagination.pages}
                    className="p-2 rounded border border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronsRight size={16} />
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