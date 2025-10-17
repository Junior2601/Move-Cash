// src/layouts/AgentLayout.jsx
import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  RefreshCw,
  MessageSquareShare,
  History,
  LogOut,
  ChevronRight,
  User,
  Menu,
  X,
} from "lucide-react";

export default function AgentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("agentToken");
    localStorage.removeItem("agentInfo");
    navigate("/agent/login");
  };

  const menuItems = [
    { path: "/agent/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { path: "/agent/transactions", label: "Transactions", icon: RefreshCw },
    { path: "/agent/redirected-transactions", label: "Mes redirections", icon: MessageSquareShare },
    { path: "/agent/history", label: "Historique", icon: History },
  ];

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  // Récupérer les infos de l'agent depuis le localStorage
  const agentInfo = JSON.parse(localStorage.getItem("agentInfo") || "{}");

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50/50 to-indigo-100/30">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar amélioré - Responsive */}
      <aside className={`
        fixed lg:static w-72 bg-white/95 backdrop-blur-xl shadow-xl border-r border-slate-200/60 flex flex-col z-50 h-screen lg:h-auto
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0
      `}>
        {/* Header Sidebar */}
        <div className="p-6 border-b border-slate-200/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Espace Agent
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">Bienvenue, {agentInfo.name || "Agent"}</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          
          {/* Badge statut */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-xs font-medium text-emerald-700">Connecté</span>
          </div>
        </div>

        {/* Navigation améliorée */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveLink(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 group relative
                  ${isActive 
                    ? "bg-blue-50 text-blue-700 border border-blue-200/60 shadow-sm" 
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
                  }
                `}
              >
                <div className={`
                  p-2 rounded-lg transition-colors duration-200
                  ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'}
                `}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm flex-1">{item.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                )}
                <ChevronRight className={`
                  w-4 h-4 transition-transform duration-200
                  ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}
                  group-hover:translate-x-0.5
                `} />
              </Link>
            );
          })}
        </nav>

        {/* Section déconnexion améliorée */}
        <div className="p-4 border-t border-slate-200/60">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 text-red-700 hover:text-red-800 border border-red-200/60 hover:border-red-300/60 transition-all duration-200 group shadow-sm hover:shadow-md"
          >
            <div className="p-2 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors duration-200">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm flex-1 text-left">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Contenu principal amélioré */}
      <main className="flex-1 p-4 lg:p-8 min-h-screen overflow-x-hidden">
        {/* Header mobile */}
        <div className="lg:hidden mb-6">
          <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm p-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-3 rounded-xl bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-slate-50"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">{agentInfo.name || "Agent"}</p>
                <p className="text-xs text-slate-500">Espace Agent</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Container principal avec design moderne */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-4rem)]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}