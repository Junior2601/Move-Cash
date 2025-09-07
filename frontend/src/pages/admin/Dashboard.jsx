import React, { useEffect, useState } from 'react';
import api from '../../api/api';
import StatsCard from '../../components/ui/StatsCard';
import TransactionsTable from '../../components/ui/TransactionsTable';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_transactions: 0,
    total_send_amount: 0,
    pending_count: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await api.get('/transactions/stats');
        const statsData = res.data.data; // Accédez à res.data.data
        
        setStats({
          total_transactions: statsData.totals?.total_transactions || 0,
          total_send_amount: statsData.totals?.total_send_amount || 0,
          pending_count: statsData.by_status?.en_attente?.count || 0,
          pending_countE: statsData.by_status?.effectuee?.count || 0
        });
        
      } catch (err) {
        console.error('Erreur récupération stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Formater le montant pour l'affichage
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF' // ou la devise par défaut
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard 
          title="Total Transactions" 
          value={stats.total_transactions} 
          loading={loading} 
        />
        {/* <StatsCard 
          title="Volume total" 
          value={formatAmount(stats.total_send_amount)} 
          loading={loading} 
        /> */}
        <StatsCard 
          title="Transactions en attente" 
          value={stats.pending_count} 
          loading={loading} 
        />
        <StatsCard 
            title="Transactions effectuées" 
            value={stats.pending_countE} 
            loading={loading} 
        />
      </div>

      <section>
        <h2 className="text-lg font-medium mb-2">Dernières transactions</h2>
        <TransactionsTable />
      </section>
    </div>
  );
}