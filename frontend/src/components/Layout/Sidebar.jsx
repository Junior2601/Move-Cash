import React from 'react';
import { Home, Users, DollarSign, FileText, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../../services/auth.service';

export default function Sidebar() {
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };
  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Admin Panel</h2>
        <p className="text-sm text-gray-500">Plateforme Transfert RU ↔ Afrique</p>
      </div>
      <nav className="space-y-2">
        <Link to="/admin/dashboard" className="flex items-center gap-3 p-2 rounded hover:bg-gray-100">
          <Home /> Dashboard
        </Link>
        <Link to="/admin/agents" className="flex items-center gap-3 p-2 rounded hover:bg-gray-100">
          <Users /> Agents
        </Link>
        <Link to="/admin/balances" className="flex items-center gap-3 p-2 rounded hover:bg-gray-100">
          <DollarSign /> Soldes
        </Link>
        <Link to="/admin/transactions" className="flex items-center gap-3 p-2 rounded hover:bg-gray-100">
          <FileText /> Transactions
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 w-full">
          <LogOut /> Déconnexion
        </button>
      </nav>
    </aside>
  );
}
