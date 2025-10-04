import React, { useEffect, useState } from "react";
import { CreditCard, Menu, X } from 'lucide-react';

const sections = [
  { id: "transaction", label: "Transaction" },
  { id: "suivi", label: "Suivi" },
  { id: "service-client", label: "Service Client" },
  { id: "calculatrice", label: "Calculatrice" }
];

export default function Header() {
  const [activeSection, setActiveSection] = useState("transaction");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const observers = [];

    sections.forEach(section => {
      const el = document.getElementById(section.id);
      if (el) {
        const observer = new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                setActiveSection(section.id);
              }
            });
          },
          { threshold: 0.5 }
        );
        observer.observe(el);
        observers.push(observer);
      }
    });

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, []);

  const handleScroll = (e, id) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const targetElement = document.getElementById(id);
    if (targetElement) {
      targetElement.scrollIntoView({ 
        behavior: "smooth",
        block: "start"
      });
    }
  };

  return (
    <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-2 rounded-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Transfert</h1>
              <p className="text-xs text-gray-500">Russie ⟷ Afrique</p>
            </div>
          </div>

          {/* Desktop Navigation - caché sur mobile */}
          <nav className="hidden md:flex space-x-4 lg:space-x-8">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={(e) => handleScroll(e, section.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                <span>{section.label}</span>
              </button>
            ))}
          </nav>

          {/* Bouton Menu Mobile - visible uniquement sur mobile */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              aria-label="Menu mobile"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation Mobile - s'affiche quand le menu est ouvert */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="flex flex-col space-y-1 py-3">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={(e) => handleScroll(e, section.id)}
                  className={`flex items-center space-x-3 px-4 py-3 text-left text-base font-medium transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{section.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}