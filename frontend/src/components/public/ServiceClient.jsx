import React from "react";

export default function ServiceClient() {
  // Exemple de données mockées
  const agents = [
    { id: 1, country: "Côte d'Ivoire", phone: "+225 01 23 45 67", available: true },
    { id: 2, country: "Cameroun", phone: "+237 6 78 90 12", available: false },
    { id: 3, country: "Mali", phone: "+223 7 65 43 21", available: true },
    { id: 4, country: "Sénégal", phone: "+221 7 08 15 23", available: true },
  ];

  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-100">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Service Client</h2>
        <p className="text-gray-600 mt-1">Contactez nos agents selon votre pays</p>
      </div>
      
      <div className="space-y-4">
        {agents.map((agent) => (
          <div 
            key={agent.id} 
            className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  agent.available ? "bg-green-500" : "bg-red-500"
                }`}></div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-bold text-gray-800 text-lg">{agent.country}</p>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      Agent #{agent.id}
                    </span>
                  </div>
                  <div className="flex items-center mt-1 space-x-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                    </svg>
                    <p className="text-gray-600 font-medium">{agent.phone}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-1 ${
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
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
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
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Disponible</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Occupé</span>
            </div>
          </div>
          <span className="text-gray-500">Horaires: 8h-18h (GMT)</span>
        </div>
      </div>
    </div>
  );
}