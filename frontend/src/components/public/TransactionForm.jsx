import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { Send, ArrowRight, Check, AlertCircle } from 'lucide-react';

export default function TransactionForm({ onTransactionComplete }) {
  const [formData, setFormData] = useState({
    senderCountryId: '',
    senderPhone: '',
    senderPaymentMethodId: '',
    receiverCountryId: '',
    receiverPhone: '',
    receiverPaymentMethodId: '',
    sentAmount: 0
  });

  const [receivedAmount, setReceivedAmount] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries, setCountries] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Charger les pays et méthodes de paiement
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Essayer d'abord l'endpoint /active
        let countriesResponse;
        try {
          countriesResponse = await api.get('/country/active');
        } catch (activeError) {
          console.log('Endpoint /active non trouvé, utilisation de /countries');
          countriesResponse = await api.get('/country');
        }
        
        setCountries(countriesResponse.data || []);

        // Charger les méthodes de paiement pour chaque pays
        const methodsByCountry = {};
        for (const country of countriesResponse.data) {
          try {
            // CORRECTION : Utiliser le bon endpoint
            const methodsResponse = await api.get(`/payment_method/country/${country.id}`);
            methodsByCountry[country.id] = methodsResponse.data || [];
          } catch (error) {
            console.error(`Erreur lors du chargement des méthodes pour ${country.name}:`, error);
            methodsByCountry[country.id] = [];
          }
        }
        setPaymentMethods(methodsByCountry);
        
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setCountries([]);
        setPaymentMethods({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Charger les méthodes de paiement quand un pays est sélectionné
  useEffect(() => {
    const loadPaymentMethods = async (countryId) => {
      if (!countryId) return;
      
      try {
        // CORRECTION : Utiliser le bon endpoint
        const response = await api.get(`/payment_method/country/${countryId}`);
        setPaymentMethods(prev => ({
          ...prev,
          [countryId]: response.data
        }));
      } catch (error) {
        console.error(`Erreur lors du chargement des méthodes pour le pays ${countryId}:`, error);
        setPaymentMethods(prev => ({
          ...prev,
          [countryId]: []
        }));
      }
    };

    if (formData.senderCountryId) {
      loadPaymentMethods(formData.senderCountryId);
    }
    
    if (formData.receiverCountryId) {
      loadPaymentMethods(formData.receiverCountryId);
    }
  }, [formData.senderCountryId, formData.receiverCountryId]);

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
    if (formData.sentAmount > 0 && formData.senderCountryId && formData.receiverCountryId) {
      const fetchExchangeRate = async () => {
        try {
          // Essayer d'abord l'endpoint rates
          const response = await api.get('/rates', {
            params: {
              from_country: formData.senderCountryId,
              to_country: formData.receiverCountryId
            }
          });
          const rate = response.data.rate || 0.85;
          setExchangeRate(rate);
          setReceivedAmount(formData.sentAmount * rate);
        } catch (error) {
          console.error('Erreur lors du calcul du taux:', error);
          // Taux fictif en cas d'erreur
          const rate = 0.85;
          setExchangeRate(rate);
          setReceivedAmount(formData.sentAmount * rate);
        }
      };
      
      fetchExchangeRate();
    } else {
      setReceivedAmount(0);
      setExchangeRate(0);
    }
  }, [formData.sentAmount, formData.senderCountryId, formData.receiverCountryId]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.senderCountryId) newErrors.senderCountryId = 'Sélectionnez le pays d\'envoi';
    if (!formData.receiverCountryId) newErrors.receiverCountryId = 'Sélectionnez le pays de réception';
    if (!formData.senderPhone.trim()) newErrors.senderPhone = 'Numéro d\'envoi requis';
    if (!formData.receiverPhone.trim()) newErrors.receiverPhone = 'Numéro de réception requis';
    if (!formData.senderPaymentMethodId) newErrors.senderPaymentMethodId = 'Sélectionnez le moyen d\'envoi';
    if (!formData.receiverPaymentMethodId) newErrors.receiverPaymentMethodId = 'Sélectionnez le moyen de réception';
    if (formData.sentAmount <= 0) newErrors.sentAmount = 'Montant invalide';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const transactionData = {
        from_country_id: parseInt(formData.senderCountryId),
        to_country_id: parseInt(formData.receiverCountryId),
        sender_phone: formData.senderPhone,
        receiver_phone: formData.receiverPhone,
        sender_method_id: parseInt(formData.senderPaymentMethodId),
        receiver_method_id: parseInt(formData.receiverPaymentMethodId),
        send_amount: formData.sentAmount
      };

      const res = await api.post('/transactions', transactionData);
      
      if (onTransactionComplete) {
        onTransactionComplete({
          ...res.data,
          sentAmount: formData.sentAmount,
          receivedAmount,
          exchangeRate
        });
      }
      
      alert(`Transaction créée ! Code suivi : ${res.data.tracking_code}`);
      
      // Réinitialiser le formulaire
      setFormData({
        senderCountryId: '',
        senderPhone: '',
        senderPaymentMethodId: '',
        receiverCountryId: '',
        receiverPhone: '',
        receiverPaymentMethodId: '',
        sentAmount: 0
      });
      setReceivedAmount(0);
      setExchangeRate(0);
      
    } catch (err) {
      console.error(err);
      setErrors({ general: 'Erreur lors de la création de la transaction' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Effacer l'erreur du champ quand l'utilisateur commence à taper
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCurrency = (amount, currencyCode) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyCode || 'EUR'
    }).format(amount);
  };

  // Fonction pour formater le numéro de téléphone avec le préfixe
  const formatPhoneNumber = (phone, country) => {
    if (!country || !country.phone_prefix) return phone;
    return `${country.phone_prefix} ${phone}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Chargement des données...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-700">{errors.general}</p>
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
                Pays d'envoi
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
              {errors.senderCountryId && <p className="mt-1 text-sm text-red-600">{errors.senderCountryId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro d'envoi
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">
                  {senderCountry?.phone_prefix || '+'}
                </span>
                <input
                  type="tel"
                  value={formData.senderPhone}
                  onChange={(e) => handleInputChange('senderPhone', e.target.value)}
                  placeholder="123456789"
                  className={`w-full pl-16 pr-4 py-3 rounded-lg border transition-colors ${
                    errors.senderPhone ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                />
              </div>
              {errors.senderPhone && <p className="mt-1 text-sm text-red-600">{errors.senderPhone}</p>}
              {formData.senderPhone && senderCountry && (
                <p className="mt-1 text-xs text-gray-500">
                  Format: {formatPhoneNumber(formData.senderPhone, senderCountry)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Moyen d'envoi
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
              {errors.senderPaymentMethodId && <p className="mt-1 text-sm text-red-600">{errors.senderPaymentMethodId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant à envoyer
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.sentAmount || ''}
                  onChange={(e) => handleInputChange('sentAmount', Number(e.target.value))}
                  placeholder="0"
                  min="1"
                  step="0.01"
                  className={`w-full px-4 py-3 pr-20 rounded-lg border transition-colors ${
                    errors.sentAmount ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                />
                <span className="absolute right-3 top-3 text-gray-500">
                  {senderCountry?.currency_code || ''}
                </span>
              </div>
              {errors.sentAmount && <p className="mt-1 text-sm text-red-600">{errors.sentAmount}</p>}
            </div>
          </div>

          {/* Flèche */}
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="h-8 w-8 text-blue-600" />
          </div>

          {/* Section Bénéficiaire */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <Check className="h-5 w-5 text-green-600 mr-2" />
              Bénéficiaire
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pays de réception
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
              {errors.receiverCountryId && <p className="mt-1 text-sm text-red-600">{errors.receiverCountryId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de réception
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">
                  {receiverCountry?.phone_prefix || '+'}
                </span>
                <input
                  type="tel"
                  value={formData.receiverPhone}
                  onChange={(e) => handleInputChange('receiverPhone', e.target.value)}
                  placeholder="123456789"
                  className={`w-full pl-16 pr-4 py-3 rounded-lg border transition-colors ${
                    errors.receiverPhone ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                />
              </div>
              {errors.receiverPhone && <p className="mt-1 text-sm text-red-600">{errors.receiverPhone}</p>}
              {formData.receiverPhone && receiverCountry && (
                <p className="mt-1 text-xs text-gray-500">
                  Format: {formatPhoneNumber(formData.receiverPhone, receiverCountry)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Moyen de réception
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
              {errors.receiverPaymentMethodId && <p className="mt-1 text-sm text-red-600">{errors.receiverPaymentMethodId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant reçu
              </label>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border">
                <span className="text-lg font-semibold text-gray-900">
                  {receiverCountry ? formatCurrency(receivedAmount, receiverCountry.currency_code) : '0'}
                </span>
                {exchangeRate > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Taux: 1 {senderCountry?.currency_code} = {exchangeRate.toFixed(4)} {receiverCountry?.currency_code}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Résumé de la transaction */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h5 className="font-semibold text-blue-900 mb-2">Résumé de la transaction</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Envoyé:</span>
              <span className="font-semibold ml-2">
                {senderCountry ? formatCurrency(formData.sentAmount, senderCountry.currency_code) : '0'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Reçu:</span>
              <span className="font-semibold ml-2 text-green-600">
                {receiverCountry ? formatCurrency(receivedAmount, receiverCountry.currency_code) : '0'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Frais:</span>
              <span className="font-semibold ml-2">
                {senderCountry ? formatCurrency(0, senderCountry.currency_code) : '0'}
              </span>
            </div>
          </div>
        </div>

        {/* Bouton de soumission */}
        <button
          type="submit"
          disabled={isSubmitting || Object.keys(errors).length > 0}
          className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Traitement...</span>
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              <span>Initier le Transfert</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}