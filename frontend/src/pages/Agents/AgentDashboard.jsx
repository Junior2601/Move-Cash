import React, { useEffect, useState } from "react";
import { Wallet, Clock, CheckCircle2, TrendingUp, DollarSign } from "lucide-react";
import api from "../../api/api";

export default function AgentDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/transactions/agent/dashboard');
      
      console.log("🔍 Réponse dashboard complète:", res);
      console.log("🔍 Données dashboard:", res.data);
      
      // Gérer les deux formats possibles : res.data.data ou res.data
      const data = res.data.data || res.data;
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error("Erreur dashboard agent", err);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-lg">Chargement du tableau de bord...</div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-4 my-6">
      <div className="text-red-700">{error}</div>
    </div>
  );

  // Accéder aux données
  const stats = dashboardData?.stats;
  const monthlyPerformance = dashboardData?.monthly_performance;
  const agentInfo = dashboardData?.agent_info;
  const recentTransactions = dashboardData?.recent_transactions;

  console.log("🔍 Données formatées pour l'affichage:", {
    stats,
    monthlyPerformance,
    agentInfo,
    recentTransactions
  });

  return (
    <div className="space-y-4 p-4 md:space-y-6 md:p-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Tableau de bord Agent</h1>
        <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          Connecté en tant que <span className="font-semibold text-gray-700">{agentInfo?.name || "Agent"}</span>
        </div>
      </div>

      {/* Cartes de statistiques principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Solde total */}
        <div className="bg-white shadow rounded-xl md:rounded-2xl p-4 md:p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-500 text-sm mb-1">Solde total</p>
              <p className="text-xl md:text-2xl font-bold text-gray-800 truncate">
                {stats?.current_balance?.reduce((total, balance) => 
                  total + parseFloat(balance.balance || 0), 0).toLocaleString('fr-FR') || 0} €
              </p>
              
              {/* Badges des devises */}
              <div className="flex flex-wrap gap-1 mt-2">
                {stats?.current_balance?.map((balance, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {balance.currency_code}: {parseFloat(balance.balance || 0).toLocaleString('fr-FR')}
                  </span>
                ))}
                {(!stats?.current_balance || stats.current_balance.length === 0) && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Aucun solde
                  </span>
                )}
              </div>
            </div>
            <Wallet className="w-8 h-8 md:w-10 md:h-10 text-blue-500 flex-shrink-0 ml-2" />
          </div>
        </div>

        {/* Transactions en attente */}
        <div className="bg-white shadow rounded-xl md:rounded-2xl p-4 md:p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">En attente</p>
              <p className="text-xl md:text-2xl font-bold text-gray-800">
                {stats?.by_status?.en_attente?.count || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {stats?.by_status?.en_attente?.total_send_amount?.toLocaleString('fr-FR') || 0} €
              </p>
            </div>
            <Clock className="w-8 h-8 md:w-10 md:h-10 text-yellow-500 flex-shrink-0 ml-2" />
          </div>
        </div>

        {/* Transactions validées */}
        <div className="bg-white shadow rounded-xl md:rounded-2xl p-4 md:p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Validées</p>
              <p className="text-xl md:text-2xl font-bold text-gray-800">
                {stats?.by_status?.effectuee?.count || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {stats?.by_status?.effectuee?.total_send_amount?.toLocaleString('fr-FR') || 0} €
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-green-500 flex-shrink-0 ml-2" />
          </div>
        </div>

        {/* Gains totaux */}
        <div className="bg-white shadow rounded-xl md:rounded-2xl p-4 md:p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Gains totaux</p>
              <p className="text-xl md:text-2xl font-bold text-gray-800">
                {stats?.performance?.total_gains?.toLocaleString('fr-FR') || 0} €
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Taux: {stats?.performance?.success_rate || 0}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-purple-500 flex-shrink-0 ml-2" />
          </div>
        </div>
      </div>

      {/* Deuxième ligne de statistiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Performance du mois */}
        <div className="bg-white shadow rounded-xl md:rounded-2xl p-4 md:p-6">
          <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
            <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
            <h3 className="text-base md:text-lg font-semibold">Performance du mois</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 text-sm">Mois:</span>
              <span className="font-semibold text-sm">{monthlyPerformance?.current_month || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 text-sm">Transactions:</span>
              <span className="font-semibold text-sm">{monthlyPerformance?.transaction_count || 0}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 text-sm">Gains:</span>
              <span className="font-semibold text-sm text-green-600">
                {monthlyPerformance?.total_gains?.toLocaleString('fr-FR') || 0} €
              </span>
            </div>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="bg-white shadow rounded-xl md:rounded-2xl p-4 md:p-6">
          <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
            <h3 className="text-base md:text-lg font-semibold">Statistiques globales</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 text-sm">Total transactions:</span>
              <span className="font-semibold text-sm">{stats?.totals?.total_transactions || 0}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 text-sm">Montant total:</span>
              <span className="font-semibold text-sm">
                {stats?.totals?.total_send_amount?.toLocaleString('fr-FR') || 0} €
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 text-sm">Taux réussite:</span>
              <span className="font-semibold text-sm text-green-600">
                {stats?.performance?.success_rate || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Transactions récentes */}
        <div className="bg-white shadow rounded-xl md:rounded-2xl p-4 md:p-6">
          <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
            <Clock className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
            <h3 className="text-base md:text-lg font-semibold">Dernières transactions</h3>
          </div>
          <div className="space-y-2">
            {recentTransactions?.slice(0, 3).map(transaction => (
              <div key={transaction.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{transaction.tracking_code}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="font-semibold text-sm whitespace-nowrap">
                    {parseFloat(transaction.send_amount || 0).toLocaleString('fr-FR')} €
                  </div>
                  <div className={`text-xs ${
                    transaction.status === 'effectuee' ? 'text-green-600' : 
                    transaction.status === 'en_attente' ? 'text-yellow-600' : 
                    'text-red-600'
                  }`}>
                    {transaction.status}
                  </div>
                </div>
              </div>
            ))}
            {(!recentTransactions || recentTransactions.length === 0) && (
              <div className="text-center text-gray-500 text-sm py-4">
                Aucune transaction récente
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section détaillée par statut */}
      <div className="bg-white shadow rounded-xl md:rounded-2xl p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Détail par statut</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {Object.entries(stats?.by_status || {}).map(([status, data]) => (
            <div key={status} className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg md:text-2xl font-bold text-gray-800">{data.count || 0}</div>
              <div className="text-xs md:text-sm text-gray-600 capitalize mt-1">
                {status.replace('_', ' ')}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {data.total_send_amount?.toLocaleString('fr-FR') || 0} €
              </div>
            </div>
          ))}
          {(!stats?.by_status || Object.keys(stats.by_status).length === 0) && (
            <div className="col-span-2 sm:col-span-4 text-center text-gray-500 py-4 text-sm">
              Aucune donnée de statut disponible
            </div>
          )}
        </div>
      </div>

      {/* Informations de débogage (à retirer en production) */}
      <div className="bg-gray-100 p-3 md:p-4 rounded-lg">
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-gray-700">Données brutes (débogage)</summary>
          <pre className="mt-2 text-xs overflow-auto bg-white p-2 rounded border">
            {JSON.stringify(dashboardData, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}