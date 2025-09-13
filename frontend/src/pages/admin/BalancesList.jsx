// src/pages/admin/BalancesList.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/api";

export default function BalancesList() {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); 
  // modal = { mode: "add" | "credit" | "debit", balance: {} }

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const res = await api.get("/balance"); // ⚠️ assure-toi que ton backend expose GET /balance (admin)
      setBalances(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const saveBalance = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === "add") {
        await api.post("/balance/create", modal.balance);
      } else if (modal.mode === "credit") {
        await api.post("/balance/credit", {
          agent_id: modal.balance.agent_id,
          currency_id: modal.balance.currency_id,
          amount: modal.balance.amount,
        });
      } else if (modal.mode === "debit") {
        await api.post("/balance/debit", {
          agent_id: modal.balance.agent_id,
          currency_id: modal.balance.currency_id,
          amount: modal.balance.amount,
        });
      }
      setModal(null);
      fetchBalances();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteBalance = async (id) => {
    if (!window.confirm("Supprimer cette balance ?")) return;
    try {
      await api.delete(`/balance/${id}`); // ⚠️ vérifie si route DELETE existe
      fetchBalances();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4 flex justify-between">
        Gestion des balances
        <button
          onClick={() =>
            setModal({
              mode: "add",
              balance: { agent_id: "", currency_id: "", amount: 0 },
            })
          }
          className="bg-indigo-600 text-white px-3 py-2 rounded"
        >
          + Créer une balance
        </button>
      </h1>

      {loading ? (
        <div>Chargement...</div>
      ) : (
        <table className="w-full text-sm bg-white rounded-xl shadow">
          <thead>
            <tr>
              <th className="py-2 px-3">ID</th>
              <th>Agent</th>
              <th>Devise</th>
              <th>Montant</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="py-2 px-3">{b.id}</td>
                <td>{b.agent_name || b.agent_id}</td>
                <td>{b.currency_code || b.currency_id}</td>
                <td>{b.amount}</td>
                <td className="space-x-2">
                  <button
                    onClick={() =>
                      setModal({
                        mode: "credit",
                        balance: { ...b, amount: 0 },
                      })
                    }
                    className="text-green-600"
                  >
                    Créditer
                  </button>
                  <button
                    onClick={() =>
                      setModal({
                        mode: "debit",
                        balance: { ...b, amount: 0 },
                      })
                    }
                    className="text-yellow-600"
                  >
                    Débiter
                  </button>
                  <button
                    onClick={() => deleteBalance(b.id)}
                    className="text-red-600"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <form
            onSubmit={saveBalance}
            className="bg-white p-6 rounded-xl shadow w-96 space-y-3"
          >
            <h2 className="text-xl font-semibold">
              {modal.mode === "add"
                ? "Nouvelle balance"
                : modal.mode === "credit"
                ? "Créditer balance"
                : "Débiter balance"}
            </h2>

            {(modal.mode === "add" || modal.mode === "credit" || modal.mode === "debit") && (
              <>
                <input
                  value={modal.balance.agent_id}
                  onChange={(e) =>
                    setModal({
                      ...modal,
                      balance: { ...modal.balance, agent_id: e.target.value },
                    })
                  }
                  placeholder="ID agent"
                  className="w-full border px-3 py-2 rounded"
                />
                <input
                  value={modal.balance.currency_id}
                  onChange={(e) =>
                    setModal({
                      ...modal,
                      balance: {
                        ...modal.balance,
                        currency_id: e.target.value,
                      },
                    })
                  }
                  placeholder="ID devise"
                  className="w-full border px-3 py-2 rounded"
                />
              </>
            )}

            {(modal.mode === "credit" || modal.mode === "debit") && (
              <input
                type="number"
                value={modal.balance.amount}
                onChange={(e) =>
                  setModal({
                    ...modal,
                    balance: { ...modal.balance, amount: e.target.value },
                  })
                }
                placeholder="Montant"
                className="w-full border px-3 py-2 rounded"
              />
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-3 py-2 border rounded"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="bg-indigo-600 text-white px-3 py-2 rounded"
              >
                {modal.mode === "add"
                  ? "Créer"
                  : modal.mode === "credit"
                  ? "Créditer"
                  : "Débiter"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
