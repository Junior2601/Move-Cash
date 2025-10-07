import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Send, ArrowRight, Check, AlertCircle, RefreshCw } from 'lucide-react';

export default function TransactionForm({ onTransactionComplete }) {
  const [formData, setFormData] = useState({
    senderCountryId: '',
    senderPhone: '',
    senderPaymentMethodId: '',
    receiverCountryId: '',
    receiverPhone: '',
    receiverPaymentMethodId: '',
    sentAmount: ''
  });

  const [receivedAmount, setReceivedAmount] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries, setCountries] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const navigate = useNavigate();

  // Charger les pays et méthodes de paiement
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      
      console.log('🔄 Chargement des pays...');
      
      // Essayer d'abord l'endpoint /countries (plus stable)
      let countriesResponse;
      try {
        countriesResponse = await api.get('/country');
        console.log('✅ Pays chargés via /country:', countriesResponse.data.length);
      } catch (mainError) {
        console.log('❌ Erreur /country, essai /active...');
        try {
          countriesResponse = await api.get('/country/active');
          console.log('✅ Pays chargés via /active:', countriesResponse.data.length);
        } catch (activeError) {
          console.error('❌ Les deux endpoints ont échoué:', activeError);
          throw new Error('Impossible de charger la liste des pays');
        }
      }
      
      if (!countriesResponse.data || countriesResponse.data.length === 0) {
        throw new Error('Aucun pays disponible');
      }
      
      setCountries(countriesResponse.data);

      // Charger les méthodes de paiement pour chaque pays
      console.log('🔄 Chargement des méthodes de paiement...');
      const methodsByCountry = {};
      const countryIds = countriesResponse.data.map(country => country.id);
      
      // Charger en parallèle avec timeout réduit
      const paymentMethodPromises = countryIds.map(async (countryId) => {
        try {
          const methodsResponse = await api.get(`/payment_method/country/${countryId}`, {
            timeout: 5000
          });
          methodsByCountry[countryId] = methodsResponse.data || [];
        } catch (error) {
          console.warn(`⚠️ Erreur méthodes pour pays ${countryId}:`, error.message);
          methodsByCountry[countryId] = [];
        }
      });

      await Promise.allSettled(paymentMethodPromises);
      setPaymentMethods(methodsByCountry);
      
    } catch (error) {
      console.error('💥 Erreur lors du chargement des données:', error);
      setLoadError(error.message || 'Erreur de chargement des données');
      setCountries([]);
      setPaymentMethods({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Recharger les données
  const handleRetry = () => {
    fetchData();
  };

  // Fonctions utilitaires
  const getCountryById = (id) => {
    return countries.find(country => country.id === parseInt(id));
  };

  const getPaymentMethodsByCountryId = (countryId) => {
    return paymentMethods[countryId] || [];
  };

  const senderCountry = getCountryById(formData.senderCountryId);
  const receiverCountry = getCountryById(formData.receiverCountryId);
  const senderPaymentMethods = getPaymentMethodsByCountryId(formData.senderCountryId);
  const receiverPaymentMethods = getPaymentMethodsByCountryId(formData.receiverCountryId);

  // Calculer le taux de change - VERSION SIMPLIFIÉE
  useEffect(() => {
    if (formData.sentAmount && formData.sentAmount > 0 && formData.senderCountryId && formData.receiverCountryId) {
      const calculateExchangeRate = async () => {
        try {
          console.log('🔄 Calcul du taux de change...');
          
          // ESSAYER L'ENDPOINT RATES
          try {
            const response = await api.get('/rate', {
              params: {
                from_country: formData.senderCountryId,
                to_country: formData.receiverCountryId
              },
              timeout: 3000
            });
            
            if (response.data && response.data.rate) {
              const rate = parseFloat(response.data.rate);
              console.log('✅ Taux de change API:', rate);
              setExchangeRate(rate);
              setReceivedAmount(formData.sentAmount * rate);
              return;
            }
          } catch (rateError) {
            console.warn('⚠️ Endpoint /rates non disponible:', rateError.message);
          }
          
          // ESSAYER L'ENDPOINT ACTIVE RATES
          try {
            const activeRatesResponse = await api.get('/rate/active', {
              timeout: 3000
            });
            
            if (activeRatesResponse.data && Array.isArray(activeRatesResponse.data)) {
              const rateData = activeRatesResponse.data.find(rate => 
                rate.from_country_id === parseInt(formData.senderCountryId) && 
                rate.to_country_id === parseInt(formData.receiverCountryId)
              );
              
              if (rateData && rateData.rate) {
                const rate = parseFloat(rateData.rate);
                console.log('✅ Taux de change trouvé dans rate/active:', rate);
                setExchangeRate(rate);
                setReceivedAmount(formData.sentAmount * rate);
                return;
              }
            }
          } catch (activeRatesError) {
            console.warn('⚠️ Endpoint /rate/active non disponible:', activeRatesError.message);
          }
          
          // TAUX PAR DÉFAUT basé sur les devises
          const defaultRate = getDefaultExchangeRate(senderCountry, receiverCountry);
          console.log('💰 Taux par défaut appliqué:', defaultRate);
          setExchangeRate(defaultRate);
          setReceivedAmount(formData.sentAmount * defaultRate);
          
        } catch (error) {
          console.warn('⚠️ Erreur calcul taux, utilisation valeur par défaut:', error.message);
          const defaultRate = getDefaultExchangeRate(senderCountry, receiverCountry);
          setExchangeRate(defaultRate);
          setReceivedAmount(formData.sentAmount * defaultRate);
        }
      };
      
      calculateExchangeRate();
    } else {
      setReceivedAmount(0);
      setExchangeRate(0);
    }
  }, [formData.sentAmount, formData.senderCountryId, formData.receiverCountryId, senderCountry, receiverCountry]);

  // Fonction pour obtenir un taux par défaut basé sur les devises
  const getDefaultExchangeRate = (fromCountry, toCountry) => {
    if (!fromCountry || !toCountry) return 0.85;
    
    // Taux fictifs basés sur les paires de devises courantes
    const rateMap = {
      'EUR-USD': 1.08,
      'USD-EUR': 0.93,
      'EUR-XOF': 655.96,
      'XOF-EUR': 0.00152,
      'USD-XOF': 600.0,
      'XOF-USD': 0.00167,
    };
    
    const pair = `${fromCountry.currency_code}-${toCountry.currency_code}`;
    return rateMap[pair] || 0.85;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.senderCountryId) newErrors.senderCountryId = 'Sélectionnez le pays d\'envoi';
    if (!formData.receiverCountryId) newErrors.receiverCountryId = 'Sélectionnez le pays de réception';
    if (!formData.senderPhone?.trim()) newErrors.senderPhone = 'Numéro d\'envoi requis';
    if (!formData.receiverPhone?.trim()) newErrors.receiverPhone = 'Numéro de réception requis';
    if (!formData.senderPaymentMethodId) newErrors.senderPaymentMethodId = 'Sélectionnez le moyen d\'envoi';
    if (!formData.receiverPaymentMethodId) newErrors.receiverPaymentMethodId = 'Sélectionnez le moyen de réception';
    
    const amount = parseFloat(formData.sentAmount);
    if (!formData.sentAmount || isNaN(amount) || amount <= 0) {
      newErrors.sentAmount = 'Montant invalide';
    } else if (amount < 1) {
      newErrors.sentAmount = 'Le montant minimum est 1';
    }

    // Validation supplémentaire : pays différents
    if (formData.senderCountryId && formData.receiverCountryId && 
        formData.senderCountryId === formData.receiverCountryId) {
      newErrors.receiverCountryId = 'Le pays de réception doit être différent du pays d\'envoi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log('❌ Validation échouée:', errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const transactionData = {
        from_country_id: parseInt(formData.senderCountryId),
        to_country_id: parseInt(formData.receiverCountryId),
        sender_phone: formData.senderPhone.trim(),
        receiver_phone: formData.receiverPhone.trim(),
        sender_method_id: parseInt(formData.senderPaymentMethodId),
        receiver_method_id: parseInt(formData.receiverPaymentMethodId),
        send_amount: parseFloat(formData.sentAmount)
      };

      console.log('📤 Envoi transaction:', transactionData);

      const res = await api.post('/transactions', transactionData);
      
      console.log('✅ Réponse transaction:', res.data);

      // REDIRECTION VERS LA PAGE DE DÉTAIL
      if (res.data.data?.id) {
        console.log('🎯 Redirection vers transaction:', res.data.data.id);
        navigate(`/transaction/${res.data.data.id}`);
      } else if (res.data.id) {
        // Format alternatif
        navigate(`/transaction/${res.data.id}`);
      } else if (res.data.transaction?.id) {
        // Autre format possible
        navigate(`/transaction/${res.data.transaction.id}`);
      } else {
        console.warn('Structure de réponse inattendue:', res.data);
        
        // Essayer de récupérer l'ID via d'autres moyens
        let transactionId = null;
        
        if (res.data.data?.tracking_code) {
          // Essayer de trouver par tracking code
          try {
            const trackRes = await api.get(`/transactions/tracking/${res.data.data.tracking_code}`);
            if (trackRes.data.data?.id) {
              transactionId = trackRes.data.data.id;
            }
          } catch (trackError) {
            console.error('Erreur recherche par tracking:', trackError);
          }
        }
        
        if (transactionId) {
          navigate(`/transaction/${transactionId}`);
        } else {
          // Fallback - utiliser l'ancien comportement
          if (onTransactionComplete) {
            onTransactionComplete({
              ...res.data,
              sentAmount: formData.sentAmount,
              receivedAmount,
              exchangeRate
            });
          }
          
          const trackingCode = res.data.data?.tracking_code || res.data.tracking_code || 'N/A';
          alert(`Transaction créée ! Code suivi : ${trackingCode}\n\nMais impossible de rediriger vers la page de détail.`);
        }
      }
      
      // Réinitialiser le formulaire seulement si pas de redirection
      if (!res.data.data?.id && !res.data.id && !res.data.transaction?.id) {
        handleReset();
      }
      
    } catch (err) {
      console.error('❌ Erreur création transaction:', err);
      console.error('Détails erreur:', err.response?.data);
      
      let errorMessage = 'Erreur lors de la création de la transaction';
      let errorDetails = '';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      if (err.response?.data?.details) {
        errorDetails = err.response.data.details;
      }
      
      setErrors({ 
        general: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage 
      });
      
      alert(`Erreur: ${errorMessage}${errorDetails ? `\n\nDétails: ${errorDetails}` : ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Effacer les erreurs du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Effacer l'erreur générale
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
  };

  // Réinitialiser le formulaire
  const handleReset = () => {
    setFormData({
      senderCountryId: '',
      senderPhone: '',
      senderPaymentMethodId: '',
      receiverCountryId: '',
      receiverPhone: '',
      receiverPaymentMethodId: '',
      sentAmount: ''
    });
    setReceivedAmount(0);
    setExchangeRate(0);
    setErrors({});
  };

  const formatCurrency = (amount, currencyCode) => {
    if (!amount || amount === 0) return '0';
    
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode || 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      return `${amount} ${currencyCode || ''}`;
    }
  };

  // Fonction pour formater le numéro de téléphone avec le préfixe
  const formatPhoneNumber = (phone, country) => {
    if (!country || !country.phone_prefix || !phone) return phone;
    return `${country.phone_prefix} ${phone}`;
  };

  // Écran de chargement
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Chargement des données...</p>
        <p className="text-sm text-gray-500">Veuillez patienter</p>
      </div>
    );
  }

  // Écran d'erreur de chargement
  if (loadError && countries.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Erreur de chargement</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{loadError}</p>
        <button
          onClick={handleRetry}
          className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
        >
          <RefreshCw className="h-5 w-5" />
          <span>Réessayer</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-700 font-semibold">Erreur</p>
            <p className="text-red-600">{errors.general}</p>
          </div>
        </div>
      )}

      {loadError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-yellow-700 font-semibold">Avertissement</p>
            <p className="text-yellow-600">{loadError}</p>
            <button
              onClick={handleRetry}
              className="text-yellow-700 underline text-sm mt-1"
            >
              Actualiser les données
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section Expéditeur */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <Send className="h-5 w-5 text-blue-600 mr-2" />
              Expéditeur
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pays d'envoi *
              </label>
              <select
                value={formData.senderCountryId}
                onChange={(e) => handleInputChange('senderCountryId', e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.senderCountryId ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
              >
                <option value="">Sélectionner un pays</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>
                    {country.name} ({country.currency_code})
                  </option>
                ))}
              </select>
              {errors.senderCountryId && (
                <p className="mt-1 text-sm text-red-600">{errors.senderCountryId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro d'envoi *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500 text-sm font-medium">
                  {senderCountry?.phone_prefix || '+'}
                </span>
                <input
                  type="tel"
                  value={formData.senderPhone}
                  onChange={(e) => handleInputChange('senderPhone', e.target.value)}
                  placeholder="123456789"
                  className={`w-full pl-20 pr-4 py-3 rounded-lg border transition-colors ${
                    errors.senderPhone ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                />
              </div>
              {errors.senderPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.senderPhone}</p>
              )}
              {formData.senderPhone && senderCountry && (
                <p className="mt-1 text-xs text-gray-500">
                  Format: {formatPhoneNumber(formData.senderPhone, senderCountry)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Moyen d'envoi *
              </label>
              <select
                value={formData.senderPaymentMethodId}
                onChange={(e) => handleInputChange('senderPaymentMethodId', e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.senderPaymentMethodId ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                disabled={!formData.senderCountryId}
              >
                <option value="">Sélectionner un moyen</option>
                {senderPaymentMethods.length > 0 ? (
                  senderPaymentMethods.map(method => (
                    <option key={method.id} value={method.id}>
                      {method.method}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    {formData.senderCountryId ? 'Aucune méthode disponible' : 'Sélectionnez d\'abord un pays'}
                  </option>
                )}
              </select>
              {errors.senderPaymentMethodId && (
                <p className="mt-1 text-sm text-red-600">{errors.senderPaymentMethodId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant à envoyer *
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.sentAmount}
                  onChange={(e) => handleInputChange('sentAmount', e.target.value)}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  className={`w-full px-4 py-3 pr-20 rounded-lg border transition-colors ${
                    errors.sentAmount ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                />
                <span className="absolute right-3 top-3 text-gray-500 font-medium">
                  {senderCountry?.currency_code || 'EUR'}
                </span>
              </div>
              {errors.sentAmount && (
                <p className="mt-1 text-sm text-red-600">{errors.sentAmount}</p>
              )}
              {formData.sentAmount && (
                <p className="mt-1 text-xs text-gray-500">
                  Minimum: {formatCurrency(1, senderCountry?.currency_code)}
                </p>
              )}
            </div>
          </div>

          {/* Flèche de séparation */}
          <div className="hidden md:flex items-center justify-center">
            <div className="bg-blue-50 rounded-full p-4">
              <ArrowRight className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          {/* Section Bénéficiaire */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <Check className="h-5 w-5 text-green-600 mr-2" />
              Bénéficiaire
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pays de réception *
              </label>
              <select
                value={formData.receiverCountryId}
                onChange={(e) => handleInputChange('receiverCountryId', e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.receiverCountryId ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
              >
                <option value="">Sélectionner un pays</option>
                {countries
                  .filter(c => c.id !== parseInt(formData.senderCountryId))
                  .map(country => (
                    <option key={country.id} value={country.id}>
                      {country.name} ({country.currency_code})
                    </option>
                  ))
                }
              </select>
              {errors.receiverCountryId && (
                <p className="mt-1 text-sm text-red-600">{errors.receiverCountryId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de réception *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500 text-sm font-medium">
                  {receiverCountry?.phone_prefix || '+'}
                </span>
                <input
                  type="tel"
                  value={formData.receiverPhone}
                  onChange={(e) => handleInputChange('receiverPhone', e.target.value)}
                  placeholder="123456789"
                  className={`w-full pl-20 pr-4 py-3 rounded-lg border transition-colors ${
                    errors.receiverPhone ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                />
              </div>
              {errors.receiverPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.receiverPhone}</p>
              )}
              {formData.receiverPhone && receiverCountry && (
                <p className="mt-1 text-xs text-gray-500">
                  Format: {formatPhoneNumber(formData.receiverPhone, receiverCountry)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Moyen de réception *
              </label>
              <select
                value={formData.receiverPaymentMethodId}
                onChange={(e) => handleInputChange('receiverPaymentMethodId', e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.receiverPaymentMethodId ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                disabled={!formData.receiverCountryId}
              >
                <option value="">Sélectionner un moyen</option>
                {receiverPaymentMethods.length > 0 ? (
                  receiverPaymentMethods.map(method => (
                    <option key={method.id} value={method.id}>
                      {method.method}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    {formData.receiverCountryId ? 'Aucune méthode disponible' : 'Sélectionnez d\'abord un pays'}
                  </option>
                )}
              </select>
              {errors.receiverPaymentMethodId && (
                <p className="mt-1 text-sm text-red-600">{errors.receiverPaymentMethodId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant reçu
              </label>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">
                    {receiverCountry ? formatCurrency(receivedAmount, receiverCountry.currency_code) : '0'}
                  </span>
                  <span className="text-sm text-gray-500 font-medium">
                    {receiverCountry?.currency_code || ''}
                  </span>
                </div>
                {exchangeRate > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Taux: 1 {senderCountry?.currency_code} = {exchangeRate.toFixed(4)} {receiverCountry?.currency_code}
                    </p>
                    {exchangeRate === 0.85 && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ Taux par défaut utilisé
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Résumé de la transaction */}
        {(formData.sentAmount && formData.sentAmount > 0 && formData.senderCountryId && formData.receiverCountryId) && (
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h5 className="font-semibold text-blue-900 mb-4 flex items-center">
              <Check className="h-5 w-5 mr-2" />
              Résumé de la transaction
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded-lg p-4">
                <span className="text-gray-600 block mb-1">Envoyé:</span>
                <span className="font-semibold text-lg text-blue-900">
                  {senderCountry ? formatCurrency(parseFloat(formData.sentAmount), senderCountry.currency_code) : '0'}
                </span>
              </div>
              <div className="bg-white rounded-lg p-4">
                <span className="text-gray-600 block mb-1">Reçu:</span>
                <span className="font-semibold text-lg text-green-600">
                  {receiverCountry ? formatCurrency(receivedAmount, receiverCountry.currency_code) : '0'}
                </span>
              </div>
              <div className="bg-white rounded-lg p-4">
                <span className="text-gray-600 block mb-1">Frais:</span>
                <span className="font-semibold text-lg text-gray-900">
                  {senderCountry ? formatCurrency(0, senderCountry.currency_code) : '0'}
                </span>
                <p className="text-xs text-gray-500 mt-1">Aucun frais supplémentaire</p>
              </div>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Réinitialiser
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting || Object.keys(errors).length > 0}
            className="flex-1 flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Création en cours...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Initier le Transfert</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}