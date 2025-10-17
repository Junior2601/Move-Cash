// src/pages/Agents/AgentDashboard.jsx
import React, { useEffect, useState } from "react";
import { 
  Wallet, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  DollarSign,
  RefreshCw,
  Eye,
  ShieldAlert,
  User,
  Euro
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import useAgentApi from "../../hooks/useAgentApi";

export default function AgentDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const agentApi = useAgentApi();
      
      const response = await agentApi.get("/transactions/agent/dashboard");
      console.log("📊 Données dashboard reçues:", response.data);
      
      setDashboardData(response.data.data);
    } catch (err) {
      console.error("❌ Erreur dashboard agent:", err);
      
      if (err.response?.status === 403) {
        setError("Accès refusé. Vérifiez que vous êtes connecté en tant qu'agent.");
      } else if (err.response?.status === 401) {
        setError("Session expirée. Veuillez vous reconnecter.");
      } else if (err.message === "Aucun token agent trouvé") {
        setError("Vous devez être connecté pour accéder au dashboard.");
      } else if (err.response?.status === 404) {
        setError("Service indisponible. Veuillez réessayer plus tard.");
      } else {
        setError("Erreur lors du chargement des données: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600 text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${
              trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-slate-500'
            }`}>
              <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
              <span>{trend > 0 ? '+' : ''}{trend}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const BalanceBadge = ({ balance, code, symbol }) => {
    if (parseFloat(balance || 0) === 0) return null;

    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200 text-xs font-medium hover:bg-sky-200 transition-colors duration-150">
        <span>{code}</span>
        <span className="text-sky-600">
          {symbol}{parseFloat(balance || 0).toFixed(2)}
        </span>
      </div>
    );
  };

  const TransactionItem = ({ transaction }) => (
    <div className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${
          transaction.status === 'effectuee' ? 'bg-green-100 text-green-600' :
          transaction.status === 'en_attente' ? 'bg-yellow-100 text-yellow-600' :
          'bg-red-100 text-red-600'
        }`}>
          {transaction.status === 'effectuee' ? <CheckCircle2 className="w-4 h-4" /> :
           transaction.status === 'en_attente' ? <Clock className="w-4 h-4" /> :
           <AlertCircle className="w-4 h-4" />}
        </div>
        <div>
          <p className="font-medium text-slate-800 text-sm">
            #{transaction.tracking_code || `TRX${transaction.id}`}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-slate-800">
          {parseFloat(transaction.send_amount || 0).toFixed(2)} {transaction.from_currency_symbol || '€'}
        </p>
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
          transaction.status === 'effectuee' ? 'bg-green-100 text-green-800' :
          transaction.status === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {transaction.status === 'effectuee' ? 'Validée' :
           transaction.status === 'en_attente' ? 'En attente' : 
           transaction.status === 'expiree' ? 'Expirée' : 'Échouée'}
        </span>
      </div>
    </div>
  );

  const agentInfo = JSON.parse(localStorage.getItem("agentInfo") || "{}");
  const recentTransactions = dashboardData?.recent_transactions || [];
  const balancesByCurrency = dashboardData?.balances_by_currency || [];
  const monthlyVolumeByCurrency = dashboardData?.monthly_volume_by_currency || [];
  
  // Filtrer les soldes non nuls
  const nonZeroBalances = balancesByCurrency.filter(balance => 
    parseFloat(balance.balance || 0) > 0
  );

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Erreur d'accès</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/agent/login')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Se connecter en tant qu'agent
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("agentToken");
                localStorage.removeItem("agentInfo");
                window.location.reload();
              }}
              className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              Effacer la session
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec info agent */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Tableau de Bord Agent
              </h1>
              <p className="text-slate-600">
                Connecté en tant que <span className="font-semibold">{agentInfo.name || "Agent"}</span>
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 hover:shadow-sm transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {/* Grid des statistiques avec solde total intégré */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Carte Solde Total avec badges */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 group md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Solde Total</p>
              <p className="text-2xl font-bold text-slate-800">
                {dashboardData?.balance?.toFixed(2) || '0.00'} €
              </p>
              <p className="text-xs text-slate-500 mt-1">Montant total disponible</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 group-hover:scale-110 transition-transform duration-300">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
          
          {/* Badges des soldes par devise */}
          {nonZeroBalances.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-2 font-medium">SOLDE PAR DEVISES</p>
              <div className="flex flex-wrap gap-1.5">
                {nonZeroBalances.map((balance, index) => (
                  <BalanceBadge
                    key={index}
                    balance={balance.balance}
                    code={balance.currency_code}
                    symbol={balance.currency_symbol}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        
        <StatCard
          title="En Attente"
          value={dashboardData?.pending || 0}
          icon={Clock}
          color="bg-gradient-to-br from-yellow-500 to-yellow-600"
          subtitle="Transactions en cours"
        />
        
        <StatCard
          title="Validées"
          value={dashboardData?.completed || 0}
          icon={CheckCircle2}
          color="bg-gradient-to-br from-green-500 to-green-600"
          subtitle="Transactions terminées"
        />
        
        <StatCard
          title="Échouées"
          value={dashboardData?.failed || 0}
          icon={AlertCircle}
          color="bg-gradient-to-br from-red-500 to-red-600"
          subtitle="Transactions annulées"
        />
      </div>

      {/* Section gains et statistiques avancées */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance du mois */}
        <div className="lg:col-span-1 bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-slate-800">Performance du Mois</h3>
          </div>
          <div className="space-y-4">
            {/* Volume total des transactions */}
            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">Volume total</span>
              <span className="font-semibold text-blue-600">
                {dashboardData?.monthly_volume?.toFixed(2) || '0.00'} €
              </span>
            </div>
            
            {/* Commissions totales */}
            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">Commissions</span>
              <span className="font-semibold text-emerald-600">
                +{dashboardData?.monthly_earnings?.toFixed(2) || '0.00'} €
              </span>
            </div>
            
            {/* Volume par devise */}
            {monthlyVolumeByCurrency.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-500 font-medium mb-2">VOLUME PAR DEVISES</p>
                {monthlyVolumeByCurrency.map((currencyData, index) => (
                  <div key={index} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">
                      {currencyData.currency_code}
                    </span>
                    <div className="text-right">
                      <div className="font-medium text-slate-700">
                        {parseFloat(currencyData.total_volume).toFixed(2)} {currencyData.currency_symbol}
                      </div>
                      <div className="text-emerald-600">
                        +{parseFloat(currencyData.total_commissions).toFixed(2)} com.
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">Transactions</span>
              <span className="font-semibold text-slate-800">
                {dashboardData?.monthly_transactions || 0}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Taux de réussite</span>
                <span className="font-semibold text-blue-600">
                  {dashboardData?.completed && dashboardData?.pending ? 
                    Math.round((dashboardData.completed / (dashboardData.completed + dashboardData.pending + dashboardData.failed)) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions récentes */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-slate-800">Transactions Récentes</h3>
            </div>
            <Link 
              to="/agent/transactions"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <Eye className="w-4 h-4" />
              Voir tout
            </Link>
          </div>
          
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Aucune transaction récente</p>
                <p className="text-sm text-slate-400 mt-1">Vos transactions apparaîtront ici</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">Actions Rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/agent/transactions"
            className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 group"
          >
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-800">Gérer Transactions</p>
              <p className="text-sm text-slate-600">Voir et valider</p>
            </div>
          </Link>
          
          <Link
            to="/agent/balances"
            className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-green-300 hover:bg-green-50/50 transition-all duration-200 group"
          >
            <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-800">Mes Fonds</p>
              <p className="text-sm text-slate-600">Consulter le solde</p>
            </div>
          </Link>
          
          <Link
            to="/agent/history"
            className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition-all duration-200 group"
          >
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-200 transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-800">Historique</p>
              <p className="text-sm text-slate-600">Toutes les activités</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}