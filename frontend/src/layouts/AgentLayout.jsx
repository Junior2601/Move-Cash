// src/layouts/AgentLayout.jsx
import React from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  RefreshCw,
  Wallet,
  History,
  LogOut,
} from "lucide-react";

export default function AgentLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("agentToken");
    localStorage.removeItem("agentInfo");
    navigate("/agent/login");
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-blue-600">Espace Agent</h2>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            to="/agent/dashboard"
            className="flex items-center p-2 rounded-lg hover:bg-gray-100"
          >
            <LayoutDashboard className="w-5 h-5 mr-2" /> Tableau de bord
          </Link>

          <Link
            to="/agent/transactions"
            className="flex items-center p-2 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw className="w-5 h-5 mr-2" /> Transactions
          </Link>

          <Link
            to="/agent/balances"
            className="flex items-center p-2 rounded-lg hover:bg-gray-100"
          >
            <Wallet className="w-5 h-5 mr-2" /> Mes fonds
          </Link>

          <Link
            to="/agent/history"
            className="flex items-center p-2 rounded-lg hover:bg-gray-100"
          >
            <History className="w-5 h-5 mr-2" /> Historique
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center p-4 border-t text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5 mr-2" /> Déconnexion
        </button>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
