import React, { useEffect, useState } from 'react';
import api from '../../api/api';

export default function RatesList() {
  const [rates, setRates] = useState([]);
  const [allRates, setAllRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [countries, setCountries] = useState([]);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const [ratesRes, activeRatesRes, countriesRes] = await Promise.all([
        api.get('/rate'),
        api.get('/rate/active'),
        api.get('/country') // Récupérer la liste des pays
      ]);
      
      setAllRates(ratesRes.data || []);
      setRates(ratesRes.data || []);
      setCountries(countriesRes.data || []);
      setStats({
        total: ratesRes.data?.length || 0,
        active: activeRatesRes.data?.length || 0
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchRates(); 
  }, []);

  // Filtrer les taux en fonction de la recherche par pays
  useEffect(() => {
    if (searchTerm === '') {
      setRates(allRates);
    } else {
      const filteredRates = allRates.filter(rate => {
        const fromCountry = getCurrencyCountry(rate.from_currency);
        const toCountry = getCurrencyCountry(rate.to_currency);
        
        return fromCountry.toLowerCase().includes(searchTerm.toLowerCase()) ||
               toCountry.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setRates(filteredRates);
    }
  }, [searchTerm, allRates]);

  const saveRate = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === "add") {
        await api.post('/rate', modal.rate);
      } else {
        await api.put(`/rate/${modal.rate.id}`, modal.rate);
      }
      setModal(null);
      fetchRates();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteRate = async (id) => {
    if (!window.confirm("Supprimer ce taux ?")) return;
    try {
      await api.delete(`/rate/${id}`);
      fetchRates();
    } catch (err) {
      console.error(err);
    }
  };

  // Grouper les taux par devise source
  const groupedRates = rates.reduce((acc, rate) => {
    if (!acc[rate.from_currency]) {
      acc[rate.from_currency] = [];
    }
    acc[rate.from_currency].push(rate);
    return acc;
  }, {});

  // Fonction pour obtenir le symbole de la devise
  const getCurrencySymbol = (currencyCode) => {
    const symbols = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'RUB': '₽',
      'XOF': 'F CFA', 'XAF': 'F CFA', 'NGN': '₦', 'GHS': '₵', 'ZAR': 'R'
    };
    return symbols[currencyCode] || currencyCode;
  };

  // Fonction pour obtenir le pays associé à une devise
  const getCurrencyCountry = (currencyCode) => {
    // Chercher dans la liste des pays récupérée depuis l'API
    const country = countries.find(c => c.currency_code === currencyCode);
    if (country) return country.name;
    
    // Fallback si pas trouvé
    const fallbackCountries = {
      'USD': 'États-Unis', 'EUR': 'Europe', 'GBP': 'Royaume-Uni', 
      'JPY': 'Japon', 'RUB': 'Russie', 'XOF': 'Afrique de l\'Ouest',
      'XAF': 'Afrique Centrale', 'NGN': 'Nigeria', 'GHS': 'Ghana',
      'ZAR': 'Afrique du Sud'
    };
    return fallbackCountries[currencyCode] || 'Pays inconnu';
  };

  return (
    <div className="p-6">
      {/* En-tête avec boutons */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Gestion des taux de change</h1>
        <div className="flex gap-3">
          <button
            onClick={fetchRates}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            🔄 Actualiser
          </button>
          <button
            onClick={() => setModal({ 
              mode: "add", 
              rate: { 
                from_currency_id: "", 
                to_currency_id: "", 
                rate: "", 
                commission_percent: 0.75 
              } 
            })}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            + Ajouter un taux
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher par pays (ex: France, États-Unis...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            ) : (
              <span className="text-gray-400">🔍</span>
            )}
          </div>
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-500 mt-2">
            {rates.length} taux trouvés pour "{searchTerm}"
          </p>
        )}
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total des taux</h3>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-gray-500 text-sm font-medium">Taux actifs</h3>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Chargement des taux...</div>
        </div>
      ) : rates.length === 0 ? (
        <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow">
          <div className="text-center text-gray-500">
            {searchTerm ? (
              <>
                <p className="text-lg font-medium">Aucun taux trouvé</p>
                <p className="text-sm">Aucun résultat pour "{searchTerm}"</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-3 text-indigo-600 hover:text-indigo-800"
                >
                  Voir tous les taux
                </button>
              </>
            ) : (
              <p className="text-lg font-medium">Aucun taux disponible</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRates).map(([currency, currencyRates]) => (
            <div key={currency} className="bg-white rounded-xl shadow p-6">
              {/* En-tête de section par devise source */}
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-blue-600">
                    {currency} ({getCurrencySymbol(currency)})
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Pays: {getCurrencyCountry(currency)}
                  </p>
                </div>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {currencyRates.length} taux
                </span>
              </div>

              {/* Grille des taux */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currencyRates.map((rate) => (
                  <div key={rate.id} className="border rounded-lg p-4 relative hover:shadow-md transition-shadow">
                    {/* En-tête de la carte */}
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-800">
                        {rate.from_currency} ↔ {rate.to_currency}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModal({ mode: "edit", rate })}
                          className="text-blue-600 hover:text-blue-800 text-lg"
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteRate(rate.id)}
                          className="text-red-600 hover:text-red-800 text-lg"
                          title="Supprimer"
                        >
                          ❌
                        </button>
                      </div>
                    </div>

                    {/* Informations pays */}
                    <div className="text-xs text-gray-500 mb-2">
                      <div>{getCurrencyCountry(rate.from_currency)} → {getCurrencyCountry(rate.to_currency)}</div>
                    </div>

                    {/* Taux principal */}
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      {parseFloat(rate.rate).toFixed(4)}
                    </div>

                    {/* Phrase explicative */}
                    <p className="text-gray-600 text-sm mb-2">
                      1 {getCurrencySymbol(rate.from_currency)} = {parseFloat(rate.rate).toFixed(4)} {getCurrencySymbol(rate.to_currency)}
                    </p>

                    {/* Taux inverse */}
                    <p className="text-gray-400 text-xs">
                      Taux inverse: {(1 / parseFloat(rate.rate)).toFixed(4)}
                    </p>

                    {/* Commission */}
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        Commission: {rate.commission_percent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center p-4 z-50">
          <form
            onSubmit={saveRate}
            className="bg-white p-6 rounded-xl shadow w-full max-w-md space-y-4"
          >
            <h2 className="text-xl font-semibold">
              {modal.mode === "add" ? "Nouveau taux" : "Modifier taux"}
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Devise source
              </label>
              <input
                value={modal.rate.from_currency_id}
                onChange={(e) => setModal({ ...modal, rate: { ...modal.rate, from_currency_id: e.target.value } })}
                placeholder="ID devise source"
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Devise cible
              </label>
              <input
                value={modal.rate.to_currency_id}
                onChange={(e) => setModal({ ...modal, rate: { ...modal.rate, to_currency_id: e.target.value } })}
                placeholder="ID devise cible"
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taux
              </label>
              <input
                value={modal.rate.rate}
                onChange={(e) => setModal({ ...modal, rate: { ...modal.rate, rate: e.target.value } })}
                placeholder="0.00"
                type="number"
                step="0.0001"
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commission (%)
              </label>
              <input
                value={modal.rate.commission_percent}
                onChange={(e) => setModal({ ...modal, rate: { ...modal.rate, commission_percent: e.target.value } })}
                placeholder="0.75"
                type="number"
                step="0.01"
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setModal(null)} 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}