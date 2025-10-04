import React, { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { Link, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Overlay pour mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static w-64 bg-white border-r p-4 z-50 h-screen lg:h-auto
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0
      `}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Admin Panel</h2>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex flex-col gap-2">
          <Link 
            to="/admin/dashboard" 
            className="py-2 px-3 rounded hover:bg-slate-100 text-sm lg:text-base"
            onClick={() => setSidebarOpen(false)}
          >
            Dashboard
          </Link>
          <Link 
            to="/admin/agents" 
            className="py-2 px-3 rounded hover:bg-slate-100 text-sm lg:text-base"
            onClick={() => setSidebarOpen(false)}
          >
            Agents
          </Link>
          <Link 
            to="/admin/countries" 
            className="py-2 px-3 rounded hover:bg-slate-100 text-sm lg:text-base"
            onClick={() => setSidebarOpen(false)}
          >
            Pays
          </Link>
          <Link 
            to="/admin/rates" 
            className="py-2 px-3 rounded hover:bg-slate-100 text-sm lg:text-base"
            onClick={() => setSidebarOpen(false)}
          >
            Taux
          </Link>
          <Link 
            to="/admin/balances" 
            className="py-2 px-3 rounded hover:bg-slate-100 text-sm lg:text-base"
            onClick={() => setSidebarOpen(false)}
          >
            Balances
          </Link>
          <Link 
            to="/admin/transactions" 
            className="py-2 px-3 rounded hover:bg-slate-100 text-sm lg:text-base"
            onClick={() => setSidebarOpen(false)}
          >
            Transactions
          </Link>
          <Link 
            to="/admin/historiques" 
            className="py-2 px-3 rounded hover:bg-slate-100 text-sm lg:text-base"
            onClick={() => setSidebarOpen(false)}
          >
            Historiques
          </Link>
        </nav>

        <div className="mt-8">
          <button 
            onClick={logout} 
            className="flex items-center gap-2 px-3 py-2 rounded bg-red-50 text-red-700 text-sm lg:text-base w-full"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 lg:p-6 min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden mb-4">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md bg-white shadow-sm"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        
        <Outlet />
      </main>
    </div>
  );
}