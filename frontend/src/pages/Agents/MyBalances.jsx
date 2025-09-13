// src/pages/agent/MyBalances.jsx
import React, { useEffect, useState } from "react";
import { Wallet, RefreshCw } from "lucide-react";
import api from "../../api/api";

export default function MyBalances() {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBalances = async () => {
    try {
      const res = await api.get("/agent/balances"); // ⚠️ à implémenter côté backend
      setBalances(res.data);
    } catch (err) {
      console.error("Erreur récupération des fonds agent", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  if (loading) return <div>Chargement de vos fonds...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mes Fonds</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {balances.map((balance) => (
          <div
            key={balance.currency}
            className="bg-white shadow rounded-2xl p-6 flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <Wallet className="w-10 h-10 text-blue-600" />
              <div>
                <p className="text-gray-500 text-sm">{balance.currency}</p>
                <p className="text-lg font-semibold">
                  {balance.amount.toLocaleString()}{" "}
                  {balance.currency}
                </p>
              </div>
            </div>
            <button
              onClick={() => alert("Fonction recharge à implémenter ⚡")}
              className="flex items-center bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Recharger
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
