import React, { useEffect, useState } from "react";
import { Plus, Edit, Trash2, AlertCircle, Search, RefreshCw, Loader } from "lucide-react";

export default function AuthorizedNumbersList() {
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ 
    id: null, 
    number: "", 
    country_id: "", 
    agent_id: "" 
  });
  const [isEditing, setIsEditing] = useState(false);
  const [countries, setCountries] = useState([]);
  const [agentsByCountry, setAgentsByCountry] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
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
  }, []);

  // Charger les agents quand un pays est sélectionné (même logique que le formulaire de transaction)
  useEffect(() => {
    const loadAgentsForCountry = async (countryId) => {
      if (!countryId) return;
      
      // Si les agents pour ce pays sont déjà chargés, on ne recharge pas
      if (agentsByCountry[countryId]) return;

      try {
        setFilterLoading(true);
        
        // Utiliser le même endpoint que dans vos routes d'agents
        const res = await fetch(`http://localhost:5000/api/agent/country/${countryId}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });

        if (res.ok) {
          const agentsData = await res.json();
          setAgentsByCountry(prev => ({
            ...prev,
            [countryId]: Array.isArray(agentsData) ? agentsData : []
          }));
        } else {
          console.error(`Erreur lors du chargement des agents pour le pays ${countryId}`);
          setAgentsByCountry(prev => ({
            ...prev,
            [countryId]: []
          }));
        }
      } catch (err) {
        console.error(`Erreur lors du chargement des agents pour le pays ${countryId}:`, err);
        setAgentsByCountry(prev => ({
          ...prev,
          [countryId]: []
        }));
      } finally {
        setFilterLoading(false);
      }
    };

    if (form.country_id) {
      loadAgentsForCountry(form.country_id);
    }
  }, [form.country_id, token, agentsByCountry]);

  // Fonction utilitaire pour récupérer les agents d'un pays
  const getAgentsByCountryId = (countryId) => {
    return agentsByCountry[countryId] || [];
  };

  // Charger la liste des numéros autorisés avec les détails
  const fetchNumbers = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/numero_autorise", {
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
      
      let numbersArray = [];
      if (Array.isArray(data)) {
        numbersArray = data;
      } else if (data && Array.isArray(data.data)) {
        numbersArray = data.data;
      } else if (data && data.numbers) {
        numbersArray = data.numbers;
      } else {
        numbersArray = [];
      }
      
      // Enrichir les données avec les noms des pays et agents
      const enrichedNumbers = await Promise.all(
        numbersArray.map(async (num) => {
          try {
            // Récupérer les détails du pays
            const country = countries.find(c => c.id === num.country_id) || 
                           await fetchCountryDetails(num.country_id);
            
            // Récupérer les détails de l'agent
            const agent = await fetchAgentDetails(num.agent_id);

            return {
              ...num,
              country_name: country?.name || `Pays #${num.country_id}`,
              country_code: country?.code || '',
              agent_name: agent?.name || `Agent #${num.agent_id}`,
              agent_email: agent?.email || ''
            };
          } catch (err) {
            console.error("Erreur enrichissement données:", err);
            return {
              ...num,
              country_name: `Pays #${num.country_id}`,
              agent_name: `Agent #${num.agent_id}`
            };
          }
        })
      );
      
      setNumbers(enrichedNumbers);
      setError(null);
    } catch (err) {
      console.error("Erreur fetchNumbers:", err);
      setError(err.message);
      setNumbers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonctions pour récupérer les détails
  const fetchCountryDetails = async (countryId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/country/${countryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error("Erreur chargement pays:", err);
    }
    return null;
  };

  const fetchAgentDetails = async (agentId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/agent/${agentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error("Erreur chargement agent:", err);
    }
    return null;
  };

  // Charger les pays
  const fetchCountries = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/country", {
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

  // Gérer le changement de pays
  const handleCountryChange = (countryId) => {
    setForm({ 
      ...form, 
      country_id: countryId,
      agent_id: "" // Réinitialiser la sélection d'agent
    });
  };

  // Filtrer les numéros selon la recherche
  const filteredNumbers = numbers.filter(num =>
    num.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    num.country_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    num.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    num.agent_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Valider le formulaire
  const validateForm = () => {
    if (!form.number.trim()) {
      setError("Le numéro de téléphone est requis");
      return false;
    }
    if (!form.country_id) {
      setError("Veuillez sélectionner un pays");
      return false;
    }
    if (!form.agent_id) {
      setError("Veuillez sélectionner un agent");
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
        ? `http://localhost:5000/api/numero_autorise/${form.id}`
        : "http://localhost:5000/api/numero_autorise";

      const method = form.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          number: form.number.trim(),
          country_id: parseInt(form.country_id),
          agent_id: parseInt(form.agent_id)
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erreur lors de la sauvegarde");
      }

      setForm({ id: null, number: "", country_id: "", agent_id: "" });
      setIsEditing(false);
      setError(null);
      fetchNumbers(); // Recharger la liste
    } catch (err) {
      setError("Erreur lors de la sauvegarde: " + err.message);
    }
  };

  // Supprimer
  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce numéro autorisé ?")) return;
    
    try {
      const res = await fetch(`http://localhost:5000/api/numero_autorise/${id}`, {
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
      agent_id: num.agent_id || ""
    });
    setIsEditing(true);
  };

  // Réinitialiser le formulaire
  const handleCancel = () => {
    setForm({ id: null, number: "", country_id: "", agent_id: "" });
    setIsEditing(false);
    setError(null);
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

  // Récupérer les agents pour le pays sélectionné
  const currentCountryAgents = getAgentsByCountryId(form.country_id);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Numéros Autorisés</h1>
              <p className="text-gray-600 mt-1">Gérez les numéros de téléphone autorisés pour les transactions</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button
                onClick={fetchNumbers}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={18} />
                <span>Rafraîchir</span>
              </button>
            </div>
          </div>
        </div>

        {/* Messages d'erreur */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 font-medium">Erreur</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Carte principale */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* En-tête de la carte avec recherche */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Rechercher un numéro, pays ou agent..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {filteredNumbers.length} numéro(s) trouvé(s) sur {numbers.length}
              </div>
            </div>
          </div>

          {/* Formulaire d'ajout/modification */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isEditing ? "Modifier le numéro" : "Ajouter un nouveau numéro"}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de téléphone *
                </label>
                <input
                  type="text"
                  placeholder="Ex: +33612345678"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pays *
                </label>
                <select
                  value={form.country_id}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Sélectionner un pays</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent *
                </label>
                <div className="relative">
                  <select
                    value={form.agent_id}
                    onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                    disabled={!form.country_id || filterLoading}
                  >
                    <option value="">
                      {filterLoading 
                        ? "Chargement des agents..." 
                        : !form.country_id 
                          ? "Sélectionnez d'abord un pays" 
                          : currentCountryAgents.length === 0
                            ? "Aucun agent disponible pour ce pays"
                            : "Sélectionner un agent"
                      }
                    </option>
                    {!filterLoading && currentCountryAgents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.email})
                      </option>
                    ))}
                  </select>
                  
                  {filterLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader className="h-4 w-4 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
                
                {form.country_id && !filterLoading && (
                  <p className={`text-xs mt-1 ${
                    currentCountryAgents.length === 0 ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {currentCountryAgents.length === 0 
                      ? "Aucun agent disponible pour ce pays" 
                      : `${currentCountryAgents.length} agent(s) disponible(s) pour ce pays`
                    }
                  </p>
                )}
              </div>
              <div className="lg:col-span-2 flex items-end space-x-3">
                <button
                  type="submit"
                  disabled={filterLoading || (form.country_id && currentCountryAgents.length === 0)}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEditing ? <Edit size={18} /> : <Plus size={18} />}
                  <span>{isEditing ? "Modifier" : "Ajouter"}</span>
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Liste des numéros */}
          <div className="p-6">
            {filteredNumbers.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? "Aucun numéro trouvé" : "Aucun numéro autorisé"}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {searchTerm 
                    ? "Aucun résultat ne correspond à votre recherche." 
                    : "Commencez par ajouter votre premier numéro autorisé en utilisant le formulaire ci-dessus."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Numéro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pays
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Agent
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
                          #{num.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {num.number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {num.country_name || `Pays #${num.country_id}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div>
                            <div className="font-medium">{num.agent_name || `Agent #${num.agent_id}`}</div>
                            {num.agent_email && (
                              <div className="text-xs text-gray-500">{num.agent_email}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleEdit(num)}
                              className="text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1"
                            >
                              <Edit size={16} />
                              <span>Modifier</span>
                            </button>
                            <button
                              onClick={() => handleDelete(num.id)}
                              className="text-red-600 hover:text-red-800 transition-colors flex items-center space-x-1"
                            >
                              <Trash2 size={16} />
                              <span>Supprimer</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}