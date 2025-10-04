import { useEffect, useState } from "react";
import { 
  FileDown, AlertCircle, RefreshCw, Eye, Calendar, X, 
  UserPlus, UserCog, BarChart3, DollarSign, TrendingUp, TrendingDown,
  Clock, AlertTriangle, CheckCircle, ArrowRightLeft, UserCheck,
  Shield, CreditCard, Globe, Mail, Phone, Settings
} from "lucide-react";
import api from "../../api/api";

export default function HistoryList() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);
  const [showRawData, setShowRawData] = useState(false);
  const [dateFilter, setDateFilter] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState("");

  // Mapping des icônes et couleurs par type d'action
  const actionIcons = {
    // Taux
    rate_created: { icon: TrendingUp, color: "bg-green-100 text-green-600" },
    rate_updated: { icon: BarChart3, color: "bg-blue-100 text-blue-600" },
    rate_deleted: { icon: TrendingDown, color: "bg-red-100 text-red-600" },
    rate_status_changed: { icon: Settings, color: "bg-orange-100 text-orange-600" },
    
    // Transactions
    transaction_created: { icon: DollarSign, color: "bg-purple-100 text-purple-600" },
    transaction_validated: { icon: CheckCircle, color: "bg-green-100 text-green-600" },
    transaction_cancelled: { icon: X, color: "bg-red-100 text-red-600" },
    transaction_expired: { icon: Clock, color: "bg-gray-100 text-gray-600" },
    client_validation: { icon: UserCheck, color: "bg-blue-100 text-blue-600" },
    transaction_redirected: { icon: ArrowRightLeft, color: "bg-indigo-100 text-indigo-600" },
    
    // Agents
    agent_created: { icon: UserPlus, color: "bg-teal-100 text-teal-600" },
    agent_updated: { icon: UserCog, color: "bg-amber-100 text-amber-600" },
    agent_deleted: { icon: UserCog, color: "bg-rose-100 text-rose-600" },
    
    // Autres
    redirection_accepted: { icon: CheckCircle, color: "bg-green-100 text-green-600" },
    redirection_rejected: { icon: X, color: "bg-red-100 text-red-600" },
    default: { icon: Clock, color: "bg-gray-100 text-gray-600" }
  };

  // Mapping des priorités
  const getPriority = (actionType) => {
    const highPriority = ['transaction_expired', 'transaction_cancelled', 'rate_deleted', 'agent_deleted'];
    const mediumPriority = ['transaction_redirected', 'rate_updated', 'agent_updated'];
    
    if (highPriority.includes(actionType)) return { level: 'high', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    if (mediumPriority.includes(actionType)) return { level: 'medium', color: 'bg-orange-100 text-orange-800', icon: Clock };
    return { level: 'low', color: 'bg-green-100 text-green-800', icon: RefreshCw };
  };

  // Formater le titre de l'action
  const formatActionTitle = (actionType) => {
    const titles = {
      rate_created: "Création Taux",
      rate_updated: "Mise à jour Taux",
      rate_deleted: "Suppression Taux",
      rate_status_changed: "Changement Statut Taux",
      transaction_created: "Création Transaction",
      transaction_validated: "Validation Transaction",
      transaction_cancelled: "Annulation Transaction",
      transaction_expired: "Expiration Transaction",
      client_validation: "Validation Client",
      transaction_redirected: "Redirection Transaction",
      agent_created: "Création Agent",
      agent_updated: "Modification Agent",
      agent_deleted: "Suppression Agent",
      redirection_accepted: "Redirection Acceptée",
      redirection_rejected: "Redirection Rejetée"
    };
    
    return titles[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Extraire le sous-titre des métadonnées
  const getSubtitle = (item) => {
    const metadata = item.metadata || {};
    
    if (metadata.from_currency && metadata.to_currency) {
      return `${metadata.from_currency} → ${metadata.to_currency}`;
    }
    if (metadata.agent_name) {
      return metadata.agent_name;
    }
    if (metadata.from_agent_name && metadata.to_agent_name) {
      return `${metadata.from_agent_name} → ${metadata.to_agent_name}`;
    }
    if (metadata.tracking_code) {
      return `Code: ${metadata.tracking_code}`;
    }
    
    return item.entity_type || "Système";
  };

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    setRawResponse(null);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;
      if (actionTypeFilter) params.action_type = actionTypeFilter;

      const response = await api.get("/history", { params });
      console.log("Réponse complète de l'API:", response);
      setRawResponse(response);
      
      if (response.data && response.data.items && Array.isArray(response.data.items)) {
        setHistory(response.data.items);
      } else if (response.data && Array.isArray(response.data)) {
        setHistory(response.data);
      } else {
        setError("Format de données invalide");
        setHistory([]);
      }
    } catch (err) {
      console.error("Erreur lors du chargement de l'historique :", err);
      if (err.response?.status === 403) {
        setError("Accès refusé. Vérifiez vos permissions administrateur.");
      } else if (err.response?.status === 401) {
        setError("Session expirée. Veuillez vous reconnecter.");
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Erreur lors du chargement de l'historique");
      }
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchHistory(); 
  }, []);

  const handleFilter = () => {
    fetchHistory();
  };

  const clearFilters = () => {
    setDateFilter("");
    setActionTypeFilter("");
    fetchHistory();
  };

  const exportCSV = () => {
    if (history.length === 0) return;
    
    const headers = ["ID", "Type d'action", "Type d'acteur", "ID Acteur", "Type d'entité", "ID Entité", "Description", "Date"];
    const rows = history.map(h => [
      h.id,
      h.action_type,
      h.actor_type,
      h.actor_id || 'N/A',
      h.entity_type || 'N/A',
      h.entity_id || 'N/A',
      h.description,
      h.created_at
    ]);

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(field => `"${field || ''}"`).join(",") + "\n";
    });

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `historique_${dateFilter || 'complet'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const actionTypes = [
    'rate_created', 'rate_updated', 'rate_deleted', 'rate_status_changed',
    'transaction_created', 'transaction_validated', 'transaction_cancelled', 'transaction_expired',
    'client_validation', 'transaction_redirected', 'redirection_accepted', 'redirection_rejected',
    'agent_created', 'agent_updated', 'agent_deleted'
  ];

  const hasActiveFilters = dateFilter || actionTypeFilter;

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <RefreshCw className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Chargement de l'historique...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold">📜 Historique des activités</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRawData(!showRawData)}
            className="flex items-center bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            <Eye className="mr-2 w-4 h-4" /> Données brutes
          </button>
          <button
            onClick={fetchHistory}
            className="flex items-center bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            <RefreshCw className="mr-2 w-4 h-4" /> Actualiser
          </button>
          <button
            onClick={exportCSV}
            disabled={history.length === 0}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <FileDown className="mr-2 w-4 h-4" /> Exporter CSV
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
          <Calendar className="w-5 h-5 mr-2" /> Filtres de recherche
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date spécifique
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type d'action
            </label>
            <select
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les types</option>
              {actionTypes.map(type => (
                <option key={type} value={type}>
                  {formatActionTitle(type)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleFilter}
              className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              <Calendar className="mr-2 w-4 h-4" /> Appliquer
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                <X className="mr-2 w-4 h-4" /> Effacer
              </button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Filtres actifs:</strong>
              {dateFilter && ` Date: ${new Date(dateFilter).toLocaleDateString('fr-FR')}`}
              {actionTypeFilter && ` Type: ${formatActionTitle(actionTypeFilter)}`}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <h3 className="text-red-800 font-semibold">Erreur</h3>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={fetchHistory}
            className="mt-3 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      )}

      {showRawData && rawResponse && (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Données brutes de l'API :</h3>
          <pre className="text-xs overflow-auto p-3 bg-white border rounded">
            {JSON.stringify(rawResponse.data, null, 2)}
          </pre>
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {hasActiveFilters 
              ? "Aucun résultat pour les filtres sélectionnés" 
              : "Aucune activité disponible"
            }
          </p>
          {!error && (
            <button
              onClick={fetchHistory}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Actualiser
            </button>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 ml-3 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">
              {history.length} activité(s) trouvée(s)
              {dateFilter && ` pour le ${new Date(dateFilter).toLocaleDateString('fr-FR')}`}
            </span>
          </div>

          {/* Liste des activités */}
          {history.map((item) => {
            const IconComponent = (actionIcons[item.action_type] || actionIcons.default).icon;
            const iconColor = (actionIcons[item.action_type] || actionIcons.default).color;
            const priority = getPriority(item.action_type);
            const PriorityIcon = priority.icon;

            return (
              <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Icône ronde colorée */}
                    <div className={`p-3 rounded-full ${iconColor} flex-shrink-0`}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800 text-sm">
                          {formatActionTitle(item.action_type)}
                        </h3>
                        {/* Badge de priorité */}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priority.color}`}>
                          <PriorityIcon className="w-3 h-3 mr-1" />
                          {priority.level}
                        </span>
                      </div>

                      <p className="text-gray-600 text-sm mb-2">
                        {getSubtitle(item)}
                      </p>

                      <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex items-center text-xs text-gray-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(item.created_at).toLocaleString('fr-FR')}
                        {item.actor_type && (
                          <span className="ml-3">
                            Par: {item.actor_type} {item.actor_id ? `#${item.actor_id}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mt-4 text-sm text-gray-500 text-center">
            Total: {history.length} activité(s) dans l'historique
          </div>
        </div>
      )}
    </div>
  );
}