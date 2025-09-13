import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Users, Globe, Percent, Wallet } from 'lucide-react';

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg p-4">
        <h2 className="text-lg font-bold mb-6">Admin Dashboard</h2>
        <nav className="space-y-2">
          <NavLink
            to="/admin/agents"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg ${
                isActive ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'
              }`
            }
          >
            <Users className="w-4 h-4" /> Agents
          </NavLink>

          <NavLink
            to="/admin/countries"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg ${
                isActive ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'
              }`
            }
          >
            <Globe className="w-4 h-4" /> Pays
          </NavLink>

          <NavLink
            to="/admin/rates"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg ${
                isActive ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'
              }`
            }
          >
            <Percent className="w-4 h-4" /> Taux
          </NavLink>

          <NavLink
            to="/admin/balances"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg ${
                isActive ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'
              }`
            }
          >
            <Wallet className="w-4 h-4" /> Balances
          </NavLink>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}