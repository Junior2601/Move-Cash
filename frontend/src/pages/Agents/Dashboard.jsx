// src/pages/agent/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { Wallet, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import api from "../../api/api";
import { Link } from "react-router-dom";

export default function AgentDashboard() {
  const [balances, setBalances] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // ⚠️ adapter les endpoints backend
      const resBalances = await api.get("/balance/my-balance/:agent_id");
      const resTx = await api.get("/transactions/all-transactions?limit=5");
      setBalances(resBalances.data || []);
      setRecentTransactions(resTx.data || []);
    } catch (err) {
      console.error("Erreur Dashboard Agent", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div>Chargement du dashboard agent...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mon Tableau de Bord</h1>

      {/* Fonds disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {balances.map((b) => (
          <div
            key={b.currency}
            className="bg-white p-4 rounded-2xl shadow flex items-center justify-between"
          >
            <div className="flex items-center">
              <Wallet className="text-green-600 w-8 h-8 mr-3" />
              <div>
                <p className="text-gray-500 text-sm">{b.currency}</p>
                <p className="text-lg font-bold">{b.amount}</p>
              </div>
            </div>
            {b.amount > 1000 ? (
              <CheckCircle2 className="text-green-600 w-6 h-6" />
            ) : (
              <AlertCircle className="text-red-600 w-6 h-6" />
            )}
          </div>
        ))}
      </div>

      {/* Transactions récentes */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Mes transactions récentes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Montant</th>
                <th className="px-4 py-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2">{t.tracking_code}</td>
                  <td className="px-4 py-2">
                    {t.amount} {t.origin_currency}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        t.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : t.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-4 py-2 text-center text-gray-500">
                    Aucune transaction
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-right">
          <Link
            to="/agent/transactions"
            className="text-blue-600 hover:underline text-sm"
          >
            Voir toutes mes transactions →
          </Link>
        </div>
      </div>
    </div>
  );
}
