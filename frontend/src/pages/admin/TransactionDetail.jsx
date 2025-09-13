import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/api";

export default function TransactionsList() {
  const [transactions, setTransactions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get("/transactions");
      setTransactions(res.data || []);
    } catch (err) {
      console.error("Erreur fetch transactions", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await api.get("/admin"); // liste agents
      setAgents(res.data || []);
    } catch (err) {
      console.error("Erreur fetch agents", err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchAgents();
  }, []);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await api.put(`/transactions/${id}/validate`, { status });
      await fetchTransactions();
    } catch (err) {
      console.error("Erreur update status", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const cancelTransaction = async (id) => {
    setUpdatingId(id);
    try {
      await api.put(`/transactions/${id}/cancel`);
      await fetchTransactions();
    } catch (err) {
      console.error("Erreur annulation", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const reassignAgent = async (id, agentId) => {
    setUpdatingId(id);
    try {
      await api.post(`/transactions/${id}/redirect`, { agent_id: agentId });
      await fetchTransactions();
    } catch (err) {
      console.error("Erreur reassign agent", err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Toutes les transactions</h1>

      <div className="overflow-x-auto">
        <table className="w-full border rounded-2xl bg-white shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">Montant</th>
              <th className="px-4 py-2 text-left">Statut</th>
              <th className="px-4 py-2 text-left">Agent</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-4 py-2">{t.tracking_code}</td>
                <td className="px-4 py-2">{t.customer_name}</td>
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
                {/* Réassignation agent */}
                <td className="px-4 py-2">
                  <select
                    value={t.agent_id || ""}
                    onChange={(e) => reassignAgent(t.id, e.target.value)}
                    disabled={updatingId === t.id}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="">-- Choisir --</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.country})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 space-x-2">
                  {/* Voir détail */}
                  <Link
                    to={`/admin/transactions/${t.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Voir
                  </Link>

                  {/* Actions rapides */}
                  {t.status !== "completed" && (
                    <button
                      onClick={() => updateStatus(t.id, "completed")}
                      disabled={updatingId === t.id}
                      className="px-2 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                    >
                      {updatingId === t.id ? "..." : "Valider"}
                    </button>
                  )}
                  {t.status !== "pending" && (
                    <button
                      onClick={() => updateStatus(t.id, "pending")}
                      disabled={updatingId === t.id}
                      className="px-2 py-1 rounded bg-yellow-500 text-white text-xs hover:bg-yellow-600"
                    >
                      {updatingId === t.id ? "..." : "Mettre en attente"}
                    </button>
                  )}
                  {t.status !== "canceled" && (
                    <button
                      onClick={() => cancelTransaction(t.id)}
                      disabled={updatingId === t.id}
                      className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                    >
                      {updatingId === t.id ? "..." : "Annuler"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
