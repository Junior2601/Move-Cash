// src/pages/agent/TransactionList.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import api from "../../api/api";

export default function TransactionList() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  const fetchTransactions = async () => {
    try {
      const res = await api.get("/agent/transactions"); // ⚠️ à implémenter côté backend
      setTransactions(res.data);
    } catch (err) {
      console.error("Erreur récupération transactions agent", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions =
    filter === "all"
      ? transactions
      : transactions.filter((t) => t.status === filter);

  if (loading) return <div>Chargement des transactions...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>

      {/* Filtres */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg ${
            filter === "all" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          Toutes
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-lg ${
            filter === "pending" ? "bg-yellow-500 text-white" : "bg-gray-200"
          }`}
        >
          En attente
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-4 py-2 rounded-lg ${
            filter === "completed" ? "bg-green-600 text-white" : "bg-gray-200"
          }`}
        >
          Validées
        </button>
        <button
          onClick={() => setFilter("failed")}
          className={`px-4 py-2 rounded-lg ${
            filter === "failed" ? "bg-red-600 text-white" : "bg-gray-200"
          }`}
        >
          Échouées
        </button>
      </div>

      {/* Table des transactions */}
      <div className="bg-white shadow rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">Client</th>
              <th className="px-6 py-3 text-left">Montant</th>
              <th className="px-6 py-3 text-left">Pays</th>
              <th className="px-6 py-3 text-left">Statut</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((t) => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">{t.id}</td>
                <td className="px-6 py-3">{t.customer_name}</td>
                <td className="px-6 py-3">{t.amount} ₽</td>
                <td className="px-6 py-3">{t.country}</td>
                <td className="px-6 py-3">
                  {t.status === "pending" && (
                    <span className="flex items-center text-yellow-500">
                      <Clock className="w-4 h-4 mr-1" /> En attente
                    </span>
                  )}
                  {t.status === "completed" && (
                    <span className="flex items-center text-green-600">
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Validée
                    </span>
                  )}
                  {t.status === "failed" && (
                    <span className="flex items-center text-red-600">
                      <AlertCircle className="w-4 h-4 mr-1" /> Échouée
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={() => navigate(`/agent/transactions/${t.id}`)}
                    className="flex items-center bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                  >
                    <Eye className="w-4 h-4 mr-2" /> Voir
                  </button>
                </td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-500">
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
