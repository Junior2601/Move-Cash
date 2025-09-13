import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import api from "../../api/api";

export default function Stats() {
  const [transactionsByDay, setTransactionsByDay] = useState([]);
  const [statusStats, setStatusStats] = useState([]);
  const [volumeByCountry, setVolumeByCountry] = useState([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ["#22c55e", "#facc15", "#ef4444"]; // vert, jaune, rouge

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Backend doit renvoyer ces datas dans /transactions/transactions/stats
      const res = await api.get("/transactions/transactions/stats");
      const data = res.data || {};

      // Exemple attendu : { byDay: [...], byStatus: [...], byCountry: [...] }
      setTransactionsByDay(data.byDay || []);
      setStatusStats(data.byStatus || []);
      setVolumeByCountry(data.byCountry || []);
    } catch (err) {
      console.error("Erreur stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <div>Chargement des statistiques...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Statistiques Avancées</h1>

      {/* Transactions par jour */}
      <div className="bg-white p-4 rounded-2xl shadow mb-8">
        <h2 className="text-lg font-semibold mb-4">Transactions par jour</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={transactionsByDay}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#2563eb" name="Transactions" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Répartition des statuts */}
      <div className="bg-white p-4 rounded-2xl shadow mb-8">
        <h2 className="text-lg font-semibold mb-4">Répartition des statuts</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusStats}
              dataKey="value"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {statusStats.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Volume par pays */}
      <div className="bg-white p-4 rounded-2xl shadow mb-8">
        <h2 className="text-lg font-semibold mb-4">Volumes par pays</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={volumeByCountry}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="country" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="volume" fill="#10b981" name="Volume total" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
