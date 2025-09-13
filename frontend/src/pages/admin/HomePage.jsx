// src/pages/HomePage.jsx
import React from "react";
import TransactionForm from "../components/public/TransactionForm";
import TrackingForm from "../components/public/TrackingForm";
import ServiceClient from "../components/public/ServiceClient";
import ConversionCalculator from "../components/public/ConversionCalculator";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Section Hero */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-500 text-white py-20 text-center">
        <h1 className="text-4xl font-bold mb-4">
          Transférez de l’argent Russie ↔ Afrique
        </h1>
        <p className="text-lg">
          Rapide, sécurisé et sans création de compte
        </p>
      </header>

      {/* Sections principales */}
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {/* Transaction */}
        <section id="transaction">
          <h2 className="text-2xl font-bold mb-6">💸 Initier une Transaction</h2>
          <TransactionForm />
        </section>

        {/* Suivi */}
        <section id="suivi">
          <h2 className="text-2xl font-bold mb-6">🔍 Suivre une Transaction</h2>
          <TrackingForm />
        </section>

        {/* Service Client */}
        <section id="service-client">
          <h2 className="text-2xl font-bold mb-6">📞 Service Client</h2>
          <ServiceClient />
        </section>

        {/* Calculatrice */}
        <section id="calculatrice">
          <h2 className="text-2xl font-bold mb-6">🧮 Calculatrice de Conversion</h2>
          <ConversionCalculator />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white text-center py-6 mt-12">
        <p>© {new Date().getFullYear()} Transfert Russie ↔ Afrique</p>
      </footer>
    </div>
  );
}
