import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function PaymentMethodsList() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ id: null, name: "", country_id: "", is_active: true });
  const [isEditing, setIsEditing] = useState(false);

  const token = localStorage.getItem("adminToken");

  // Charger tous les moyens de paiement
  const fetchMethods = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/payment_method", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMethods(data);
      setLoading(false);
    } catch (err) {
      setError("Erreur lors du chargement des moyens de paiement");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  // Ajouter ou modifier un moyen
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = form.id
        ? `http://localhost:5000/api/payment_method/${form.id}`
        : "http://localhost:5000/api/payment_method";

      const method = form.id ? "PUT" : "POST";

      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      setForm({ id: null, name: "", country_id: "", is_active: true });
      setIsEditing(false);
      fetchMethods();
    } catch (err) {
      setError("Erreur lors de l'enregistrement");
    }
  };

  // Supprimer un moyen
  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce moyen de paiement ?")) return;
    await fetch(`http://localhost:5000/api/payment_method/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchMethods();
  };

  // Préparer la modification
  const handleEdit = (m) => {
    setForm(m);
    setIsEditing(true);
  };

  if (loading) return <p>Chargement...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">💳 Moyens de Paiement</h2>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="mb-6 bg-gray-100 p-4 rounded-md">
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Nom du moyen (ex: Mobile Money, Bank Transfer)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <input
            type="text"
            placeholder="ID du pays"
            value={form.country_id}
            onChange={(e) => setForm({ ...form, country_id: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <select
            value={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}
            className="border p-2 rounded"
          >
            <option value="true">Actif</option>
            <option value="false">Inactif</option>
          </select>
        </div>
        <button
          type="submit"
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
        >
          {isEditing ? <Edit size={18} /> : <Plus size={18} />}
          {isEditing ? "Modifier" : "Ajouter"}
        </button>
      </form>

      {/* Liste */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-4 py-2">ID</th>
            <th className="border px-4 py-2">Nom</th>
            <th className="border px-4 py-2">Pays</th>
            <th className="border px-4 py-2">Statut</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {methods.map((m) => (
            <tr key={m.id}>
              <td className="border px-4 py-2">{m.id}</td>
              <td className="border px-4 py-2">{m.name}</td>
              <td className="border px-4 py-2">{m.country_id}</td>
              <td className="border px-4 py-2">
                <span
                  className={`px-2 py-1 text-sm rounded ${
                    m.is_active ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                  }`}
                >
                  {m.is_active ? "Actif" : "Inactif"}
                </span>
              </td>
              <td className="border px-4 py-2 flex gap-2">
                <button
                  onClick={() => handleEdit(m)}
                  className="text-blue-600 flex items-center gap-1"
                >
                  <Edit size={16} /> Modifier
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-red-600 flex items-center gap-1"
                >
                  <Trash2 size={16} /> Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
