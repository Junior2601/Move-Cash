import React, { useState } from "react";
import api from "../../api/api";
import { Search, CheckCircle, Clock, XCircle, AlertCircle, Package, User } from 'lucide-react';

export default function TrackingForm() {
  const [trackingCode, setTrackingCode] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'En attente':
        return <Clock className="h-8 w-8 text-yellow-600" />;
      case 'Effectuée':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'Échouée':
        return <XCircle className="h-8 w-8 text-red-600" />;
      case 'Expirée':
        return <AlertCircle className="h-8 w-8 text-gray-600" />;
      default:
        return <Package className="h-8 w-8 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'En attente':
        return 'yellow';
      case 'Effectuée':
        return 'green';
      case 'Échouée':
        return 'red';
      case 'Expirée':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    
    if (!trackingCode.trim()) return;
    
    setIsSearching(true);
    
    try {
      const res = await api.get(`/transactions/tracking/${trackingCode}`);
      setSearchResult(res.data);
    } catch (err) {
      setSearchResult('not_found');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Search className="h-5 w-5 text-blue-600 mr-2" />
          Rechercher une Transaction
        </h4>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="Entrez votre code de suivi (ex: TRF123ABC456)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!trackingCode.trim() || isSearching}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Recherche...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Rechercher</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResult && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {searchResult === 'not_found' ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h5 className="text-lg font-semibold text-gray-900 mb-2">Transaction Introuvable</h5>
              <p className="text-gray-600">
                Aucune transaction trouvée avec ce code. Vérifiez que vous avez saisi le bon code de suivi.
              </p>
            </div>
          ) : (
            <div>
              {/* Status Header */}
              <div className={`bg-${getStatusColor(searchResult.status)}-50 px-6 py-4 border-b border-${getStatusColor(searchResult.status)}-200`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(searchResult.status)}
                    <div>
                      <h5 className="text-lg font-semibold text-gray-900">
                        {searchResult.status}
                      </h5>
                      <p className="text-sm text-gray-600">
                        Code: {searchResult.trackingCode || trackingCode}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Créée le</p>
                    <p className="text-sm font-medium text-gray-900">
                      {searchResult.createdAt ? new Date(searchResult.createdAt).toLocaleString('fr-FR') : new Date().toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sender Info */}
                  <div className="space-y-4">
                    <h6 className="font-semibold text-gray-900 flex items-center">
                      <User className="h-4 w-4 text-blue-600 mr-2" />
                      Expéditeur
                    </h6>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Pays</span>
                        <p className="font-medium">{searchResult.country_from || 'Non spécifié'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Montant</span>
                        <p className="font-medium">
                          {searchResult.amount ? formatCurrency(searchResult.amount, getCountryByCode(searchResult.country_from)?.currency || '') : 'Non spécifié'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Receiver Info */}
                  <div className="space-y-4">
                    <h6 className="font-semibold text-gray-900 flex items-center">
                      <User className="h-4 w-4 text-green-600 mr-2" />
                      Bénéficiaire
                    </h6>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Pays</span>
                        <p className="font-medium">{searchResult.country_to || 'Non spécifié'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Montant reçu</span>
                        <p className="font-medium text-green-600">
                          {searchResult.amount ? formatCurrency(searchResult.amount, getCountryByCode(searchResult.country_to)?.currency || '') : 'Non spécifié'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Messages */}
                {searchResult.status === 'En attente' && (
                  <div className="mt-6 bg-yellow-50 rounded-lg p-4">
                    <h6 className="font-semibold text-yellow-800 mb-3 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Transaction en Cours
                    </h6>
                    <p className="text-sm text-yellow-700">
                      Votre transaction est en attente de confirmation. L'agent procédera au transfert une fois le paiement reçu.
                    </p>
                  </div>
                )}

                {searchResult.status === 'Effectuée' && (
                  <div className="mt-6 bg-green-50 rounded-lg p-4">
                    <h6 className="font-semibold text-green-800 mb-3 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Transaction Terminée
                    </h6>
                    <p className="text-sm text-green-700">
                      Le bénéficiaire a reçu les fonds avec succès.
                    </p>
                  </div>
                )}

                {searchResult.status === 'Échouée' && (
                  <div className="mt-6 bg-red-50 rounded-lg p-4">
                    <h6 className="font-semibold text-red-800 mb-3 flex items-center">
                      <XCircle className="h-4 w-4 mr-2" />
                      Transaction Échouée
                    </h6>
                    <p className="text-sm text-red-700">
                      La transaction a échoué. Contactez le service client pour plus d'informations.
                    </p>
                  </div>
                )}

                {searchResult.status === 'Expirée' && (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <h6 className="font-semibold text-gray-800 mb-3 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Transaction Expirée
                    </h6>
                    <p className="text-sm text-gray-700">
                      Le délai de paiement a expiré. Créez une nouvelle transaction si nécessaire.
                    </p>
                  </div>
                )}

                {searchResult.status === 'Inexistante' && (
                  <div className="mt-6 bg-red-50 rounded-lg p-4">
                    <h6 className="font-semibold text-red-800 mb-3 flex items-center">
                      <XCircle className="h-4 w-4 mr-2" />
                      Transaction Non Trouvée
                    </h6>
                    <p className="text-sm text-red-700">
                      Aucune transaction correspondante n'a été trouvée. Vérifiez le code de suivi.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}