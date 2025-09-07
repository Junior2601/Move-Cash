import React, { useState } from "react";

export default function CurrencyCalculator() {
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(null);

  const handleConvert = (e) => {
    e.preventDefault();
    // Exemple : 1 RUB = 600 XOF
    setResult(Number(amount) * 600);
  };

  return (
    <form onSubmit={handleConvert} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Montant (RUB)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
      >
        Convertir
      </button>

      {result && (
        <p className="text-lg font-semibold text-green-600">
          Résultat : {result.toLocaleString()} XOF
        </p>
      )}
    </form>
  );
}
