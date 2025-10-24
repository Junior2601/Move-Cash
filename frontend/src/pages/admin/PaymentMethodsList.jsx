import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Search, Filter, Download, Upload, X } from "lucide-react";

export default function PaymentMethodsList() {
  const [methods, setMethods] = useState([]);
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ 
    id: null, 
    method: "", 
    country_id: "", 
    currency_id: "", 
    is_active: true 
  });
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const token = localStorage.getItem("admin_token");

  // Charger tous les moyens de paiement avec les relations
  const fetchMethods = async () => {
    try {
      const res = await fetch("https://api.movecah.online/api/payment_method", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMethods(data);
    } catch (err) {
      setError("Erreur lors du chargement des moyens de paiement");
    }
  };

  // Charger la liste des pays
  const fetchCountries = async () => {
    try {
      const res = await fetch("https://api.movecah.online/api/country", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCountries(data);
    } catch (err) {
      console.error("Erreur lors du chargement des pays");
    }
  };

  // Charger la liste des devises
  const fetchCurrencies = async () => {
    try {
      const res = await fetch("https://api.movecah.online/api/currency", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCurrencies(data);
    } catch (err) {
      console.error("Erreur lors du chargement des devises");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMethods(),
        fetchCountries(),
        fetchCurrencies()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Filtrer les méthodes
  const filteredMethods = methods.filter(method => {
    const countryName = countries.find(c => c.id === method.country_id)?.name || "";
    const currencyName = currencies.find(c => c.id === method.currency_id)?.name || "";
    
    const matchesSearch = method.method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         countryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         currencyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && method.is_active) ||
                         (statusFilter === "inactive" && !method.is_active);
    return matchesSearch && matchesStatus;
  });

  // Ajouter ou modifier un moyen
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = form.id
        ? `https://api.movecah.online/api/payment_method/${form.id}`
        : "https://api.movecah.online/api/payment_method";

      const method = form.id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          method: form.method,
          country_id: form.country_id,
          currency_id: form.currency_id,
          is_active: form.is_active
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'enregistrement");
      }

      setForm({ id: null, method: "", country_id: "", currency_id: "", is_active: true });
      setIsEditing(false);
      setShowForm(false);
      fetchMethods();
    } catch (err) {
      setError("Erreur lors de l'enregistrement");
    }
  };

  // Supprimer un moyen
  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce moyen de paiement ?")) return;
    
    try {
      const response = await fetch(`https://api.movecah.online/api/payment_method/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      fetchMethods();
    } catch (err) {
      setError("Erreur lors de la suppression");
    }
  };

  // Préparer la modification
  const handleEdit = (m) => {
    setForm({
      id: m.id,
      method: m.method,
      country_id: m.country_id,
      currency_id: m.currency_id,
      is_active: m.is_active
    });
    setIsEditing(true);
    setShowForm(true);
  };

  // Annuler l'édition
  const handleCancel = () => {
    setForm({ id: null, method: "", country_id: "", currency_id: "", is_active: true });
    setIsEditing(false);
    setShowForm(false);
  };

  // Obtenir le nom du pays
  const getCountryName = (countryId) => {
    const country = countries.find(c => c.id === countryId);
    return country ? country.name : "Pays inconnu";
  };

  // Obtenir le nom de la devise
  const getCurrencyName = (currencyId) => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? `${currency.name} (${currency.code})` : "Devise inconnue";
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mx-4 mt-4">
      {error}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Moyens de Paiement</h1>
          <p className="text-gray-600 text-sm">Gérez les moyens de paiement par pays et devise</p>
        </div>

        {/* Bouton d'action principal mobile */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            {isEditing ? "Modifier un moyen" : "Ajouter un moyen"}
          </button>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* En-tête de carte avec actions */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex flex-col space-y-3">
              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, pays ou devise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filtres mobiles */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  Filtres
                  {showFilters && <X className="h-4 w-4" />}
                </button>

                <div className="flex gap-2">
                  <button className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                    <Download className="h-4 w-4" />
                  </button>
                  <button className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                    <Upload className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Filtres dépliants */}
              {showFilters && (
                <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Statut
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="active">Actifs</option>
                      <option value="inactive">Inactifs</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Formulaire - Mobile: conditionnel, Desktop: toujours visible */}
          {(showForm || window.innerWidth >= 1024) && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3 lg:hidden">
                <h3 className="text-base font-semibold text-gray-900">
                  {isEditing ? "Modifier" : "Nouveau moyen"}
                </h3>
                <button
                  onClick={handleCancel}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du moyen de paiement
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Mobile Money, Carte Bancaire"
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pays
                    </label>
                    <select
                      value={form.country_id}
                      onChange={(e) => setForm({ ...form, country_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    >
                      <option value="">Sélectionnez un pays</option>
                      {countries.map(country => (
                        <option key={country.id} value={country.id}>
                          {country.name} ({country.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Devise
                    </label>
                    <select
                      value={form.currency_id}
                      onChange={(e) => setForm({ ...form, currency_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    >
                      <option value="">Sélectionnez une devise</option>
                      {currencies.map(currency => (
                        <option key={currency.id} value={currency.id}>
                          {currency.name} ({currency.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut
                  </label>
                  <select
                    value={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="true">Actif</option>
                    <option value="false">Inactif</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${
                      isEditing 
                        ? "bg-orange-600 hover:bg-orange-700" 
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isEditing ? <Edit size={16} /> : <Plus size={16} />}
                    {isEditing ? "Modifier" : "Ajouter"}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Liste des méthodes - Version mobile */}
          <div className="lg:hidden">
            {filteredMethods.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="text-gray-400 mb-3">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-base">Aucun moyen de paiement trouvé</p>
                <p className="text-gray-400 text-sm mt-1">
                  {searchTerm || statusFilter !== "all" 
                    ? "Modifiez vos critères de recherche" 
                    : "Ajoutez un nouveau moyen de paiement"
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredMethods.map((method) => (
                  <div key={method.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 text-base mb-1">{method.method}</h3>
                        <div className="space-y-1 text-sm text-gray-500">
                          <p>Pays: {getCountryName(method.country_id)}</p>
                          <p>Devise: {getCurrencyName(method.currency_id)}</p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          method.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {method.is_active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleEdit(method)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                      >
                        <Edit size={14} />
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(method.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                      >
                        <Trash2 size={14} />
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tableau - Version desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Méthode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pays
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Devise
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMethods.map((method) => (
                  <tr key={method.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {method.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {method.method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getCountryName(method.country_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getCurrencyName(method.currency_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          method.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {method.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleEdit(method)}
                          className="text-blue-600 hover:text-blue-900 transition-colors flex items-center gap-1"
                        >
                          <Edit size={16} />
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(method.id)}
                          className="text-red-600 hover:text-red-900 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={16} />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pied de page */}
          {filteredMethods.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                {filteredMethods.length} moyen{filteredMethods.length > 1 ? 's' : ''} de paiement
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}