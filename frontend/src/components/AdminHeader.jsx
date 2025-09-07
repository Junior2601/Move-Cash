import { NavLink } from "react-router-dom";

export default function AdminHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white shadow">
      <div className="flex items-center gap-2">
        <span className="text-blue-600 font-bold text-lg">📦 Move Cash</span>
        <span className="text-sm text-gray-500">Russie — Afrique</span>
      </div>

      <nav className="flex items-center gap-6">
        <NavLink to="/admin/dashboard" className="text-gray-700 hover:text-blue-600">
          Dashboard
        </NavLink>
        <NavLink to="/admin/agents" className="text-gray-700 hover:text-blue-600">
          Agents
        </NavLink>
        <NavLink to="/admin/pays" className="text-gray-700 hover:text-blue-600">
          Pays
        </NavLink>
        <NavLink to="/admin/taux" className="text-gray-700 hover:text-blue-600">
          Taux
        </NavLink>
      </nav>

      <div className="flex items-center gap-3">
        <span className="text-sm">Bonjour, <b>Administrateur</b></span>
        <span className="px-2 py-1 text-xs bg-gray-100 border rounded">Admin</span>
      </div>
    </header>
  );
}
