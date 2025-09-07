import React from 'react';

export default function StatsCard({ title, value, loading }) {
  return (
    <div className="p-4 bg-white rounded-2xl shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-3 text-2xl font-semibold">{loading ? '...' : value}</div>
    </div>
  );
}