import React, { useState } from "react";

export default function TrackingForm() {
  const [trackingCode, setTrackingCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Recherche transaction avec code: ${trackingCode}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Code de suivi
        </label>
        <input
          type="text"
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        Suivre
      </button>
    </form>
  );
}
