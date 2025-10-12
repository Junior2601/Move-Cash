// src/layouts/AgentLayout.jsx
import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  RefreshCw,
  Wallet,
  History,
  LogOut,
  Menu,
  X,
  User,
} from "lucide-react";

export default function AgentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("agent_token");
    localStorage.removeItem("agent_info");
    navigate("/agent/login");
  };

  const navigation = [
    {
      name: "Tableau de bord",
      href: "/agent/dashboard",
      icon: LayoutDashboard,
      current: location.pathname === "/agent/dashboard",
    },
    {
      name: "Transactions",
      href: "/agent/transactions",
      icon: RefreshCw,
      current: location.pathname === "/agent/transactions",
    },
    {
      name: "Mes fonds",
      href: "/agent/balances",
      icon: Wallet,
      current: location.pathname === "/agent/balances",
    },
    {
      name: "Historique",
      href: "/agent/history",
      icon: History,
      current: location.pathname === "/agent/history",
    },
  ];

  const agentInfo = JSON.parse(localStorage.getItem("agent_info") || "{}");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar pour desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Espace Agent</h1>
                <p className="text-xs text-gray-500">Tableau de bord</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`
                          group flex gap-x-3 rounded-lg p-3 text-sm leading-6 font-semibold
                          transition-all duration-200
                          ${
                            item.current
                              ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                              : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                          }
                        `}
                      >
                        <item.icon
                          className={`h-6 w-6 shrink-0 ${
                            item.current ? "text-blue-600" : "text-gray-400 group-hover:text-blue-600"
                          }`}
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              
              {/* Informations agent */}
              <li className="mt-auto">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {agentInfo.name || "Agent"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {agentInfo.email || "agent@email.com"}
                      </p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full gap-x-3 rounded-lg p-3 text-sm font-semibold leading-6 text-red-600 hover:bg-red-50 transition-colors duration-200"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  Déconnexion
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile menu */}
      {sidebarOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Espace Agent</h1>
                  <p className="text-xs text-gray-500">Tableau de bord</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`
                            group flex gap-x-3 rounded-lg p-3 text-sm leading-6 font-semibold
                            transition-all duration-200
                            ${
                              item.current
                                ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                                : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                            }
                          `}
                        >
                          <item.icon
                            className={`h-6 w-6 shrink-0 ${
                              item.current ? "text-blue-600" : "text-gray-400 group-hover:text-blue-600"
                            }`}
                          />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
                
                <li className="mt-auto">
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {agentInfo.name || "Agent"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {agentInfo.email || "agent@email.com"}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full gap-x-3 rounded-lg p-3 text-sm font-semibold leading-6 text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    <LogOut className="h-5 w-5 shrink-0" />
                    Déconnexion
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Header mobile */}
      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {navigation.find(item => item.current)?.name || "Tableau de bord"}
              </h1>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {agentInfo.name || "Agent"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}