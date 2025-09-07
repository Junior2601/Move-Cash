import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import api from '../../api/api';

export default function AgentsList() {
  const [agents, setAgents] = useState([]);
  useEffect(() => {
    api.get('/agent')
      .then(res => setAgents(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl mb-4">Gestion des agents</h1>
      <div className="bg-white rounded shadow p-4">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th>Nom</th>
              <th>Pays</th>
              <th>Email</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(a => (
              <tr key={a.id} className="border-t">
                <td>{a.name || `${a.first_name} ${a.last_name}`}</td>
                <td>{a.country_name}</td>
                <td>{a.email}</td>
                <td>{a.is_active ? 'Actif' : 'Désactivé'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
