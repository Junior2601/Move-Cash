import { TrendingUp } from "lucide-react";

export default function StatCard({ title, value, change, icon, color }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-gray-500">{title}</h3>
        <span className={`text-${color}-500`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <div className="flex items-center text-sm text-green-600">
        <TrendingUp size={14} className="mr-1" />
        {change} vs mois dernier
      </div>
    </div>
  );
}
