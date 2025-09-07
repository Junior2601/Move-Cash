import React, { useState } from "react";
import {
  Copy,
  CheckCircle,
  Phone,
  ArrowLeft,
  Clock,
  User,
} from "lucide-react";
import CountdownTimer from "./CountdownTimer";

export default function TransactionResult({ transaction, onReset }) {
  const [copied, setCopied] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isExpired) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-200">
            <h3 className="text-lg font-semibold text-red-800 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Transaction Expirée
            </h3>
          </div>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-gray-600 mb-6">
              Le délai de 10 minutes pour effectuer le virement a expiré. 
              Veuillez créer une nouvelle transaction.
            </p>
            <button
              onClick={onReset}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nouvelle Transaction
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-green-50 px-6 py-4 border-b border-green-200">
            <h3 className="text-lg font-semibold text-green-800 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Transaction Confirmée
            </h3>
          </div>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-gray-600 mb-6">
              Votre transaction a été confirmée avec succès. L'agent procédera au transfert vers le bénéficiaire.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">Code de suivi:</p>
              <p className="text-lg font-mono font-bold text-gray-900">
                {transaction.trackingCode}
              </p>
            </div>
            <button
              onClick={onReset}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nouvelle Transaction
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6">
          <h3 className="text-xl font-bold text-white flex items-center">
            <CheckCircle className="h-6 w-6 mr-3" />
            Transaction Initiée avec Succès
          </h3>
          <p className="text-blue-100 mt-2">
            Suivez les instructions ci-dessous pour finaliser votre transfert
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Détails transaction */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Code de suivi:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-gray-900">
                    {transaction.trackingCode}
                  </span>
                  <button
                    onClick={() => copyToClipboard(transaction.trackingCode)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Montant envoyé:</span>
                <span className="font-semibold">
                  {transaction.sentAmount} RUB
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Montant reçu:</span>
                <span className="font-semibold text-green-600">
                  {transaction.receivedAmount} XOF
                </span>
              </div>
            </div>

            {/* Agent */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <User className="h-5 w-5 text-blue-600 mr-2" />
                Agent Agréé
              </h4>
              <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Numéro agréé:</span>
                  <span className="font-mono font-bold text-blue-600">
                    {transaction.agentNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions & Timer */}
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-gray-700">
                1. Effectuez un virement de{" "}
                <strong>{transaction.sentAmount} RUB</strong> vers le numéro
                agréé ci-dessus.
              </p>
              <p className="text-sm text-gray-700">
                2. Utilisez <strong>{transaction.senderPaymentMethod}</strong>{" "}
                pour le paiement.
              </p>
              <p className="text-sm text-gray-700">
                3. Cliquez sur "Valider le paiement" une fois le virement
                effectué.
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <CountdownTimer
                initialMinutes={10}
                onExpire={() => setIsExpired(true)}
                onConfirm={() => setIsConfirmed(true)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-4 px-6 pb-6">
          <button
            onClick={onReset}
            className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Nouvelle Transaction</span>
          </button>

          <div className="flex-1"></div>

          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Phone className="h-4 w-4" />
            <span>Support: +7 999 123 45 67</span>
          </div>
        </div>
      </div>
    </div>
  );
}
