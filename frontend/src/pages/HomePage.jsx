import React, { useState, useEffect } from 'react';
import TransactionForm from '../components/public/TransactionForm';
import TrackingForm from '../components/public/TrackingForm';
import ServiceClient from '../components/public/ServiceClient';
import ConversionCalculator from '../components/public/ConversionCalculator';
import { Send, Search, HeadphonesIcon, Calculator } from 'lucide-react';

export default function HomePage() {
  const [activeSection, setActiveSection] = useState('transaction');
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animation de la barre de progression
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 40); // Augmente de 2% toutes les 40ms = 2 secondes pour 100%

    // Timer pour masquer le loader
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, []);

  const sections = [
    {
      id: 'transaction',
      title: 'Nouvelle Transaction',
      description: 'Transférer de l\'argent rapidement',
      icon: Send,
      color: 'blue'
    },
    {
      id: 'suivi',
      title: 'Suivi Transaction',
      description: 'Suivre votre transfert',
      icon: Search,
      color: 'green'
    },
    {
      id: 'service',
      title: 'Service Client',
      description: 'Contacts et assistance',
      icon: HeadphonesIcon,
      color: 'purple'
    },
    {
      id: 'calculatrice',
      title: 'Calculatrice',
      description: 'Convertir les devises',
      icon: Calculator,
      color: 'orange'
    }
  ];

  const getColorClasses = (color, isActive) => {
    const colorMap = {
      blue: {
        active: 'bg-blue-600 text-white',
        inactive: 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
      },
      green: {
        active: 'bg-green-600 text-white',
        inactive: 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
      },
      purple: {
        active: 'bg-purple-600 text-white',
        inactive: 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
      },
      orange: {
        active: 'bg-orange-600 text-white',
        inactive: 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
      }
    };
    
    return isActive 
      ? `${colorMap[color].active} shadow-lg transform scale-105` 
      : `${colorMap[color].inactive} hover:shadow-md`;
  };

  // Loader esthétique
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center">
        <div className="text-center">
          {/* Logo animé */}
          <div className="relative mb-8">
            <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-2xl animate-pulse">
              <Send className="h-10 w-10 text-blue-600" />
            </div>
            <div className="absolute inset-0 rounded-2xl border-2 border-white border-opacity-30 animate-ping"></div>
          </div>
          
          {/* Texte MoveCash */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Move<span className="text-yellow-300">Cash</span>
            </h1>
            
            {/* Barre de progression animée */}
            <div className="w-80 max-w-full mx-auto">
              <div className="flex justify-between text-sm text-blue-100 mb-2">
                <span>Chargement...</span>
                <span>{progress}%</span>
              </div>
              
              {/* Conteneur de la barre */}
              <div className="w-full h-3 bg-white bg-opacity-20 rounded-full overflow-hidden shadow-inner">
                {/* Barre de progression animée */}
                <div 
                  className="h-full bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-full transition-all duration-300 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  {/* Effet de brillance */}
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white via-10% to-transparent opacity-30 animate-shine"></div>
                </div>
              </div>
            </div>

            {/* Message de statut */}
            <div className="text-blue-100 text-sm space-y-1">
              <p className="animate-pulse">Initialisation des services...</p>
              <p className="text-xs text-blue-200 opacity-80">
                Transfert Russie ↔ Afrique
              </p>
            </div>
          </div>
        </div>

        {/* Styles pour l'animation de brillance */}
        <style jsx>{`
          @keyframes shine {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          .animate-shine {
            animation: shine 1.5s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Section Hero */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-500 text-white py-20 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Transférez de l'argent Russie ↔ Afrique
          </h1>
          <p className="text-lg md:text-xl text-blue-100">
            Rapide, sécurisé et sans création de compte
          </p>
        </div>
      </header>

      {/* Services Section */}
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Nos Services
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Tout ce dont vous avez besoin pour vos transferts d'argent
            </p>
          </div>

          {/* Service Tabs */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-3 px-6 py-3 rounded-full font-medium transition-all duration-300 ${getColorClasses(section.color, activeSection === section.id)}`}
              >
                <section.icon className="h-5 w-5" />
                <span>{section.title}</span>
              </button>
            ))}
          </div>

          {/* Service Content */}
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 md:p-8">
                {activeSection === 'transaction' && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <Send className="mr-3 h-6 w-6 text-blue-600" />
                      Initier une Transaction
                    </h3>
                    <TransactionForm />
                  </div>
                )}
                
                {activeSection === 'suivi' && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <Search className="mr-3 h-6 w-6 text-green-600" />
                      Suivre une Transaction
                    </h3>
                    <TrackingForm />
                  </div>
                )}
                
                {activeSection === 'service' && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <HeadphonesIcon className="mr-3 h-6 w-6 text-purple-600" />
                      Service Client
                    </h3>
                    <ServiceClient />
                  </div>
                )}
                
                {activeSection === 'calculatrice' && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <Calculator className="mr-3 h-6 w-6 text-orange-600" />
                      Calculatrice de Conversion
                    </h3>
                    <ConversionCalculator />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer amélioré */}
      <footer className="bg-gray-900">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="xl:grid xl:grid-cols-3 xl:gap-8">
            <div className="space-y-8 xl:col-span-1">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Send className="h-6 w-6 text-white" />
                </div>
                <span className="text-white text-xl font-bold">MoveCash</span>
              </div>
              <p className="text-gray-400 text-base">
                La plateforme de confiance pour vos transferts d'argent entre la Russie et l'Afrique.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-8 xl:mt-0 xl:col-span-2">
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                    Services
                  </h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <a 
                        href="#transaction" 
                        className="text-base text-gray-300 hover:text-white" 
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveSection('transaction');
                        }}
                      >
                        Transfert d'argent
                      </a>
                    </li>
                    <li>
                      <a 
                        href="#suivi" 
                        className="text-base text-gray-300 hover:text-white" 
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveSection('suivi');
                        }}
                      >
                        Suivi transaction
                      </a>
                    </li>
                    <li>
                      <a 
                        href="#service" 
                        className="text-base text-gray-300 hover:text-white" 
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveSection('service');
                        }}
                      >
                        Support client
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="mt-12 md:mt-0">
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                    Sécurité
                  </h3>
                  <ul className="mt-4 space-y-4">
                    <li><a href="#" className="text-base text-gray-300 hover:text-white">Agents agréés</a></li>
                    <li><a href="#" className="text-base text-gray-300 hover:text-white">Transactions sécurisées</a></li>
                    <li><a href="#" className="text-base text-gray-300 hover:text-white">Support 24/7</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-700 pt-8">
            <p className="text-base text-gray-400 xl:text-center">
              © {new Date().getFullYear()} MoveCash. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}