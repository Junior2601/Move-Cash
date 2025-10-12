import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import api from "../../api/api";

export default function AgentLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/agent/login", form);
      
      console.log("🔍 Réponse complète de l'API:", res);
      console.log("🔍 Données de la réponse:", res.data);
      
      // CORRECTION : Utiliser res.data directement (pas res.data.data)
      const { token, agent } = res.data;

      // Vérifier si le token existe
      if (!token) {
        console.error("❌ Token manquant dans la réponse");
        setError("Erreur d'authentification: token manquant");
        return;
      }

      localStorage.setItem("agent_token", token);
      localStorage.setItem("agent_info", JSON.stringify(agent));

      console.log("✅ Connexion réussie, token stocké:", token);
      console.log("🔍 Agent info:", agent);
      console.log("🔍 Redirection vers /agent/dashboard");
      
      navigate("/agent/dashboard");
    } catch (err) {
      console.error("❌ Erreur login agent", err);
      setError(
        err.response?.data?.message || "Échec de connexion. Vérifiez vos identifiants."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8">
        <div className="flex items-center justify-center mb-6">
          <LogIn className="w-8 h-8 text-blue-600 mr-2" />
          <h1 className="text-xl font-bold text-gray-800">Connexion Agent</h1>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-blue-200"
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Mot de passe</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring focus:ring-blue-200"
              placeholder="Votre mot de passe"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}