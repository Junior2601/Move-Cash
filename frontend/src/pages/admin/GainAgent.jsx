import React, { useEffect, useState, useCallback } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download, 
  Filter, 
  User, 
  Globe,
  X,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api from '../../api/api';

// Composant de notification
const Notification = ({ message, type, onClose }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed left-1/2 transform -translate-x-1/2 top-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 max-w-[90vw] ${styles[type]}`}>
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Composants Skeleton
const StatsSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
    {[...Array(4)].map((_, index) => (
      <div key={`skeleton-stats-${index}`} className="bg-white rounded-lg lg:rounded-xl shadow-sm p-3 lg:p-6 border border-gray-100 animate-pulse">
        <div className="flex items-center">
          <div className="p-2 lg:p-3 rounded-lg bg-gray-200 mr-2 lg:mr-4">
            <div className="w-4 h-4 lg:w-6 lg:h-6"></div>
          </div>
          <div className="flex-1">
            <div className="h-3 lg:h-4 bg-gray-200 rounded w-3/4 mb-1 lg:mb-2"></div>
            <div className="h-4 lg:h-7 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const MobileCardSkeleton = () => (
  <div className="bg-white rounded-lg lg:rounded-xl shadow-sm overflow-hidden border border-gray-100">
    <div className="divide-y divide-gray-200">
      {[...Array(3)].map((_, index) => (
        <div key={`skeleton-mobile-${index}`} className="p-4 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="ml-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
            <div className="flex items-center">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="flex items-center">
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DesktopTableSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['Agent', 'Devise', 'Total Gains', 'Nb Transactions', 'Commission Moyenne'].map((header, index) => (
              <th key={`skeleton-header-${index}`} className="px-4 lg:px-6 py-3 text-left">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {[...Array(6)].map((_, index) => (
            <tr key={`skeleton-row-${index}`} className="animate-pulse">
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-8 w-8 lg:h-10 lg:w-10 bg-gray-200 rounded-full"></div>
                  <div className="ml-3 lg:ml-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default function AgentsGains() {
  const [gainsData, setGainsData] = useState([]);
  const [agents, setAgents] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [filters, setFilters] = useState({
    agent_id: '',
    currency_id: ''
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showFilters, setShowFilters] = useState(false);

  // Détection de la taille d'écran
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
  }, []);

  // Obtenir le mois et année actuels
  const getCurrentMonthYear = () => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      monthName: now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    };
  };

  const currentPeriod = getCurrentMonthYear();

  // Charger les agents
  const fetchAgents = async () => {
    try {
      const res = await api.get('/agent');
      let agentsData = [];
      
      if (Array.isArray(res.data)) {
        agentsData = res.data;
      } else if (res.data && Array.isArray(res.data.agents)) {
        agentsData = res.data.agents;
      } else if (res.data && Array.isArray(res.data.data)) {
        agentsData = res.data.data;
      }
      
      setAgents(agentsData);
    } catch (err) {
      console.error('Error fetching agents:', err);
      showNotification('Erreur lors du chargement des agents', 'error');
    }
  };

  // Charger les devises
  const fetchCurrencies = async () => {
    try {
      const res = await api.get('/currency');
      let currenciesData = [];
      
      if (Array.isArray(res.data)) {
        currenciesData = res.data;
      } else if (res.data && Array.isArray(res.data.currencies)) {
        currenciesData = res.data.currencies;
      } else if (res.data && Array.isArray(res.data.data)) {
        currenciesData = res.data.data;
      }
      
      setCurrencies(currenciesData);
    } catch (err) {
      console.error('Error fetching currencies:', err);
      showNotification('Erreur lors du chargement des devises', 'error');
    }
  };

  // Charger le résumé du mois en cours
  const fetchCurrentMonthGains = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gain/summary/current-month');
      const data = Array.isArray(res.data) ? res.data : [];
      
      // Transformer les données pour avoir un format cohérent
      const transformedData = data.map(item => ({
        agent_id: item.agent_id,
        agent_name: item.agent_name,
        currency_id: item.currency_id,
        currency_code: item.currency_code,
        currency_name: item.currency_name,
        total_gains: item.current_month_gains || 0,
        number_of_gains: item.number_of_gains || 0,
        average_commission_percent: item.average_commission_percent || 0
      }));
      
      setGainsData(transformedData);
    } catch (err) {
      console.error('Error fetching current month gains:', err);
      if (err.response?.status === 403) {
        showNotification('Accès non autorisé aux données de gains', 'error');
      } else {
        showNotification('Erreur lors du chargement des gains du mois en cours', 'error');
      }
      setGainsData([]);
    } finally {
      setLoading(false);
    }
  };

  // Initialisation
  useEffect(() => {
    fetchAgents();
    fetchCurrencies();
    fetchCurrentMonthGains();
  }, []);

  // Appliquer les filtres
  const filteredGains = gainsData.filter(item => {
    const matchesAgent = !filters.agent_id || item.agent_id.toString() === filters.agent_id;
    const matchesCurrency = !filters.currency_id || item.currency_id.toString() === filters.currency_id;
    return matchesAgent && matchesCurrency;
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      agent_id: '',
      currency_id: ''
    });
    setShowFilters(false);
  };

  const refreshData = () => {
    fetchCurrentMonthGains();
  };

  const formatAmount = (amount, currencyCode = 'USD') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format amount compact pour mobile
  const formatAmountCompact = (amount, currencyCode = 'USD') => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M ${currencyCode}`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K ${currencyCode}`;
    }
    return formatAmount(amount, currencyCode);
  };

  // Statistiques globales
  const stats = {
    totalGains: filteredGains.reduce((sum, item) => sum + item.total_gains, 0),
    totalTransactions: filteredGains.reduce((sum, item) => sum + item.number_of_gains, 0),
    uniqueAgents: new Set(filteredGains.map(item => item.agent_id)).size,
    uniqueCurrencies: new Set(filteredGains.map(item => item.currency_code)).size
  };

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Notification */}
      {notification && (
        <div className="fixed inset-x-0 top-4 z-50 px-4">
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Gains des Agents</h1>
          <p className="text-xs lg:text-sm text-gray-600">{currentPeriod.monthName} - Gains du mois en cours</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={refreshData}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors order-2 sm:order-1"
          >
            <RefreshCw size={18} />
            <span className="text-sm">Actualiser</span>
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors order-1 sm:order-2"
          >
            <Filter size={18} />
            <span className="text-sm">Filtres</span>
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          <button
            onClick={() => showNotification('Fonctionnalité d\'export à venir', 'info')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors order-3"
          >
            <Download size={18} />
            <span className="text-sm">Exporter</span>
          </button>
        </div>
      </div>

      {/* Filtres - Version mobile expandable */}
      {showFilters && (
        <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-4 mb-4 lg:mb-6 border border-gray-100">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Filtre Agent */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                <select
                  value={filters.agent_id}
                  onChange={(e) => handleFilterChange('agent_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Tous les agents</option>
                  {agents.map(agent => (
                    <option key={`agent-${agent.id}`} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtre Devise */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
                <select
                  value={filters.currency_id}
                  onChange={(e) => handleFilterChange('currency_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Toutes les devises</option>
                  {currencies.map(currency => (
                    <option key={`currency-${currency.id}`} value={currency.id}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={resetFilters}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                Réinitialiser
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cartes de statistiques */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-3 lg:p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 lg:p-3 rounded-lg bg-green-100 text-green-600 mr-2 lg:mr-4">
                <DollarSign size={isMobile ? 18 : 24} />
              </div>
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Total Gains</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-800">
                  {isMobile ? formatAmountCompact(stats.totalGains) : formatAmount(stats.totalGains)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-3 lg:p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 lg:p-3 rounded-lg bg-blue-100 text-blue-600 mr-2 lg:mr-4">
                <TrendingUp size={isMobile ? 18 : 24} />
              </div>
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.totalTransactions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-3 lg:p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 lg:p-3 rounded-lg bg-purple-100 text-purple-600 mr-2 lg:mr-4">
                <User size={isMobile ? 18 : 24} />
              </div>
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Agents</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.uniqueAgents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-3 lg:p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 lg:p-3 rounded-lg bg-orange-100 text-orange-600 mr-2 lg:mr-4">
                <Globe size={isMobile ? 18 : 24} />
              </div>
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Devises</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.uniqueCurrencies}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal - Version mobile cards / desktop table */}
      {loading ? (
        isMobile ? <MobileCardSkeleton /> : <DesktopTableSkeleton />
      ) : (
        <>
          {isMobile ? (
            /* Version mobile - Cards */
            <div className="bg-white rounded-lg lg:rounded-xl shadow-sm overflow-hidden border border-gray-100">
              {filteredGains.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {filteredGains.map((item, index) => (
                    <div 
                      key={`mobile-gain-${item.agent_id}-${item.currency_id}-${index}`}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium">
                            {item.agent_name ? item.agent_name.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {item.agent_name || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {item.agent_id}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-green-600">
                            {formatAmountCompact(item.total_gains, item.currency_code)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.number_of_gains} trans.
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-700">
                          <Globe size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{item.currency_code || item.currency_name || 'N/A'}</span>
                        </div>
                        
                        <div className="flex items-center text-gray-700">
                          <div className="w-4 mr-2 flex justify-center flex-shrink-0">
                            <span className="text-xs text-gray-400">%</span>
                          </div>
                          <span>
                            Commission: {item.average_commission_percent 
                              ? `${(item.average_commission_percent * 100).toFixed(1)}%`
                              : 'N/A'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <DollarSign size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-base font-medium text-gray-500">Aucun gain trouvé</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {filters.agent_id || filters.currency_id 
                      ? "Modifiez vos critères de recherche" 
                      : "Aucun gain enregistré ce mois"}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Version desktop - Table */
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Agent
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Devise
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Gains
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nb Transactions
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commission Moyenne
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredGains.length > 0 ? (
                      filteredGains.map((item, index) => (
                        <tr 
                          key={`desktop-gain-${item.agent_id}-${item.currency_id}-${index}`}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 lg:h-10 lg:w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium text-sm lg:text-base">
                                {item.agent_name ? item.agent_name.charAt(0).toUpperCase() : 'A'}
                              </div>
                              <div className="ml-3 lg:ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {item.agent_name || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {item.agent_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-700">
                              <Globe size={16} className="mr-2 text-gray-400" />
                              {item.currency_code || item.currency_name || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatAmount(item.total_gains, item.currency_code)}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {item.number_of_gains || 0}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {item.average_commission_percent 
                              ? `${(item.average_commission_percent * 100).toFixed(2)}%`
                              : 'N/A'
                            }
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <DollarSign size={32} className="text-gray-300 mb-2" />
                            <p className="text-base font-medium text-gray-500">Aucun gain trouvé</p>
                            <p className="text-sm text-gray-400 mt-1">
                              {filters.agent_id || filters.currency_id 
                                ? "Aucune donnée ne correspond à vos critères de recherche" 
                                : "Aucun gain enregistré pour le mois en cours"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Résumé par agent (Desktop seulement) */}
      {!loading && !isMobile && Object.keys(filteredGains.reduce((acc, item) => {
        acc[item.agent_id] = item;
        return acc;
      }, {})).length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Résumé par Agent</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(filteredGains.reduce((acc, item) => {
              if (!acc[item.agent_id]) {
                acc[item.agent_id] = {
                  agent_id: item.agent_id,
                  agent_name: item.agent_name,
                  total_gains: 0,
                  number_of_transactions: 0,
                  currencies: new Set()
                };
              }
              
              acc[item.agent_id].total_gains += item.total_gains;
              acc[item.agent_id].number_of_transactions += item.number_of_gains;
              acc[item.agent_id].currencies.add(item.currency_code);
              
              return acc;
            }, {})).map((agentStats) => (
              <div key={`summary-${agentStats.agent_id}`} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium text-lg">
                    {agentStats.agent_name ? agentStats.agent_name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="ml-4">
                    <div className="text-base font-medium text-gray-900">{agentStats.agent_name}</div>
                    <div className="text-sm text-gray-500">{Array.from(agentStats.currencies).join(', ')}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Gains</p>
                    <p className="text-lg font-bold text-gray-800">{formatAmount(agentStats.total_gains)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Transactions</p>
                    <p className="text-lg font-bold text-gray-800">{agentStats.number_of_transactions}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}