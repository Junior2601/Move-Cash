// src/pages/agent/AgentDashboard.jsx
import React, { useEffect, useState } from "react";
import { Wallet, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import api from "../../api/api";

export default function AgentDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.get("/agent/stats"); // ⚠️ à créer côté backend si pas dispo
      setStats(res.data);
    } catch (err) {
      console.error("Erreur stats agent", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <div>Chargement du tableau de bord...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tableau de bord Agent</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-2xl p-6 flex items-center space-x-4">
          <Wallet className="w-10 h-10 text-blue-600" />
          <div>
            <p className="text-gray-500 text-sm">Solde total</p>
            <p className="text-lg font-semibold">
              {stats?.balance || 0} ₽
            </p>
          </div>
        </div>

        <div className="bg-white shadow rounded-2xl p-6 flex items-center space-x-4">
          <Clock className="w-10 h-10 text-yellow-500" />
          <div>
            <p className="text-gray-500 text-sm">Transactions en attente</p>
            <p className="text-lg font-semibold">
              {stats?.pending || 0}
            </p>
          </div>
        </div>

        <div className="bg-white shadow rounded-2xl p-6 flex items-center space-x-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
          <div>
            <p className="text-gray-500 text-sm">Transactions validées</p>
            <p className="text-lg font-semibold">
              {stats?.completed || 0}
            </p>
          </div>
        </div>

        <div className="bg-white shadow rounded-2xl p-6 flex items-center space-x-4">
          <AlertCircle className="w-10 h-10 text-red-600" />
          <div>
            <p className="text-gray-500 text-sm">Transactions échouées</p>
            <p className="text-lg font-semibold">
              {stats?.failed || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
