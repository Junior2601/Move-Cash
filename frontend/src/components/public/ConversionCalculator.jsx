import React, { useState, useEffect } from "react";
import { Calculator, ArrowUpDown, TrendingUp } from 'lucide-react';

export default function ConversionCalculator() {
  const [fromCurrency, setFromCurrency] = useState('Russie');
  const [toCurrency, setToCurrency] = useState('Côte d\'Ivoire');
  const [amount, setAmount] = useState(1000);
  const [result, setResult] = useState({ convertedAmount: 0, rate: 600 });

  // Données simulées pour les pays
  const countries = [
    { id: 'Russie', name: 'Russie', currency: 'RUB', currencySymbol: '₽' },
    { id: 'Côte d\'Ivoire', name: 'Côte d\'Ivoire', currency: 'XOF', currencySymbol: 'CFA' },
    { id: 'Cameroun', name: 'Cameroun', currency: 'XAF', currencySymbol: 'FCFA' },
    { id: 'Mali', name: 'Mali', currency: 'XOF', currencySymbol: 'CFA' },
    { id: 'Congo', name: 'Congo', currency: 'XAF', currencySymbol: 'FCFA' },
    { id: 'Bénin', name: 'Bénin', currency: 'XOF', currencySymbol: 'CFA' },
    { id: 'Gabon', name: 'Gabon', currency: 'XAF', currencySymbol: 'FCFA' }
  ];

  const getCountryByCode = (code) => {
    return countries.find(country => country.id === code);
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const calculateExchange = (amount, fromCurrency, toCurrency) => {
    // Taux de change simulés
    const rates = {
      'RUB-XOF': 600,
      'RUB-XAF': 600,
      'XOF-RUB': 0.00167,
      'XAF-RUB': 0.00167
    };
    
    const rateKey = `${fromCurrency}-${toCurrency}`;
    const rate = rates[rateKey] || 1;
    const convertedAmount = amount * rate;
    
    return { convertedAmount, rate };
  };

  useEffect(() => {
    if (amount > 0 && fromCurrency && toCurrency) {
      const fromCountry = getCountryByCode(fromCurrency);
      const toCountry = getCountryByCode(toCurrency);
      
      if (fromCountry && toCountry) {
        const calculationResult = calculateExchange(
          amount,
          fromCountry.currency,
          toCountry.currency
        );
        setResult(calculationResult);
      }
    }
  }, [amount, fromCurrency, toCurrency]);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const fromCountry = getCountryByCode(fromCurrency);
  const toCountry = getCountryByCode(toCurrency);

  const commonAmounts = [500, 1000, 5000, 10000, 25000, 50000];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h4 className="text-xl font-semibold text-gray-900 mb-2 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-blue-600 mr-2" />
          Calculatrice de Conversion
        </h4>
        <p className="text-gray-600">
          Calculez le montant exact que recevra votre bénéficiaire
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* From Currency */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Devise d'envoi
              </label>
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {countries.map(country => (
                  <option key={country.id} value={country.id}>
                    {country.name} ({country.currencySymbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant à envoyer
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="0"
                  min="1"
                  className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute right-3 top-3 text-gray-500">
                  {fromCountry?.currencySymbol}
                </span>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {commonAmounts.map(quickAmount => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  {quickAmount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Swap Button */}
          <div className="md:flex md:items-center md:justify-center">
            <button
              onClick={swapCurrencies}
              className="w-full md:w-auto p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowUpDown className="h-5 w-5 mx-auto" />
            </button>
          </div>

          {/* To Currency */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Devise de réception
              </label>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {countries.filter(c => c.id !== fromCurrency).map(country => (
                  <option key={country.id} value={country.id}>
                    {country.name} ({country.currencySymbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant reçu
              </label>
              <div className="bg-green-50 px-4 py-3 rounded-lg border border-green-200">
                <span className="text-2xl font-bold text-green-600">
                  {toCountry ? formatCurrency(result.convertedAmount, toCountry.currency) : '0'}
                </span>
              </div>
            </div>

            {/* Exchange Rate Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Taux de change</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                1 {fromCountry?.currencySymbol} = {result.rate} {toCountry?.currencySymbol}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Taux mis à jour en temps réel
              </p>
            </div>
          </div>
        </div>

        {/* Rate Comparison */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h5 className="font-semibold text-blue-900 mb-3">Avantages TransferBridge</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="font-medium text-blue-800">Taux Compétitifs</p>
              <p className="text-blue-600">Meilleurs taux du marché</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-blue-800">Frais Transparents</p>
              <p className="text-blue-600">Commission de 0,75%</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-blue-800">Transfert Rapide</p>
              <p className="text-blue-600">En quelques minutes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}