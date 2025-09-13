// src/pages/agent/MyTransactions.jsx
import React, { useEffect, useState } from "react";
import { ArrowRightCircle, RefreshCcw } from "lucide-react";
import api from "../../api/api";
import { Link } from "react-router-dom";

export default function MyTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resTx = await api.get("/transactions/my-transactions/:agent_id");
      const resAgents = await api.get("/agents/agents-list");
      setTransactions(resTx.data || []);
      setAgents(resAgents.data || []);
    } catch (err) {
      console.error("Erreur transactions agent", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = async (transactionId, newAgentId) => {
    setRedirecting(transactionId);
    try {
      await api.post(`/transactions/redirect/${transactionId}`, {
        new_agent_id: newAgentId,
      });
      await fetchData(); // refresh
    } catch (err) {
      console.error("Erreur redirection", err);
    } finally {
      setRedirecting(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div>Chargement de mes transactions...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mes Transactions</h1>

      <div className="overflow-x-auto bg-white rounded-2xl shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">Montant</th>
              <th className="px-4 py-2 text-left">Client</th>
              <th className="px-4 py-2 text-left">Statut</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-4 py-2 font-mono">{t.tracking_code}</td>
                <td className="px-4 py-2">
                  {t.amount} {t.origin_currency}
                </td>
                <td className="px-4 py-2">{t.customer_name || "—"}</td>
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
                <td className="px-4 py-2 flex gap-2">
                  {/* Voir détails */}
                  <Link
                    to={`/agent/transaction/${t.id}`}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Détails
                  </Link>

                  {/* Redirection */}
                  {t.status === "pending" && (
                    <div className="relative">
                      <select
                        onChange={(e) =>
                          handleRedirect(t.id, e.target.value)
                        }
                        defaultValue=""
                        className="text-xs border rounded px-1 py-0.5"
                        disabled={redirecting === t.id}
                      >
                        <option value="">Rediriger vers...</option>
                        {agents
                          .filter((a) => a.id !== t.agent_id)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                      {redirecting === t.id && (
                        <RefreshCcw className="animate-spin w-4 h-4 text-gray-500 absolute right-[-20px] top-1" />
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="px-4 py-4 text-center text-gray-500"
                >
                  Aucune transaction trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
