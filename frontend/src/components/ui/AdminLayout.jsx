import React from 'react';
import { LogOut } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { Link, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-white border-r p-4">
        <h2 className="text-xl font-semibold mb-6">Admin Panel</h2>
        <nav className="flex flex-col gap-2">
          <Link to="/admin/dashboard" className="py-2 px-3 rounded hover:bg-slate-100">Dashboard</Link>
          <Link to="/admin/agents" className="py-2 px-3 rounded hover:bg-slate-100">Agents</Link>
          <Link to="/admin/countries" className="py-2 px-3 rounded hover:bg-slate-100">Pays</Link>
          <Link to="/admin/rates" className="py-2 px-3 rounded hover:bg-slate-100">Taux</Link>
          <Link to="/admin/transactions" className="py-2 px-3 rounded hover:bg-slate-100">Transactions</Link>
        </nav>

        <div className="mt-8">
          <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded bg-red-50 text-red-700">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}