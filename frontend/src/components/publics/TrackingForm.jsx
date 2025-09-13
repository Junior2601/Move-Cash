// src/components/public/TrackingForm.jsx
import React, { useState } from "react";
import api from "../../api/api";

export default function TrackingForm() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.get(`/transactions/tracking/${code}`);
      setStatus(res.data.status);
    } catch (err) {
      setStatus("Inexistante");
    }
  };

  return (
    <div className="bg-white shadow rounded-xl p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Entrer code suivi"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Vérifier
        </button>
      </form>

      {status && (
        <p className="mt-4">
          Statut :{" "}
          <span
            className={`font-bold ${
              status === "En attente"
                ? "text-yellow-500"
                : status === "Effectuée"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {status}
          </span>
        </p>
      )}
    </div>
  );
}
