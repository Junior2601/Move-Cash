import React, { useEffect, useState } from 'react';
import api from '../../api/api';

export default function TransactionsTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTx() {
      setLoading(true);
      try {
        const res = await api.get('/transactions/all-transactions');
        
        // CORRECTION ICI : Accédez à res.data.data au lieu de res.data
        const transactionsData = res.data.data || [];
        setRows(Array.isArray(transactionsData) ? transactionsData : []);
        
      } catch (err) {
        console.error('Erreur fetch:', err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTx();
  }, []);

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      {loading ? (
        <div>Chargement...</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600">
            <tr>
              <th className="py-2">ID</th>
              <th>Pays envoi</th>
              <th>Pays réception</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2">{r.id}</td>
                <td>{r.from_country_name || r.country_from}</td>
                <td>{r.to_country_name || r.country_to}</td>
                <td>{r.amount_send} {r.currency_from}</td>
                <td>{r.status}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}