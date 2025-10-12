import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  Globe, 
  Percent, 
  Wallet, 
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  CreditCard,
  Phone,
  RefreshCw,
  FileText
} from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_info");
    navigate("/admin/login");
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      current: location.pathname === "/admin/dashboard",
    },
    {
      name: "Agents",
      href: "/admin/agents",
      icon: Users,
      current: location.pathname === "/admin/agents",
    },
    {
      name: "Pays",
      href: "/admin/countries",
      icon: Globe,
      current: location.pathname === "/admin/countries",
    },
    {
      name: "Taux",
      href: "/admin/rates",
      icon: Percent,
      current: location.pathname === "/admin/rates",
    },
    {
      name: "Balances",
      href: "/admin/balances",
      icon: Wallet,
      current: location.pathname === "/admin/balances",
    },
    {
      name: "Méthodes Paiement",
      href: "/admin/payements",
      icon: CreditCard,
      current: location.pathname === "/admin/payements",
    },
    {
      name: "Numéros Autorisés",
      href: "/admin/numbers",
      icon: Phone,
      current: location.pathname === "/admin/numbers",
    },
    {
      name: "Transactions",
      href: "/admin/transactions",
      icon: RefreshCw,
      current: location.pathname === "/admin/transactions",
    },
    {
      name: "Historique",
      href: "/admin/historiques",
      icon: FileText,
      current: location.pathname === "/admin/historiques",
    },
  ];

  const adminInfo = JSON.parse(localStorage.getItem("admin_info") || "{}");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar pour desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-xs text-gray-500">Administration</p>
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
                      <NavLink
                        to={item.href}
                        className={({ isActive }) => `
                          group flex gap-x-3 rounded-lg p-3 text-sm leading-6 font-semibold
                          transition-all duration-200
                          ${
                            isActive
                              ? "bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600"
                              : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                          }
                        `}
                      >
                        <item.icon
                          className={`h-6 w-6 shrink-0 ${
                            item.current ? "text-indigo-600" : "text-gray-400 group-hover:text-indigo-600"
                          }`}
                        />
                        {item.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
              
              {/* Informations admin */}
              <li className="mt-auto">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {adminInfo.name || "Administrateur"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {adminInfo.email || "admin@system.com"}
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
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                  <p className="text-xs text-gray-500">Administration</p>
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
                        <NavLink
                          to={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) => `
                            group flex gap-x-3 rounded-lg p-3 text-sm leading-6 font-semibold
                            transition-all duration-200
                            ${
                              isActive
                                ? "bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600"
                                : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                            }
                          `}
                        >
                          <item.icon
                            className={`h-6 w-6 shrink-0 ${
                              item.current ? "text-indigo-600" : "text-gray-400 group-hover:text-indigo-600"
                            }`}
                          />
                          {item.name}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </li>
                
                <li className="mt-auto">
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {adminInfo.name || "Administrateur"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {adminInfo.email || "admin@system.com"}
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
                {navigation.find(item => item.current)?.name || "Dashboard"}
              </h1>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {adminInfo.name || "Administrateur"}
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