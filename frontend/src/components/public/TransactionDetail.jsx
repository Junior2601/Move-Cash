import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Clock, User, Phone, CreditCard, CheckCircle, AlertCircle, Copy, ArrowLeft } from 'lucide-react';

export default function TransactionDetail() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [isClientSideExpired, setIsClientSideExpired] = useState(false);

  // Fonction pour calculer le temps restant - VERSION CORRIGÉE UTC
  const calculateTimeLeft = (expiresAt) => {
    if (!expiresAt) return 0;
    
    // Les dates sont maintenant en UTC depuis le serveur corrigé
    const serverExpiresAt = new Date(expiresAt);
    const now = new Date();
    
    // Calculer la différence en secondes (les deux en UTC)
    const diff = Math.max(0, Math.floor((serverExpiresAt - now) / 1000));
    
    console.log('⏰ Calcul temps restant UTC:', {
      expires_at_server: expiresAt,
      expires_at_local: serverExpiresAt.toLocaleString(),
      now_local: now.toLocaleString(),
      diff_seconds: diff,
      diff_minutes: Math.floor(diff / 60)
    });
    
    return diff;
  };

  // Charger les détails de la transaction
  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/transactions/${transactionId}`);
      const transactionData = response.data.data;
      setTransaction(transactionData);
      
      console.log('📊 Données transaction reçues:', {
        id: transactionData.id,
        status: transactionData.status,
        expires_at: transactionData.expires_at,
        client_validated: transactionData.client_validated,
        now: new Date().toISOString(),
        expires_at_date: new Date(transactionData.expires_at).toISOString(),
        is_expired: new Date() > new Date(transactionData.expires_at)
      });

      // Calculer le temps restant seulement si la transaction est en attente
      if (transactionData.status === 'en_attente' && transactionData.expires_at) {
        const timeLeft = calculateTimeLeft(transactionData.expires_at);
        setTimeLeft(timeLeft);
        
        // Mettre à jour l'état d'expiration côté client
        setIsClientSideExpired(timeLeft <= 0);
        
        console.log('🕒 Temps restant calculé:', {
          id: transactionData.id,
          status: transactionData.status,
          expires_at: transactionData.expires_at,
          time_left_seconds: timeLeft,
          time_left_minutes: Math.floor(timeLeft / 60),
          is_client_side_expired: timeLeft <= 0
        });
      } else {
        setTimeLeft(0);
        setIsClientSideExpired(transactionData.status !== 'en_attente');
      }
    } catch (err) {
      console.error('Erreur chargement transaction:', err);
      setError('Transaction non trouvée');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransaction();
  }, [transactionId]);

  // Mettre à jour le compte à rebours seulement pour les transactions en attente
  useEffect(() => {
    if (timeLeft <= 0 || !transaction || transaction.status !== 'en_attente') {
      if (timeLeft <= 0 && transaction?.status === 'en_attente') {
        setIsClientSideExpired(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsClientSideExpired(true);
          // Recharger la transaction pour voir le statut "expirée"
          fetchTransaction();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, transaction]);

  // Debug effect
  useEffect(() => {
    console.log('🔍 DEBUG Transaction State:', {
      transaction,
      timeLeft,
      isPending: transaction?.status === 'en_attente',
      isClientSideExpired,
      expiresAt: transaction?.expires_at,
      now: new Date().toISOString(),
      expiresAtDate: transaction?.expires_at ? new Date(transaction.expires_at).toISOString() : null
    });
  }, [transaction, timeLeft, isClientSideExpired]);

  // Fonction pour copier le texte
  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      console.error('Erreur copie:', err);
    }
  };

  // Valider la transaction (confirmation client)
  const handleValidate = async () => {
    if (!transaction || transaction.status !== 'en_attente') return;

    try {
      setIsValidating(true);
      
      // Appeler l'endpoint de validation client
      await api.post(`/transactions/${transactionId}/client-validate`);
      
      // Recharger les données pour obtenir le statut mis à jour
      await fetchTransaction();
      
      // Arrêter le minuteur
      setTimeLeft(0);
      setIsClientSideExpired(false);
      
      alert('Transaction validée avec succès !');
    } catch (err) {
      console.error('Erreur validation:', err);
      alert(err.response?.data?.message || 'Erreur lors de la validation');
    } finally {
      setIsValidating(false);
    }
  };

  // Formater le temps
  const formatTime = (seconds) => {
    if (seconds <= 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Formater la devise
  const formatCurrency = (amount, currencyCode = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de la transaction...</p>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Transaction non trouvée</h2>
          <p className="text-gray-600 mb-6">{error || 'La transaction demandée n\'existe pas'}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const isExpired = transaction.status === 'expiree';
  const isCompleted = transaction.status === 'effectuee';
  const isFailed = transaction.status === 'echouee';
  const isPending = transaction.status === 'en_attente';
  const isClientValidated = transaction.client_validated;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Nouvelle transaction</span>
          </button>
          
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900">Détails de la transaction</h1>
            <p className="text-gray-600">Suivez votre transfert en temps réel</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Carte Statut et Timer */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Statut du transfert</h2>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isPending ? 'bg-yellow-100 text-yellow-800' :
                  isCompleted ? 'bg-green-100 text-green-800' :
                  isFailed ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {isPending ? 'En attente' : 
                   isCompleted ? 'Effectuée' : 
                   isFailed ? 'Échouée' : 'Expirée'}
                </div>
              </div>

              {isPending && !isClientSideExpired && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-6 w-6 text-yellow-600" />
                      <div>
                        <p className="font-semibold text-yellow-800">Temps restant</p>
                        <p className="text-2xl font-bold text-yellow-900">
                          {formatTime(timeLeft)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-yellow-700">Expire à</p>
                      <p className="font-semibold text-yellow-900">
                        {new Date(transaction.expires_at).toLocaleTimeString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-yellow-600">
                    ⏰ Système UTC activé - Expiration dans {formatTime(timeLeft)}
                  </div>
                </div>
              )}

              {(isClientSideExpired || isExpired) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                    <div>
                      <p className="font-semibold text-red-800">Transfert expiré</p>
                      <p className="text-red-700">Le délai de validation est dépassé.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Code de suivi */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700">Code de suivi</p>
                    <p className="text-xl font-bold text-blue-900 font-mono">
                      {transaction.tracking_code}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(transaction.tracking_code, 'tracking')}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    <span>{copiedField === 'tracking' ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Carte Instructions de Paiement */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Instructions de paiement
              </h2>

              <div className="space-y-4">
                {/* Agent assigné */}
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <User className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Agent assigné</p>
                    <p className="text-gray-700">{transaction.agent_name || 'Agent en attente'}</p>
                    {transaction.agent_email && (
                      <p className="text-sm text-gray-600">{transaction.agent_email}</p>
                    )}
                  </div>
                </div>

                {/* Numéro autorisé */}
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Numéro de paiement</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-bold text-gray-900 font-mono">
                        {transaction.authorized_number || 'Chargement...'}
                      </p>
                      <button
                        onClick={() => copyToClipboard(transaction.authorized_number, 'number')}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                      >
                        <Copy className="h-4 w-4" />
                        <span className="text-sm">{copiedField === 'number' ? 'Copié !' : 'Copier'}</span>
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Transférez le montant à ce numéro via {transaction.sender_method_name}
                    </p>
                  </div>
                </div>

                {/* Montant à transférer */}
                <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">Montant à transférer</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(transaction.send_amount, transaction.from_currency_code)}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Le bénéficiaire recevra {formatCurrency(transaction.receive_amount, transaction.to_currency_code)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-2">Instructions importantes</h3>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Transférez exactement le montant indiqué</li>
                  <li>• Utilisez uniquement le numéro fourni</li>
                  <li>• Ne partagez pas le code de suivi</li>
                  {isPending && !isClientSideExpired && (
                    <li>• La transaction expire dans {formatTime(timeLeft)}</li>
                  )}
                  {(isClientSideExpired || isExpired) && (
                    <li>• La transaction a expiré</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Colonne latérale */}
          <div className="space-y-6">
            {/* Résumé de la transaction */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Montant envoyé</span>
                  <span className="font-semibold">
                    {formatCurrency(transaction.send_amount, transaction.from_currency_code)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Montant reçu</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(transaction.receive_amount, transaction.to_currency_code)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Taux appliqué</span>
                  <span className="font-semibold">1 {transaction.from_currency_code} = {transaction.rate_applied} {transaction.to_currency_code}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Frais</span>
                  <span className="font-semibold">
                    {formatCurrency(0, transaction.from_currency_code)}
                  </span>
                </div>
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bénéficiaire</span>
                    <span className="font-semibold">{transaction.receiver_phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bouton de validation */}
            {isPending && !isClientValidated && !isClientSideExpired && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmation</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Cliquez sur "Valider" une fois que vous avez effectué le transfert vers l'agent.
                </p>
                
                <button
                  onClick={handleValidate}
                  disabled={isValidating || timeLeft <= 0}
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isValidating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Validation...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span>Valider la transaction</span>
                    </>
                  )}
                </button>
                
                {timeLeft <= 0 && (
                  <p className="text-red-600 text-sm mt-2 text-center">
                    Temps écoulé - transaction expirée
                  </p>
                )}
              </div>
            )}

            {/* Statut de validation client */}
            {isClientValidated && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Transaction validée
                  </h3>
                  <p className="text-sm text-green-700">
                    Vous avez confirmé avoir effectué le paiement. L'agent procédera maintenant au versement.
                  </p>
                </div>
              </div>
            )}

            {/* Message d'expiration côté client */}
            {isClientSideExpired && isPending && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-red-900 mb-2">
                    Transfert expiré
                  </h3>
                  <p className="text-sm text-red-700">
                    Le délai de validation est dépassé.
                  </p>
                </div>
              </div>
            )}

            {/* Statut final */}
            {(isCompleted || isFailed || isExpired) && (
              <div className={`rounded-xl p-6 ${
                isCompleted ? 'bg-green-50 border border-green-200' :
                isFailed ? 'bg-red-50 border border-red-200' :
                'bg-gray-50 border border-gray-200'
              }`}>
                <div className="text-center">
                  {isCompleted ? (
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  ) : (
                    <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
                  )}
                  
                  <h3 className={`text-lg font-semibold mb-2 ${
                    isCompleted ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {isCompleted ? 'Transfert réussi !' : 
                     isFailed ? 'Transfert échoué' : 'Transfert expiré'}
                  </h3>
                  
                  <p className={`text-sm ${
                    isCompleted ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {isCompleted 
                      ? 'Votre transfert a été traité avec succès.' 
                      : isFailed
                      ? 'Le transfert n\'a pas pu être complété.'
                      : 'Le délai de validation est dépassé.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}