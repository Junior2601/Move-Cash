import React from "react";
import { Link, Outlet } from "react-router-dom";
import logo from "../assets/movecashlog.png";

export default function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* HEADER FIXE */}
      <header className="bg-white shadow fixed top-0 left-0 right-0 z-50">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-center items-center">
          <Link to="/" className="flex items-center">
            <img 
              src={logo}
              alt="MoveCash Logo" 
              className="h-12 w-auto"
            />
          </Link>
        </nav>
      </header>

      {/* CONTENU AVEC PADDING POUR COMPENSER LE HEADER FIXE */}
      <main className="flex-1 pt-20"> {/* pt-20 pour compenser la hauteur du header fixe */}
        <Outlet />
      </main>

      {/* FOOTER NORMAL (non fixe) */}
      <footer className="bg-gray-900 text-white text-center py-6">
        <p>© {new Date().getFullYear()} Move Cash. Tous droits réservés.</p>
      </footer>
    </div>
  );
}