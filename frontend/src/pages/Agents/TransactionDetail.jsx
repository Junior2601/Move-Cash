// src/pages/agent/TransactionDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, ArrowRightCircle } from "lucide-react";
import api from "../../api/api";

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTransaction = async () => {
    try {
      const res = await api.get(`/agent/transactions/${id}`); // ⚠️ backend à prévoir
      setTransaction(res.data);
    } catch (err) {
      console.error("Erreur récupération transaction", err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    try {
      await api.put(`/transactions/${id}/validate-agent`);
      alert("✅ Transaction validée !");
      navigate("/agent/transactions");
    } catch (err) {
      console.error(err);
      alert("❌ Erreur validation transaction");
    }
  };

  const handleCancel = async () => {
    try {
      await api.put(`/transactions/${id}/cancel-agent`);
      alert("❌ Transaction annulée !");
      navigate("/agent/transactions");
    } catch (err) {
      console.error(err);
      alert("Erreur annulation transaction");
    }
  };

  const handleRedirect = async () => {
    try {
      await api.post(`/transactions/${id}/redirect`, {
        target_agent_id: "2", // ⚠️ Ex. agent cible (choix à implémenter plus tard)
      });
      alert("↪️ Transaction redirigée !");
      navigate("/agent/transactions");
    } catch (err) {
      console.error(err);
      alert("Erreur redirection transaction");
    }
  };

  useEffect(() => {
    fetchTransaction();
  }, [id]);

  if (loading) return <div>Chargement...</div>;
  if (!transaction) return <div>Transaction introuvable</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Transaction #{transaction.id}
      </h1>

      <div className="bg-white shadow rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold">Client</p>
            <p>{transaction.customer_name}</p>
          </div>
          <div>
            <p className="font-semibold">Montant envoyé</p>
            <p>{transaction.amount_send} {transaction.currency_send}</p>
          </div>
          <div>
            <p className="font-semibold">Montant reçu</p>
            <p>{transaction.amount_receive} {transaction.currency_receive}</p>
          </div>
          <div>
            <p className="font-semibold">Pays d’envoi</p>
            <p>{transaction.country_from}</p>
          </div>
          <div>
            <p className="font-semibold">Pays de réception</p>
            <p>{transaction.country_to}</p>
          </div>
          <div>
            <p className="font-semibold">Numéro agréé</p>
            <p>{transaction.agent_number}</p>
          </div>
          <div>
            <p className="font-semibold">Tracking code</p>
            <p className="text-blue-600 font-mono">{transaction.tracking_code}</p>
          </div>
          <div>
            <p className="font-semibold">Statut</p>
            <span
              className={`px-3 py-1 rounded-lg text-white ${
                transaction.status === "pending"
                  ? "bg-yellow-500"
                  : transaction.status === "completed"
                  ? "bg-green-600"
                  : "bg-red-600"
              }`}
            >
              {transaction.status}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {transaction.status === "pending" && (
        <div className="flex space-x-4 mt-6">
          <button
            onClick={handleValidate}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Valider
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <XCircle className="w-5 h-5 mr-2" />
            Annuler
          </button>
          <button
            onClick={handleRedirect}
            className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
          >
            <ArrowRightCircle className="w-5 h-5 mr-2" />
            Rediriger
          </button>
        </div>
      )}
    </div>
  );
}
