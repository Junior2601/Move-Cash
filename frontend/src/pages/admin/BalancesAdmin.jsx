import React, { useEffect, useState } from 'react';
import api from '../../api/api';

export default function BalancesAdmin() {
  const [agents, setAgents] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgentsBalances() {
      try {
        const res = await api.get('/agent');
        const agentsData = res.data;
        setAgents(agentsData);

        const balancesMap = {};
        for (let a of agentsData) {
          const b = await api.get(`/balance/agent/${a.id}`);
          balancesMap[a.id] = b.data;
        }
        setBalances(balancesMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAgentsBalances();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Balances des agents</h1>
      {loading ? (
        <div>Chargement...</div>
      ) : (
        <div className="space-y-6">
          {agents.map(a => (
            <div key={a.id} className="bg-white rounded-xl shadow p-4">
              <h2 className="font-medium mb-2">{a.name} ({a.email})</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th>Devise</th>
                    <th>Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {balances[a.id]?.map(b => (
                    <tr key={b.currency_id} className="border-t">
                      <td>{b.currency_code}</td>
                      <td>{b.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}