// src/pages/agent/TransactionDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  RefreshCcw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  Copy,
  User,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Shield
} from "lucide-react";
import useAgentApi from "../../hooks/useAgentApi";

export default function TransactionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState("");

  // Initialisation de l'API agent
  let api;
  try {
    api = useAgentApi();
  } catch (err) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Session expirée</h2>
          <p className="text-gray-600 mb-4">Veuillez vous reconnecter</p>
          <Link
            to="/agent/login"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const fetchTransaction = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/transactions/${id}`);
      setTransaction(res.data.data);
    } catch (err) {
      console.error("Erreur lors du chargement de la transaction", err);
      if (err.response?.status === 404) {
        setError("Transaction non trouvée.");
      } else if (err.response?.status === 401) {
        setError("Session expirée. Veuillez vous reconnecter.");
      } else {
        setError("Erreur lors du chargement de la transaction: " + 
          (err.response?.data?.message || err.message || "Erreur inconnue"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  };

  const confirmAction = (action) => {
    return window.confirm(`Êtes-vous sûr de vouloir ${action} cette transaction ?`);
  };

  const handleValidate = async () => {
    if (!confirmAction('valider')) return;
    
    setProcessing(true);
    try {
      await api.put(`/transactions/${id}/validate-agent`);
      await fetchTransaction();
    } catch (err) {
      console.error("Erreur lors de la validation", err);
      setError("Erreur lors de la validation: " + 
        (err.response?.data?.message || err.message || "Erreur inconnue"));
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirmAction('annuler')) return;
    
    setProcessing(true);
    try {
      await api.put(`/transactions/${id}/cancel-agent`);
      await fetchTransaction();
    } catch (err) {
      console.error("Erreur lors de l'annulation", err);
      setError("Erreur lors de l'annulation: " + 
        (err.response?.data?.message || err.message || "Erreur inconnue"));
    } finally {
      setProcessing(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      'en_attente': { 
        label: 'En attente', 
        color: 'text-yellow-800 bg-yellow-100 border-yellow-200',
        icon: Clock,
        description: 'En attente de traitement'
      },
      'effectuee': { 
        label: 'Effectuée', 
        color: 'text-green-800 bg-green-100 border-green-200',
        icon: CheckCircle,
        description: 'Transaction complétée avec succès'
      },
      'echouee': { 
        label: 'Échouée', 
        color: 'text-red-800 bg-red-100 border-red-200',
        icon: XCircle,
        description: 'Transaction annulée ou échouée'
      },
      'expiree': { 
        label: 'Expirée', 
        color: 'text-gray-800 bg-gray-100 border-gray-200',
        icon: Clock,
        description: 'Transaction expirée'
      },
      'pending': { 
        label: 'En attente', 
        color: 'text-yellow-800 bg-yellow-100 border-yellow-200',
        icon: Clock,
        description: 'En attente de traitement'
      },
      'completed': { 
        label: 'Complétée', 
        color: 'text-green-800 bg-green-100 border-green-200',
        icon: CheckCircle,
        description: 'Transaction complétée avec succès'
      },
      'failed': { 
        label: 'Échouée', 
        color: 'text-red-800 bg-red-100 border-red-200',
        icon: XCircle,
        description: 'Transaction annulée ou échouée'
      },
      'expired': { 
        label: 'Expirée', 
        color: 'text-gray-800 bg-gray-100 border-gray-200',
        icon: Clock,
        description: 'Transaction expirée'
      }
    };

    return configs[status] || { 
      label: status, 
      color: 'text-gray-800 bg-gray-100 border-gray-200',
      icon: AlertCircle,
      description: 'Statut inconnu'
    };
  };

  const formatAmount = (amount, currencyCode) => {
    if (!amount) return "0.00";
    const formattedAmount = parseFloat(amount).toFixed(2);
    return currencyCode ? `${formattedAmount} ${currencyCode}` : formattedAmount;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPhoneNumber = (phone, prefix) => {
    if (!phone) return "—";
    if (phone.startsWith('+')) return phone;
    if (prefix) return `+${prefix} ${phone}`;
    return phone;
  };

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;
    
    if (diffMs <= 0) return { text: "Expirée", urgent: false };
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 60) {
      return { text: `${diffMins} min`, urgent: diffMins < 30 };
    } else {
      return { text: `${diffHours} h`, urgent: diffHours < 1 };
    }
  };

  const canProcessTransaction = () => {
    return transaction && (transaction.status === 'en_attente' || transaction.status === 'pending');
  };

  // Refresh automatique pour les transactions en attente
  useEffect(() => {
    let interval;
    if (transaction && canProcessTransaction()) {
      interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchTransaction();
        }
      }, 30000); // Toutes les 30 secondes
    }
    return () => clearInterval(interval);
  }, [transaction]);

  useEffect(() => {
    fetchTransaction();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCcw className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de la transaction...</p>
        </div>
      </div>
    );
  }

  if (error && !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={fetchTransaction}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Réessayer
            </button>
            <Link
              to="/agent/transactions"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Retour aux transactions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Transaction introuvable</h2>
          <p className="text-gray-600 mb-4">La transaction demandée n'existe pas.</p>
          <Link
            to="/agent/transactions"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
          >
            Retour aux transactions
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(transaction.status);
  const StatusIcon = statusConfig.icon;
  const timeRemaining = getTimeRemaining(transaction.expires_at);
  const isUrgent = timeRemaining?.urgent;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête et navigation */}
        <div className="mb-6">
          <Link
            to="/agent/transactions"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux transactions
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Détails de la transaction
              </h1>
              <p className="text-gray-600 mt-1">
                Suivi complet de l'opération
              </p>
            </div>
            <button
              onClick={fetchTransaction}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Carte statut et informations principales */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${statusConfig.color}`}>
                    <StatusIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {statusConfig.label}
                    </h2>
                    <p className="text-gray-600 text-sm">
                      {statusConfig.description}
                    </p>
                    {timeRemaining && (
                      <p className={`text-sm mt-1 ${
                        isUrgent ? 'text-red-600 font-medium' : 'text-gray-500'
                      }`}>
                        {isUrgent && "⏰ "}
                        {transaction.status === 'en_attente' || transaction.status === 'pending' 
                          ? `Expire dans ${timeRemaining.text}`
                          : timeRemaining.text
                        }
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Code de suivi */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-lg font-bold text-gray-900">
                      {transaction.tracking_code}
                    </code>
                    <button
                      onClick={() => handleCopy(transaction.tracking_code, 'tracking')}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Code de suivi</p>
                  {copiedField === 'tracking' && (
                    <p className="text-xs text-green-600 mt-1">Copié !</p>
                  )}
                </div>
              </div>

              {/* Montants */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Envoi</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatAmount(transaction.send_amount, transaction.from_currency_code)}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {transaction.from_country_name}
                  </p>
                </div>

                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Réception</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {formatAmount(transaction.receive_amount, transaction.to_currency_code)}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    {transaction.to_country_name}
                  </p>
                </div>
              </div>

              {/* Taux et commission */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Taux appliqué:</span>
                  <span className="font-medium ml-2">1 → {transaction.rate_applied}</span>
                </div>
                <div>
                  <span className="text-gray-600">Commission:</span>
                  <span className="font-medium ml-2">{transaction.commission_applied}%</span>
                </div>
              </div>
            </div>

            {/* Informations client et bénéficiaire */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Informations des parties
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Expéditeur */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium text-gray-900">Expéditeur</h4>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Téléphone</p>
                      <p className="font-medium">
                        {formatPhoneNumber(transaction.sender_phone, transaction.from_country_phone_prefix)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pays</p>
                      <p className="font-medium">{transaction.from_country_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Méthode d'envoi</p>
                      <p className="font-medium">{transaction.sender_method_name}</p>
                    </div>
                  </div>
                </div>

                {/* Bénéficiaire */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-green-600" />
                    <h4 className="font-medium text-gray-900">Bénéficiaire</h4>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Téléphone</p>
                      <p className="font-medium">
                        {formatPhoneNumber(transaction.receiver_phone, transaction.to_country_phone_prefix)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pays</p>
                      <p className="font-medium">{transaction.to_country_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Méthode de réception</p>
                      <p className="font-medium">{transaction.receiver_method_name}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Informations de paiement */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Informations de paiement
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <h4 className="font-medium text-gray-900">Numéro autorisé</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-lg font-bold text-gray-900 bg-gray-100 px-3 py-2 rounded">
                      {transaction.authorized_number || "Non spécifié"}
                    </code>
                    {transaction.authorized_number && (
                      <button
                        onClick={() => handleCopy(transaction.authorized_number, 'number')}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {copiedField === 'number' && (
                    <p className="text-xs text-green-600 mt-1">Numéro copié !</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-green-600" />
                    <h4 className="font-medium text-gray-900">Sécurité</h4>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Validé par le client</p>
                      <p className={`font-medium ${transaction.client_validated ? 'text-green-600' : 'text-yellow-600'}`}>
                        {transaction.client_validated ? 'Oui' : 'Non'}
                      </p>
                    </div>
                    {transaction.client_validated_at && (
                      <div>
                        <p className="text-sm text-gray-600">Date de validation</p>
                        <p className="font-medium">{formatDate(transaction.client_validated_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne latérale */}
          <div className="space-y-6">
            {/* Actions */}
            {canProcessTransaction() && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={handleValidate}
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {processing ? "Traitement..." : "Valider la transaction"}
                  </button>

                  <button
                    onClick={handleCancel}
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {processing ? "Traitement..." : "Annuler la transaction"}
                  </button>
                </div>

                {isUrgent && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-600" />
                      <p className="text-sm font-medium text-red-800">Transaction urgente</p>
                    </div>
                    <p className="text-xs text-red-700 mt-1">
                      Cette transaction expire bientôt. Veuillez la traiter rapidement.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Métadonnées */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Informations techniques
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">ID Transaction</span>
                  <div className="flex items-center gap-1">
                    <code className="text-sm font-mono text-gray-900">
                      #{transaction.id}
                    </code>
                    <button
                      onClick={() => handleCopy(transaction.id.toString(), 'id')}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Créée le</span>
                  <span className="text-sm font-medium">{formatDate(transaction.created_at)}</span>
                </div>

                {transaction.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Complétée le</span>
                    <span className="text-sm font-medium">{formatDate(transaction.completed_at)}</span>
                  </div>
                )}

                {transaction.cancelled_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Annulée le</span>
                    <span className="text-sm font-medium">{formatDate(transaction.cancelled_at)}</span>
                  </div>
                )}

                {transaction.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Expire le</span>
                    <span className="text-sm font-medium">{formatDate(transaction.expires_at)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Dernière mise à jour</span>
                  <span className="text-sm font-medium">{formatDate(transaction.updated_at)}</span>
                </div>
              </div>

              {copiedField === 'id' && (
                <p className="text-xs text-green-600 mt-2 text-center">ID copié !</p>
              )}
            </div>

            {/* Agent assigné */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Agent assigné
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Nom</p>
                  <p className="font-medium">{transaction.agent_name || "Non spécifié"}</p>
                </div>
                {transaction.agent_email && (
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{transaction.agent_email}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}