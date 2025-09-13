import React, { useState } from "react";
import api from "../../api/api";

export default function TransactionForm() {
  const [form, setForm] = useState({
    country_from: "",
    country_to: "",
    amount: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/transactions", form);
      alert(`Transaction créée ! Code suivi : ${res.data.tracking_code}`);
    } catch (err) {
      console.error(err);
      alert("Erreur création transaction");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow rounded-xl p-6 space-y-4"
    >
      <div>
        <label className="block font-semibold">Pays d’envoi</label>
        <select
          name="country_from"
          value={form.country_from}
          onChange={handleChange}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">Sélectionner</option>
          <option value="Russie">Russie</option>
          <option value="Côte d’Ivoire">Côte d’Ivoire</option>
          <option value="Cameroun">Cameroun</option>
        </select>
      </div>

      <div>
        <label className="block font-semibold">Pays de réception</label>
        <select
          name="country_to"
          value={form.country_to}
          onChange={handleChange}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">Sélectionner</option>
          <option value="Mali">Mali</option>
          <option value="Congo">Congo</option>
          <option value="Bénin">Bénin</option>
          <option value="Gabon">Gabon</option>
        </select>
      </div>

      <div>
        <label className="block font-semibold">Montant</label>
        <input
          type="number"
          name="amount"
          value={form.amount}
          onChange={handleChange}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Envoyer
      </button>
    </form>
  );
}
