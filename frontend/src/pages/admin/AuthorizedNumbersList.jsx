import React, { useEffect, useState } from "react";
import { 
  Plus, Edit, Trash2, AlertCircle, Search, RefreshCw, Loader, 
  Phone, User, Globe, CreditCard, Filter, X
} from "lucide-react";

export default function AuthorizedNumbersList() {
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ 
    id: null, 
    number: "", 
    country_id: "", 
    agent_id: "",
    payment_method_id: "",
    label: "",
    is_active: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [countries, setCountries] = useState([]);
  const [agents, setAgents] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);

  // Vérifier l'authentification
  const token = localStorage.getItem("admin_token");

  // Charger les données initiales
  useEffect(() => {
    if (!token) {
      setError("Token d'authentification manquant");
      setLoading(false);
      return;
    }
    fetchNumbers();
    fetchCountries();
    fetchAgents();
    fetchPaymentMethods();
  }, []);

  // Obtenir l'indicatif du pays sélectionné
  const getCountryPrefix = () => {
    if (!form.country_id) return "";
    const country = countries.find(c => c.id === parseInt(form.country_id));
    return country ? country.phone_prefix : "";
  };

  // Formater automatiquement le numéro avec l'indicatif
  const formatPhoneNumber = (input) => {
    const prefix = getCountryPrefix();
    
    // Si on supprime tout le numéro, on vide le champ
    if (!input) return "";
    
    // Si le numéro commence déjà par l'indicatif, on le conserve
    if (prefix && input.startsWith(prefix)) {
      return input;
    }
    
    // Si on a un indicatif et que le numéro n'est pas vide, on l'ajoute
    if (prefix && input) {
      // Supprimer les espaces et caractères spéciaux pour la vérification
      const cleanInput = input.replace(/\D/g, '');
      const cleanPrefix = prefix.replace(/\D/g, '');
      
      // Si le numéro ne commence pas déjà par l'indicatif, on l'ajoute
      if (!cleanInput.startsWith(cleanPrefix)) {
        return prefix + input;
      }
    }
    
    return input;
  };

  // Gérer le changement de pays
  const handleCountryChange = (countryId) => {
    const newForm = { 
      ...form, 
      country_id: countryId,
      agent_id: "" // Réinitialiser la sélection d'agent
    };
    
    // Si on a déjà un numéro, reformater avec le nouvel indicatif
    if (form.number) {
      const currentNumberWithoutPrefix = form.number.replace(/^\+\d+\s?/, '');
      newForm.number = formatPhoneNumber(currentNumberWithoutPrefix);
    }
    
    setForm(newForm);
  };

  // Gérer le changement du numéro
  const handleNumberChange = (input) => {
    const formattedNumber = formatPhoneNumber(input);
    setForm({ ...form, number: formattedNumber });
  };

  // Charger les numéros autorisés
  const fetchNumbers = async () => {
    try {
      setLoading(true);
      const res = await fetch("https://api.movecah.online/api/numero_autorise", {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Accès interdit - Vérifiez vos permissions administrateur");
        }
        if (res.status === 401) {
          localStorage.removeItem("admin_token");
          window.location.href = "/login";
          return;
        }
        throw new Error(`Erreur ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setNumbers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error("Erreur fetchNumbers:", err);
      setError(err.message);
      setNumbers([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger les pays
  const fetchCountries = async () => {
    try {
      const res = await fetch("https://api.movecah.online/api/country", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCountries(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erreur chargement pays:", err);
    }
  };

  // Charger les agents
  const fetchAgents = async () => {
    try {
      const res = await fetch("https://api.movecah.online/api/agent", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data?.agents || []);
      }
    } catch (err) {
      console.error("Erreur chargement agents:", err);
    }
  };

  // Charger les moyens de paiement
  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch("https://api.movecah.online/api/payment_method", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentMethods(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erreur chargement moyens de paiement:", err);
    }
  };

  // Filtrer les numéros selon la recherche
  const filteredNumbers = numbers.filter(num =>
    num.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    num.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    num.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    num.payment_method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    num.label?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Valider le formulaire
  const validateForm = () => {
    if (!form.number.trim()) {
      setError("Le numéro est requis");
      return false;
    }
    if (!form.agent_id) {
      setError("Veuillez sélectionner un agent");
      return false;
    }
    if (!form.country_id) {
      setError("Veuillez sélectionner un pays");
      return false;
    }
    if (!form.payment_method_id) {
      setError("Veuillez sélectionner un moyen de paiement");
      return false;
    }
    
    // Validation du format du numéro
    const prefix = getCountryPrefix();
    if (prefix && !form.number.startsWith(prefix)) {
      setError(`Le numéro doit commencer par l'indicatif du pays (${prefix})`);
      return false;
    }
    
    return true;
  };

  // Ajouter ou modifier
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const url = form.id
        ? `https://api.movecah.online/api/numero_autorise/${form.id}`
        : "https://api.movecah.online/api/numero_autorise";

      const method = form.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          number: form.number.trim(),
          agent_id: parseInt(form.agent_id),
          country_id: parseInt(form.country_id),
          payment_method_id: parseInt(form.payment_method_id),
          label: form.label.trim(),
          is_active: form.is_active
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erreur lors de la sauvegarde");
      }

      setForm({ 
        id: null, 
        number: "", 
        country_id: "", 
        agent_id: "",
        payment_method_id: "",
        label: "",
        is_active: true
      });
      setIsEditing(false);
      setError(null);
      fetchNumbers();
    } catch (err) {
      setError("Erreur lors de la sauvegarde: " + err.message);
    }
  };

  // Supprimer
  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce numéro autorisé ?")) return;
    
    try {
      const res = await fetch(`https://api.movecah.online/api/numero_autorise/${id}`, {
        method: "DELETE",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      setError(null);
      fetchNumbers();
    } catch (err) {
      setError("Erreur lors de la suppression: " + err.message);
    }
  };

  // Préparer l'édition
  const handleEdit = (num) => {
    setForm({
      id: num.id,
      number: num.number || "",
      country_id: num.country_id || "",
      agent_id: num.agent_id || "",
      payment_method_id: num.payment_method_id || "",
      label: num.label || "",
      is_active: num.is_active !== undefined ? num.is_active : true
    });
    setIsEditing(true);
  };

  // Réinitialiser le formulaire
  const handleCancel = () => {
    setForm({ 
      id: null, 
      number: "", 
      country_id: "", 
      agent_id: "",
      payment_method_id: "",
      label: "",
      is_active: true
    });
    setIsEditing(false);
    setError(null);
  };

  // Obtenir le nom de l'agent
  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.name} (${agent.email})` : "Agent inconnu";
  };

  // Obtenir le nom du pays
  const getCountryName = (countryId) => {
    const country = countries.find(c => c.id === countryId);
    return country ? country.name : "Pays inconnu";
  };

  // Obtenir le nom du moyen de paiement
  const getPaymentMethodName = (paymentMethodId) => {
    const method = paymentMethods.find(p => p.id === paymentMethodId);
    return method ? method.method : "Méthode inconnue";
  };

  // Rendu conditionnel pour l'authentification
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-red-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Authentification requise</h3>
                <p className="text-gray-600">Veuillez vous connecter pour accéder à cette page</p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = "/login"}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Chargement des numéros autorisés...</p>
        </div>
      </div>
    );
  }

  const countryPrefix = getCountryPrefix();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Numéros Autorisés</h1>
          <p className="text-gray-600 text-sm">Gérez les numéros de compte autorisés pour les transactions</p>
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
                  placeholder="Rechercher un numéro, agent, pays ou moyen de paiement..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Actions */}
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
                  <button
                    onClick={fetchNumbers}
                    className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    title="Actualiser"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setForm({ 
                        id: null, 
                        number: "", 
                        country_id: "", 
                        agent_id: "",
                        payment_method_id: "",
                        label: "",
                        is_active: true
                      });
                      setIsEditing(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={16} />
                    Nouveau Numéro
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="m-4 bg-red-50 border border-red-200 p-3 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <h3 className="text-red-800 font-semibold text-sm">Erreur</h3>
              </div>
              <p className="text-red-600 mt-1 text-sm">{error}</p>
            </div>
          )}

          {/* Formulaire */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              {isEditing ? "Modifier le numéro" : "Ajouter un nouveau numéro"}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pays *
                  </label>
                  <select
                    value={form.country_id}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  >
                    <option value="">Sélectionnez un pays</option>
                    {countries.map(country => (
                      <option key={country.id} value={country.id}>
                        {country.name} ({country.code}) - {country.phone_prefix}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro *
                    {countryPrefix && (
                      <span className="text-green-600 ml-1">
                        (Indicatif: {countryPrefix})
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    {countryPrefix && (
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                        {countryPrefix}
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder={countryPrefix ? "123456789" : "Sélectionnez d'abord un pays"}
                      value={form.number}
                      onChange={(e) => handleNumberChange(e.target.value)}
                      className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                        countryPrefix ? 'pl-16' : 'pl-3'
                      } ${!form.country_id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      required
                      disabled={!form.country_id}
                    />
                  </div>
                  {countryPrefix && (
                    <p className="text-xs text-gray-500 mt-1">
                      Le numéro commencera automatiquement par {countryPrefix}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent *
                  </label>
                  <select
                    value={form.agent_id}
                    onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  >
                    <option value="">Sélectionnez un agent</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moyen de paiement *
                  </label>
                  <select
                    value={form.payment_method_id}
                    onChange={(e) => setForm({ ...form, payment_method_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  >
                    <option value="">Sélectionnez un moyen</option>
                    {paymentMethods.map(method => (
                      <option key={method.id} value={method.id}>
                        {method.method}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Libellé (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Compte principal, Carte perso..."
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Numéro actif</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

          {/* Liste des numéros - Version mobile */}
          <div className="lg:hidden">
            {filteredNumbers.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="text-gray-400 mb-3">
                  <Phone className="w-12 h-12 mx-auto" />
                </div>
                <p className="text-gray-500 text-base">Aucun numéro trouvé</p>
                <p className="text-gray-400 text-sm mt-1">
                  {searchTerm 
                    ? "Modifiez vos critères de recherche" 
                    : "Commencez par ajouter un nouveau numéro"
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredNumbers.map((num) => (
                  <div key={num.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Phone className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {num.number}
                            </h3>
                            {num.label && (
                              <p className="text-gray-500 text-xs">{num.label}</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-gray-500">
                          <p className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {num.agent_name || getAgentName(num.agent_id)}
                          </p>
                          <p className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {num.country || getCountryName(num.country_id)}
                          </p>
                          <p className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            {num.payment_method || getPaymentMethodName(num.payment_method_id)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          num.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {num.is_active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleEdit(num)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                      >
                        <Edit size={14} />
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(num.id)}
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
                    Numéro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Libellé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pays
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Moyen de Paiement
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
                {filteredNumbers.map((num) => (
                  <tr key={num.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 text-gray-400 mr-2" />
                        {num.number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {num.label || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        {num.agent_name || getAgentName(num.agent_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Globe className="w-4 h-4 text-gray-400 mr-2" />
                        {num.country || getCountryName(num.country_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                        {num.payment_method || getPaymentMethodName(num.payment_method_id)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          num.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {num.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleEdit(num)}
                          className="text-blue-600 hover:text-blue-900 transition-colors flex items-center gap-1"
                        >
                          <Edit size={16} />
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(num.id)}
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
          {filteredNumbers.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                {filteredNumbers.length} numéro{filteredNumbers.length > 1 ? 's' : ''} autorisé{filteredNumbers.length > 1 ? 's' : ''} trouvé{filteredNumbers.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}