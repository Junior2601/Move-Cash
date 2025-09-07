import React from "react";
import { Send, Search, HeadphonesIcon, Calculator } from "lucide-react";

const sections = [
  {
    id: "transfer",
    title: "Nouvelle Transaction",
    description: "Transférer de l'argent rapidement",
    icon: Send,
    color: "blue",
  },
  {
    id: "track",
    title: "Suivi Transaction",
    description: "Suivre votre transfert",
    icon: Search,
    color: "green",
  },
  {
    id: "support",
    title: "Service Client",
    description: "Contacts et assistance",
    icon: HeadphonesIcon,
    color: "purple",
  },
  {
    id: "calculator",
    title: "Calculatrice",
    description: "Convertir les devises",
    icon: Calculator,
    color: "orange",
  },
];

export default function ServicesTabs({ active, onChange }) {
  return (
    <div className="flex flex-wrap justify-center gap-4 mb-8">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onChange(section.id)}
          className={`flex items-center space-x-3 px-6 py-3 rounded-full font-medium transition-all duration-300 ${
            active === section.id
              ? `bg-${section.color}-600 text-white shadow-lg transform scale-105`
              : "bg-white text-gray-600 hover:text-gray-900 hover:shadow-md border border-gray-200"
          }`}
        >
          <section.icon className="h-5 w-5" />
          <span>{section.title}</span>
        </button>
      ))}
    </div>
  );
}
