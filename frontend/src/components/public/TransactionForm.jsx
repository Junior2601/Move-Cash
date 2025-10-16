import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Send, ArrowRight, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { 
  validatePhoneNumber, 
  getPhoneFormatExamples,
  formatPhoneWithPrefix 
} from '../../utils/phoneValidator';
import { encryptId } from '../../utils/encryption'; // Import du service de chiffrement

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
  
  // États pour la validation en temps réel
  const [phoneValidation, setPhoneValidation] = useState({
    sender: { isValid: false, message: '', examples: [], touched: false },
    receiver: { isValid: false, message: '', examples: [], touched: false }
  });

  const navigate = useNavigate();

  // Charger les pays et méthodes de paiement
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      
      console.log('🔄 Chargement des pays...');
      
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

  // Valider le numéro d'envoi quand le pays ou le numéro change
  useEffect(() => {
    if (formData.senderCountryId && formData.senderPhone) {
      const senderCountry = getCountryById(formData.senderCountryId);
      if (senderCountry && senderCountry.phone_prefix) {
        const validation = validatePhoneNumber(
          formData.senderPhone, 
          null, 
          senderCountry.phone_prefix
        );
        setPhoneValidation(prev => ({
          ...prev,
          sender: { ...validation, touched: true }
        }));
      }
    } else {
      setPhoneValidation(prev => ({
        ...prev,
        sender: { isValid: false, message: '', examples: [], touched: !!formData.senderPhone }
      }));
    }
  }, [formData.senderPhone, formData.senderCountryId]);

  // Valider le numéro de réception quand le pays ou le numéro change
  useEffect(() => {
    if (formData.receiverCountryId && formData.receiverPhone) {
      const receiverCountry = getCountryById(formData.receiverCountryId);
      if (receiverCountry && receiverCountry.phone_prefix) {
        const validation = validatePhoneNumber(
          formData.receiverPhone, 
          null, 
          receiverCountry.phone_prefix
        );
        setPhoneValidation(prev => ({
          ...prev,
          receiver: { ...validation, touched: true }
        }));
      }
    } else {
      setPhoneValidation(prev => ({
        ...prev,
        receiver: { isValid: false, message: '', examples: [], touched: !!formData.receiverPhone }
      }));
    }
  }, [formData.receiverPhone, formData.receiverCountryId]);

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

  // Calculer le taux de change
  useEffect(() => {
    if (formData.sentAmount && formData.sentAmount > 0 && formData.senderCountryId && formData.receiverCountryId) {
      const calculateExchangeRate = async () => {
        try {
          console.log('🔄 Calcul du taux de change...');
          
          const senderCountry = getCountryById(formData.senderCountryId);
          const receiverCountry = getCountryById(formData.receiverCountryId);
          
          if (!senderCountry || !receiverCountry) {
            console.warn('❌ Pays non trouvés');
            const defaultRate = 0.85;
            setExchangeRate(defaultRate);
            setReceivedAmount(formData.sentAmount * defaultRate);
            return;
          }

          console.log('💱 Pays sélectionnés:', {
            from: senderCountry.name,
            to: receiverCountry.name,
            from_currency: senderCountry.currency_code,
            to_currency: receiverCountry.currency_code
          });

          // ESSAYER LE NOUVEL ENDPOINT COUNTRIES
          try {
            console.log('🌐 Appel endpoint /rate/countries...');
            const response = await api.get(`/rate/countries/${formData.senderCountryId}/${formData.receiverCountryId}`);
            
            if (response.data && response.data.success && response.data.data) {
              const rate = parseFloat(response.data.data.rate);
              console.log('✅ Taux de change API (countries):', rate);
              setExchangeRate(rate);
              setReceivedAmount(formData.sentAmount * rate);
              return;
            }
          } catch (countriesError) {
            console.warn('⚠️ Endpoint /rate/countries non disponible:', countriesError.message);
          }

          // ESSAYER L'ENDPOINT ACTIVE RATES (fallback)
          try {
            console.log('🌐 Appel endpoint /rate/active...');
            const activeRatesResponse = await api.get('/rate/active');
            
            if (activeRatesResponse.data && Array.isArray(activeRatesResponse.data)) {
              // Chercher le taux correspondant aux devises des pays
              const rateData = activeRatesResponse.data.find(rate => 
                rate.from_currency_code === senderCountry.currency_code && 
                rate.to_currency_code === receiverCountry.currency_code
              );
              
              if (rateData && rateData.rate) {
                const rate = parseFloat(rateData.rate);
                console.log('✅ Taux de change trouvé dans /active:', rate);
                setExchangeRate(rate);
                setReceivedAmount(formData.sentAmount * rate);
                return;
              }
            }
          } catch (activeRatesError) {
            console.warn('⚠️ Endpoint /rate/active non disponible:', activeRatesError.message);
          }

          // ESSAYER L'ENDPOINT GÉNÉRIQUE
          try {
            console.log('🌐 Appel endpoint /rate...');
            const genericResponse = await api.get('/rate', {
              params: {
                from_country: formData.senderCountryId,
                to_country: formData.receiverCountryId
              }
            });
            
            if (genericResponse.data && genericResponse.data.success && genericResponse.data.data) {
              const rate = parseFloat(genericResponse.data.data.rate);
              console.log('✅ Taux de change API (générique):', rate);
              setExchangeRate(rate);
              setReceivedAmount(formData.sentAmount * rate);
              return;
            }
          } catch (genericError) {
            console.warn('⚠️ Endpoint /rate non disponible:', genericError.message);
          }
          
          // TAUX PAR DÉFAUT
          const defaultRate = getDefaultExchangeRate(senderCountry, receiverCountry);
          console.log('💰 Taux par défaut appliqué:', defaultRate);
          setExchangeRate(defaultRate);
          setReceivedAmount(formData.sentAmount * defaultRate);
          
        } catch (error) {
          console.warn('⚠️ Erreur calcul taux, utilisation valeur par défaut:', error.message);
          const senderCountry = getCountryById(formData.senderCountryId);
          const receiverCountry = getCountryById(formData.receiverCountryId);
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
  }, [formData.sentAmount, formData.senderCountryId, formData.receiverCountryId]);

  // Fonction pour obtenir un taux par défaut basé sur les devises
  const getDefaultExchangeRate = (fromCountry, toCountry) => {
    if (!fromCountry || !toCountry) return 0.85;
    
    const fromCurrency = fromCountry.currency_code || 'EUR';
    const toCurrency = toCountry.currency_code || 'EUR';
    
    const rateMap = {
      'EUR-USD': 1.08,
      'USD-EUR': 0.93,
      'EUR-XOF': 655.96,
      'XOF-EUR': 0.00152,
      'USD-XOF': 600.0,
      'XOF-USD': 0.00167,
      'EUR-CFA': 655.96,
      'CFA-EUR': 0.00152,
      'USD-CFA': 600.0,
      'CFA-USD': 0.00167,
      'XOF-XOF': 1.0,
      'EUR-EUR': 1.0,
      'USD-USD': 1.0,
    };
    
    const pair = `${fromCurrency}-${toCurrency}`;
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

    // Validation des numéros de téléphone
    if (formData.senderPhone && formData.senderCountryId && !phoneValidation.sender.isValid && phoneValidation.sender.touched) {
      newErrors.senderPhone = phoneValidation.sender.message;
    }

    if (formData.receiverPhone && formData.receiverCountryId && !phoneValidation.receiver.isValid && phoneValidation.receiver.touched) {
      newErrors.receiverPhone = phoneValidation.receiver.message;
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
      // Formater les numéros de téléphone avec les préfixes
      const formattedSenderPhone = senderCountry ? 
        formatPhoneWithPrefix(formData.senderPhone, senderCountry) : 
        formData.senderPhone.trim();
      
      const formattedReceiverPhone = receiverCountry ? 
        formatPhoneWithPrefix(formData.receiverPhone, receiverCountry) : 
        formData.receiverPhone.trim();

      const transactionData = {
        from_country_id: parseInt(formData.senderCountryId),
        to_country_id: parseInt(formData.receiverCountryId),
        sender_phone: formattedSenderPhone,
        receiver_phone: formattedReceiverPhone,
        sender_method_id: parseInt(formData.senderPaymentMethodId),
        receiver_method_id: parseInt(formData.receiverPaymentMethodId),
        send_amount: parseFloat(formData.sentAmount)
      };

      console.log('📤 Envoi transaction:', transactionData);

      const res = await api.post('/transactions', transactionData);
      
      console.log('✅ Réponse transaction:', res.data);

      // REDIRECTION VERS LA PAGE DE DÉTAIL AVEC ID CHIFFRÉ
      if (res.data.data?.id) {
        const transactionId = res.data.data.id;
        const encryptedId = encryptId(transactionId);
        
        if (encryptedId) {
          console.log('🎯 Redirection vers transaction chiffrée:', { id: transactionId, encrypted: encryptedId });
          navigate(`/transaction/${encryptedId}`);
        } else {
          console.error('❌ Erreur de chiffrement, redirection sans chiffrement');
          navigate(`/transaction/${transactionId}`);
        }
      } else if (res.data.id) {
        // Format alternatif
        const transactionId = res.data.id;
        const encryptedId = encryptId(transactionId);
        
        if (encryptedId) {
          navigate(`/transaction/${encryptedId}`);
        } else {
          navigate(`/transaction/${transactionId}`);
        }
      } else if (res.data.transaction?.id) {
        // Autre format possible
        const transactionId = res.data.transaction.id;
        const encryptedId = encryptId(transactionId);
        
        if (encryptedId) {
          navigate(`/transaction/${encryptedId}`);
        } else {
          navigate(`/transaction/${transactionId}`);
        }
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
              const encryptedId = encryptId(transactionId);
              
              if (encryptedId) {
                navigate(`/transaction/${encryptedId}`);
                return;
              }
            }
          } catch (trackError) {
            console.error('Erreur recherche par tracking:', trackError);
          }
        }
        
        if (transactionId) {
          const encryptedId = encryptId(transactionId);
          navigate(`/transaction/${encryptedId || transactionId}`);
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
    setPhoneValidation({
      sender: { isValid: false, message: '', examples: [], touched: false },
      receiver: { isValid: false, message: '', examples: [], touched: false }
    });
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
                    {country.name} ({country.currency_code}) - {country.phone_prefix}
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
                  placeholder={senderCountry ? getPhoneFormatExamples(null, senderCountry.phone_prefix)[0] : "123456789"}
                  className={`w-full pl-20 pr-4 py-3 rounded-lg border transition-colors ${
                    (errors.senderPhone || (phoneValidation.sender.touched && !phoneValidation.sender.isValid)) 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                />
              </div>
              {errors.senderPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.senderPhone}</p>
              )}
              {!errors.senderPhone && phoneValidation.sender.touched && !phoneValidation.sender.isValid && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {phoneValidation.sender.message}
                </p>
              )}
              {phoneValidation.sender.touched && phoneValidation.sender.isValid && (
                <p className="mt-1 text-xs text-green-600 flex items-center">
                  <Check className="h-3 w-3 mr-1" />
                  Format valide pour {senderCountry?.name}
                </p>
              )}
              {formData.senderCountryId && senderCountry && (
                <p className="mt-1 text-xs text-gray-500">
                  Format: {phoneValidation.sender.examples?.join(', ') || getPhoneFormatExamples(null, senderCountry.phone_prefix).join(', ')}
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
                      {country.name} ({country.currency_code}) - {country.phone_prefix}
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
                  placeholder={receiverCountry ? getPhoneFormatExamples(null, receiverCountry.phone_prefix)[0] : "123456789"}
                  className={`w-full pl-20 pr-4 py-3 rounded-lg border transition-colors ${
                    (errors.receiverPhone || (phoneValidation.receiver.touched && !phoneValidation.receiver.isValid)) 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                />
              </div>
              {errors.receiverPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.receiverPhone}</p>
              )}
              {!errors.receiverPhone && phoneValidation.receiver.touched && !phoneValidation.receiver.isValid && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {phoneValidation.receiver.message}
                </p>
              )}
              {phoneValidation.receiver.touched && phoneValidation.receiver.isValid && (
                <p className="mt-1 text-xs text-green-600 flex items-center">
                  <Check className="h-3 w-3 mr-1" />
                  Format valide pour {receiverCountry?.name}
                </p>
              )}
              {formData.receiverCountryId && receiverCountry && (
                <p className="mt-1 text-xs text-gray-500">
                  Format: {phoneValidation.receiver.examples?.join(', ') || getPhoneFormatExamples(null, receiverCountry.phone_prefix).join(', ')}
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
            disabled={isSubmitting || Object.keys(errors).length > 0 || !phoneValidation.sender.isValid || !phoneValidation.receiver.isValid}
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