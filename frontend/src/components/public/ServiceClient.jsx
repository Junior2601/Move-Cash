import React from "react";

export default function ServiceClient() {
  // Exemple de données mockées
  const agents = [
    { id: 1, country: "Côte d’Ivoire", phone: "+225 01 23 45 67", available: true },
    { id: 2, country: "Cameroun", phone: "+237 6 78 90 12", available: false },
    { id: 3, country: "Mali", phone: "+223 7 65 43 21", available: true },
  ];

  return (
    <div className="bg-white shadow rounded-xl p-6">
      <ul className="divide-y">
        {agents.map((agent) => (
          <li key={agent.id} className="py-3 flex justify-between items-center">
            <div>
              <p className="font-bold">{agent.country}</p>
              <p className="text-gray-600">{agent.phone}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                agent.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {agent.available ? "Disponible" : "Occupé"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
