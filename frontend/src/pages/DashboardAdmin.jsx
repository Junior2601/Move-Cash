import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/Layout/AdminLayout';
import api from '../api/api';
import StatsCard from '../components/ui/StatsCard';

export default function DashboardAdmin() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await api.get('/transactions/transactions/stats'); // ajuste si endpoint diff
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold mb-4">Tableau de bord</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Transferts totaux" value={loading ? '...' : stats?.total || 0} />
        <StatsCard title="Volume (devise locale)" value={loading ? '...' : stats?.volume || 0} />
        <StatsCard title="En attente" value={loading ? '...' : stats?.pending || 0} />
        <StatsCard title="Effectuées" value={loading ? '...' : stats?.done || 0} />
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-medium mb-2">Dernières transactions</h2>
        {/* ici tu peux intégrer un composant Table / Transactionslist */}
      </section>
    </AdminLayout>
  );
}
