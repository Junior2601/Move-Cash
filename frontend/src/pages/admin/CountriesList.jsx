import React, { useEffect, useState } from 'react';
import api from '../../api/api';

export default function CountriesList() {
  const [countries, setCountries] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const fetchCountries = async () => {
    setLoading(true);
    try {
      const [countriesRes, statsRes] = await Promise.all([
        api.get('/country'),
        api.get('/country/stats')
      ]);
      setCountries(countriesRes.data || []);
      setStats(statsRes.data || { total: 0, active: 0, inactive: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchCountries(); 
  }, []);

  const saveCountry = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === "add") {
        await api.post('/country', modal.country);
      } else {
        await api.put(`/country/${modal.country.id}`, modal.country);
      }
      setModal(null);
      fetchCountries();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCountry = async (id) => {
    if (!window.confirm("Supprimer ce pays ?")) return;
    try {
      await api.delete(`/country/${id}`);
      fetchCountries();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleActiveStatus = async (country) => {
    try {
      await api.put(`/country/${country.id}`, {
        ...country,
        is_active: !country.is_active
      });
      fetchCountries();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Gestion des pays</h1>
        <button
          onClick={() => setModal({ 
            mode: "add", 
            country: { 
              name: "", 
              code: "", 
              phone_prefix: "", 
              currency_id: null,
              is_active: true 
            } 
          })}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Ajouter un pays
        </button>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total des pays</h3>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-gray-500 text-sm font-medium">Pays actifs</h3>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-gray-500 text-sm font-medium">Pays inactifs</h3>
          <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Chargement...</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left">Nom</th>
                <th className="py-3 px-4 text-left">Code</th>
                <th className="py-3 px-4 text-left">Préfixe téléphonique</th>
                <th className="py-3 px-4 text-left">Devise</th>
                <th className="py-3 px-4 text-left">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {countries.map((country) => (
                <tr key={country.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">{country.name}</td>
                  <td className="py-3 px-4">{country.code}</td>
                  <td className="py-3 px-4">{country.phone_prefix}</td>
                  <td className="py-3 px-4">{country.currency_code}</td>
                  <td className="py-3 px-4">
                    <span 
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        country.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {country.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => setModal({ mode: "edit", country })}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Modifier
                    </button>
                    <button 
                      onClick={() => toggleActiveStatus(country)}
                      className={`${
                        country.is_active 
                          ? 'text-orange-600 hover:text-orange-800' 
                          : 'text-green-600 hover:text-green-800'
                      }`}
                    >
                      {country.is_active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button 
                      onClick={() => deleteCountry(country.id)} 
                      className="text-red-600 hover:text-red-800"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center p-4 z-50">
          <form
            onSubmit={saveCountry}
            className="bg-white p-6 rounded-xl shadow w-full max-w-md space-y-4"
          >
            <h2 className="text-xl font-semibold">
              {modal.mode === "add" ? "Nouveau pays" : "Modifier pays"}
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom
              </label>
              <input
                value={modal.country.name}
                onChange={(e) => setModal({ ...modal, country: { ...modal.country, name: e.target.value } })}
                placeholder="Nom du pays"
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code
              </label>
              <input
                value={modal.country.code}
                onChange={(e) => setModal({ ...modal, country: { ...modal.country, code: e.target.value } })}
                placeholder="Code (ex: CI)"
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Préfixe téléphonique
              </label>
              <input
                value={modal.country.phone_prefix}
                onChange={(e) => setModal({ ...modal, country: { ...modal.country, phone_prefix: e.target.value } })}
                placeholder="+225"
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID de la devise
              </label>
              <input
                type="number"
                value={modal.country.currency_id || ''}
                onChange={(e) => setModal({ ...modal, country: { ...modal.country, currency_id: parseInt(e.target.value) || null } })}
                placeholder="ID de la devise"
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
            
            {modal.mode === "edit" && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={modal.country.is_active}
                  onChange={(e) => setModal({ ...modal, country: { ...modal.country, is_active: e.target.checked } })}
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Pays actif
                </label>
              </div>
            )}

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