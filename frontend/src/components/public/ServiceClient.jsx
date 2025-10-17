import React from "react";

export default function ServiceClient() {
  // Exemple de données mockées
  const agents = [
    { id: 1, country: "Ismaël Brevie", phone: "+7 927 353-16-12", available: true },
    { id: 2, country: "Marie Colombe", phone: "+225 07 87 044 546", available: true },
    { id: 3, country: "Israel", phone: "+7 (980) 319-71-62", available: true },
    // { id: 4, country: "Sénégal", phone: "+221 7 08 15 23", available: true },
  ];

  return (
    <div className="bg-white shadow-lg rounded-2xl p-4 sm:p-6 border border-gray-100 mx-2 sm:mx-0">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Service Client</h2>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Contactez nos agents selon votre pays</p>
      </div>
      
      <div className="space-y-4">
        {agents.map((agent) => (
          <div 
            key={agent.id} 
            className="p-3 sm:p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                <div className={`w-3 h-3 rounded-full mt-1.5 sm:mt-0 flex-shrink-0 ${
                  agent.available ? "bg-green-500" : "bg-red-500"
                }`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-1 sm:gap-0">
                    <p className="font-bold text-gray-800 text-base sm:text-lg truncate">{agent.country}</p>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full self-start sm:self-auto">
                      Agent #{agent.id}
                    </span>
                  </div>
                  <div className="flex items-center mt-1 space-x-2">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                    </svg>
                    <p className="text-gray-600 font-medium text-sm sm:text-base truncate">{agent.phone}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col xs:flex-row sm:flex-col lg:flex-row items-stretch xs:items-center sm:items-stretch lg:items-center gap-2 sm:gap-3">
                <span
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center space-x-1 ${
                    agent.available 
                      ? "bg-green-50 text-green-700 border border-green-200" 
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    agent.available ? "bg-green-500" : "bg-red-500"
                  }`}></span>
                  <span>{agent.available ? "Disponible" : "Occupé"}</span>
                </span>
                
                <button 
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                    agent.available 
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" 
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  disabled={!agent.available}
                >
                  Appeler
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-gray-600">
          <div className="flex flex-col xs:flex-row items-start xs:items-center space-y-2 xs:space-y-0 xs:space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs sm:text-sm">Disponible</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs sm:text-sm">Occupé</span>
            </div>
          </div>
          <span className="text-xs sm:text-sm text-gray-500 text-right">Horaires: 8h-18h (GMT)</span>
        </div>
      </div>
    </div>
  );
}