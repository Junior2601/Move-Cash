import React from "react";
import { Link, Outlet } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* HEADER */}
      <header className="bg-white shadow">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-blue-600">
            MOVECASH
          </Link>

          <div className="space-x-6">
            <Link
              to="/#transaction"
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              Transaction
            </Link>
            <Link
              to="/#suivi"
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              Suivi
            </Link>
            <Link
              to="/#service-client"
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              Service Client
            </Link>
            <Link
              to="/#calculatrice"
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              Calculatrice
            </Link>
          </div>
        </nav>
      </header>

      {/* CONTENU */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white text-center py-6">
        <p>© {new Date().getFullYear()} Transfert Russie ↔ Afrique. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
