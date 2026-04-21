import React, { useEffect, useState, useCallback } from 'react';
import { 
  Plus, Edit, Trash2, RefreshCw, Globe, Phone, Currency, 
  TrendingUp, TrendingDown, Search, Filter, X, CheckCircle, XCircle, Info
} from 'lucide-react';
import api from '../../api/api';

// Composant de notification (inchangé)
const Notification = ({ message, type, onClose }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 max-w-[90vw] ${styles[type]}`}>
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="flex-1"><p className="text-sm font-medium">{message}</p></div>
      <button onClick={onClose} className="flex-shrink-0 hover:opacity-70 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function CountriesList() {
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [stats, setStats] = useState({
    total_countries: 0,
    active_countries: 0,
    inactive_countries: 0,
    deleted_countries: 0,
    unique_currencies: 0
  });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [notification, setNotification] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const showNotification = useCallback((message, type = 'info') => {
    console.log(`🔔 Notification ${type}:`, message);
    setNotification({ message, type });
  }, []);

  const fetchCountries = async () => {
    console.log('🔄 fetchCountries - Début');
    setLoading(true);
    setError(null);
    
    try {
      console.log('📥 Chargement des pays et statistiques...');
      
      // Appels API adaptés aux nouvelles routes avec token
      const [countriesRes, statsRes, currenciesRes] = await Promise.all([
        api.get('/country'),
        api.get('/country/stats'),
        api.get('/currency/active')
      ]);
      
      console.log('✅ Réponse pays:', countriesRes.data);
      console.log('✅ Réponse stats:', statsRes.data);
      console.log('✅ Réponse devises:', currenciesRes.data);
      
      // Adaptation au format de réponse { success, data }
      setCountries(countriesRes.data?.data || []);
      setStats(statsRes.data?.data || { 
        total_countries: 0, 
        active_countries: 0, 
        inactive_countries: 0,
        deleted_countries: 0,
        unique_currencies: 0
      });
      setCurrencies(currenciesRes.data?.data || []);
      
    } catch (err) {
      console.error('💥 Erreur lors du chargement:', err);
      console.error('💥 Détails erreur:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        data: err.response?.data
      });
      
      // Gestion des erreurs d'authentification
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Session expirée. Veuillez vous reconnecter.');
        showNotification('Session expirée. Veuillez vous reconnecter.', 'error');
      } else {
        setError('Erreur lors du chargement des données');
        showNotification('Erreur lors du chargement des données', 'error');
      }
    } finally {
      setLoading(false);
      console.log('🔄 fetchCountries - Terminé');
    }
  };

  useEffect(() => { 
    console.log('🎯 useEffect - Initialisation composant');
    fetchCountries(); 
  }, []);

  const filteredCountries = countries.filter(country =>
    country.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.phone_prefix?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.currency_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const saveCountry = async (e) => {
    e.preventDefault();
    console.log('💾 saveCountry - Début');
    
    if (submitting) {
      console.log('⏳ Soumission déjà en cours...');
      return;
    }
    
    setSubmitting(true);
    console.log('📝 Données modal:', modal);
    
    try {
      const countryData = {
        name: modal.country.name?.trim(),
        code: modal.country.code?.trim().toUpperCase(),
        phone_prefix: modal.country.phone_prefix?.trim(),
        currency_id: parseInt(modal.country.currency_id)
      };

      console.log('📤 Données à envoyer:', countryData);

      if (modal.mode === "add") {
        console.log('➕ Mode: Création nouveau pays');
        const response = await api.post('/country', countryData);
        console.log('✅ Réponse création:', response.data);
        showNotification(response.data?.message || 'Pays créé avec succès', 'success');
      } else {
        console.log('✏️ Mode: Modification pays existant');
        const response = await api.put(`/country/${modal.country.id}`, {
          ...countryData,
          is_active: modal.country.is_active
        });
        console.log('✅ Réponse modification:', response.data);
        showNotification(response.data?.message || 'Pays modifié avec succès', 'success');
      }
      
      setModal(null);
      await fetchCountries();
      
    } catch (err) {
      console.error('💥 Erreur saveCountry:', err);
      console.error('💥 Détails erreur:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        data: err.response?.data
      });
      
      const errorMessage = err.response?.data?.message || 'Erreur lors de la sauvegarde du pays';
      showNotification(errorMessage, 'error');
    } finally {
      setSubmitting(false);
      console.log('🏁 saveCountry - Terminé');
    }
  };

  const deleteCountry = async (id) => {
    console.log('🗑️ deleteCountry - Début');
    console.log(`📝 ID à supprimer: ${id}`);
    
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce pays ?")) {
      console.log('❌ Suppression annulée par l\'utilisateur');
      return;
    }
    
    try {
      console.log('📤 Envoi requête suppression...');
      const response = await api.delete(`/country/${id}`);
      console.log('✅ Réponse suppression:', response.data);
      showNotification(response.data?.message || 'Pays supprimé avec succès', 'success');
      fetchCountries();
    } catch (err) {
      console.error('💥 Erreur deleteCountry:', err);
      console.error('💥 Détails erreur:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        data: err.response?.data
      });
      const errorMessage = err.response?.data?.message || 'Erreur lors de la suppression du pays';
      showNotification(errorMessage, 'error');
    }
  };

  const toggleActiveStatus = async (country) => {
    console.log('🔄 toggleActiveStatus - Début');
    console.log('📝 Pays:', {
      id: country.id,
      name: country.name,
      code: country.code,
      current_status: country.is_active,
      new_status: !country.is_active
    });
    
    try {
      console.log('📤 Envoi requête toggle status...');
      
      // Utilisation de la route toggle-status
      const response = await api.patch(`/country/${country.id}/toggle-status`);
      
      console.log('✅ Réponse toggle:', response.data);
      showNotification(response.data?.message || `Pays ${!country.is_active ? 'activé' : 'désactivé'} avec succès`, 'success');
      fetchCountries();
      
    } catch (err) {
      console.error('💥 Erreur toggleActiveStatus:', err);
      console.error('💥 Détails erreur:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        data: err.response?.data
      });
      const errorMessage = err.response?.data?.message || 'Erreur lors de la modification du statut';
      showNotification(errorMessage, 'error');
    }
  };

  const retryLoad = () => {
    console.log('🔄 Retry load - Rechargement des données');
    showNotification('Rechargement des données...', 'info');
    fetchCountries();
  };

  if (loading) {
    console.log('⏳ Affichage état loading');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Chargement des pays...</p>
        </div>
      </div>
    );
  }

  console.log('🎨 Rendu composant - Données:', {
    countries: countries.length,
    filtered: filteredCountries.length,
    stats,
    modal: modal ? `${modal.mode} mode` : 'null',
    searchTerm,
    error,
    notification: notification ? notification.type : 'null',
    submitting
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Notification */}
      {notification && (
        <div className="fixed inset-x-0 top-4 z-50 px-4">
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Gestion des Pays</h1>
          <p className="text-gray-600 text-sm">Administrez les pays et leurs configurations</p>
        </div>

        {/* Affichage de l'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p>{error}</p>
            <button 
              onClick={retryLoad}
              className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* En-tête de carte avec actions */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex flex-col space-y-3">
              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher un pays, code, indicatif ou devise..."
                  value={searchTerm}
                  onChange={(e) => {
                    console.log('🔍 Recherche:', e.target.value);
                    setSearchTerm(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    console.log('🎛️ Toggle filters:', !showFilters);
                    setShowFilters(!showFilters);
                  }}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  Filtres
                  {showFilters && <X className="h-4 w-4" />}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      console.log('🔄 Actualisation manuelle');
                      showNotification('Actualisation des données...', 'info');
                      fetchCountries();
                    }}
                    className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    title="Actualiser"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      console.log('➕ Ouverture modal nouveau pays');
                      setModal({ 
                        mode: "add", 
                        country: { 
                          name: "", 
                          code: "", 
                          phone_prefix: "", 
                          currency_id: null,
                          is_active: true 
                        } 
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Nouveau Pays</span>
                    <span className="sm:hidden">Nouveau</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cartes de statistiques - Adaptées aux nouvelles stats */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_countries}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Actifs</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active_countries}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Inactifs</p>
                    <p className="text-2xl font-bold text-red-600">{stats.inactive_countries}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Liste des pays - Version mobile */}
          <div className="lg:hidden">
            {filteredCountries.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="text-gray-400 mb-3">
                  <Globe className="w-12 h-12 mx-auto" />
                </div>
                <p className="text-gray-500 text-base">Aucun pays trouvé</p>
                <p className="text-gray-400 text-sm mt-1">
                  {searchTerm 
                    ? "Modifiez vos critères de recherche" 
                    : "Commencez par ajouter un nouveau pays"
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredCountries.map((country) => (
                  <div key={country.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Globe className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {country.name}
                            </h3>
                            <p className="text-gray-500 text-xs">
                              {country.code} • {country.phone_prefix}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Currency className="w-3 h-3" />
                          {country.currency_code ? 
                            `${country.currency_code} - ${country.currency_name || ''}` : 
                            'Aucune devise'
                          }
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          country.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {country.is_active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          console.log('✏️ Ouverture modal modification pays:', country);
                          setModal({ mode: "edit", country });
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                      >
                        <Edit size={14} />
                        Modifier
                      </button>
                      <button
                        onClick={() => toggleActiveStatus(country)}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 border rounded-lg transition-colors text-sm ${
                          country.is_active
                            ? "text-orange-600 border-orange-600 hover:bg-orange-50"
                            : "text-green-600 border-green-600 hover:bg-green-50"
                        }`}
                      >
                        {country.is_active ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                        {country.is_active ? "Désactiver" : "Activer"}
                      </button>
                      <button
                        onClick={() => deleteCountry(country.id)}
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
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Indicatif
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
                {filteredCountries.map((country) => (
                  <tr key={country.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <Globe className="w-4 h-4 text-gray-400 mr-2" />
                        {country.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {country.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 text-gray-400 mr-2" />
                        {country.phone_prefix}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Currency className="w-4 h-4 text-gray-400 mr-2" />
                        {country.currency_code ? 
                          `${country.currency_code} (${country.currency_symbol || ''})` : 
                          'Aucune'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          country.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {country.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setModal({ mode: "edit", country })}
                          className="text-blue-600 hover:text-blue-900 transition-colors flex items-center gap-1"
                        >
                          <Edit size={16} />
                          Modifier
                        </button>
                        <button
                          onClick={() => toggleActiveStatus(country)}
                          className={`hover:text-opacity-80 transition-colors flex items-center gap-1 ${
                            country.is_active
                              ? "text-orange-600 hover:text-orange-900"
                              : "text-green-600 hover:text-green-900"
                          }`}
                        >
                          {country.is_active ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                          {country.is_active ? "Désactiver" : "Activer"}
                        </button>
                        <button
                          onClick={() => deleteCountry(country.id)}
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
          {filteredCountries.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                {filteredCountries.length} pays{filteredCountries.length > 1 ? 's' : ''} trouvé{filteredCountries.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              console.log('👆 Clic en dehors - Fermeture modal');
              setModal(null);
            }
          }}
        >
          <form
            onSubmit={saveCountry}
            className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {modal.mode === "add" ? "Nouveau Pays" : "Modifier le Pays"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!submitting) {
                    console.log('❌ Fermeture modal manuelle');
                    setModal(null);
                  }
                }}
                disabled={submitting}
                className={`text-gray-400 hover:text-gray-600 transition-colors ${
                  submitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du pays *
                </label>
                <input
                  value={modal.country.name}
                  onChange={(e) => {
                    console.log('📝 Changement nom:', e.target.value);
                    setModal({ ...modal, country: { ...modal.country, name: e.target.value } });
                  }}
                  placeholder="Ex: France, Côte d'Ivoire"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={submitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code ISO (3 caractères) *
                </label>
                <input
                  value={modal.country.code}
                  onChange={(e) => {
                    const newCode = e.target.value.toUpperCase().slice(0, 3);
                    console.log('📝 Changement code:', newCode);
                    setModal({ ...modal, country: { ...modal.country, code: newCode } });
                  }}
                  placeholder="Ex: FRA, CIV, USA"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                  required
                  maxLength={3}
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500 mt-1">Code ISO 3166-1 alpha-3 (3 lettres)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indicatif téléphonique *
                </label>
                <input
                  value={modal.country.phone_prefix}
                  onChange={(e) => {
                    console.log('📝 Changement indicatif:', e.target.value);
                    setModal({ ...modal, country: { ...modal.country, phone_prefix: e.target.value } });
                  }}
                  placeholder="Ex: +33, +225, +1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={submitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Devise *
                </label>
                <select
                  value={modal.country.currency_id || ''}
                  onChange={(e) => {
                    const currencyId = e.target.value ? parseInt(e.target.value) : null;
                    console.log('📝 Changement devise:', currencyId);
                    setModal({ 
                      ...modal, 
                      country: { 
                        ...modal.country, 
                        currency_id: currencyId
                      } 
                    });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={submitting}
                >
                  <option value="">Sélectionnez une devise</option>
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code} - {currency.name} ({currency.symbol})
                    </option>
                  ))}
                </select>
              </div>
              
              {modal.mode === "edit" && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={modal.country.is_active}
                    onChange={(e) => {
                      console.log('📝 Changement statut:', e.target.checked);
                      setModal({ ...modal, country: { ...modal.country, is_active: e.target.checked } });
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    disabled={submitting}
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Pays actif
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button 
                type="button" 
                onClick={() => {
                  if (!submitting) {
                    console.log('❌ Annulation modal');
                    setModal(null);
                  }
                }}
                disabled={submitting}
                className={`px-4 py-2 border border-gray-300 rounded-lg text-gray-700 transition-colors ${
                  submitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
              >
                Annuler
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className={`bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  submitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {modal.mode === "add" ? "Création..." : "Modification..."}
                  </>
                ) : (
                  modal.mode === "add" ? "Créer" : "Modifier"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}