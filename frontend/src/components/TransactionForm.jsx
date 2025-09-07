import React, { useState, useEffect } from "react";
import { Send, ArrowRight, Check, AlertCircle } from "lucide-react";

export default function TransactionForm({ onTransactionComplete }) {
  const [countries, setCountries] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [formData, setFormData] = useState({
    from_country_id: "",
    to_country_id: "",
    sender_phone: "",
    receiver_phone: "",
    sender_method_id: "",
    receiver_method_id: "",
    send_amount: "",
  });

  const [receiveAmount, setReceiveAmount] = useState(0);
  const [rate, setRate] = useState(0);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger pays et moyens de paiement
  useEffect(() => {
    fetch("http://localhost:5000/api/country")
      .then((res) => res.json())
      .then((data) => setCountries(data))
      .catch((err) => console.error("Erreur pays:", err));

    fetch("http://localhost:5000/api/payment_method")
      .then((res) => res.json())
      .then((data) => setPaymentMethods(data))
      .catch((err) => console.error("Erreur moyens paiement:", err));
  }, []);

  // Charger taux si montant et pays changent
  useEffect(() => {
    if (formData.send_amount > 0 && formData.from_country_id && formData.to_country_id) {
      fetch("http://localhost:5000/api/rate")
        .then((res) => res.json())
        .then((rates) => {
          const rateItem = rates.find(
            (r) =>
              r.from_country_id === Number(formData.from_country_id) &&
              r.to_country_id === Number(formData.to_country_id)
          );
          if (rateItem) {
            setRate(rateItem.rate);
            setReceiveAmount(formData.send_amount * rateItem.rate);
          }
        })
        .catch((err) => console.error("Erreur taux:", err));
    }
  }, [formData.send_amount, formData.from_country_id, formData.to_country_id]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.from_country_id) newErrors.from_country_id = "Sélectionnez le pays d'envoi";
    if (!formData.to_country_id) newErrors.to_country_id = "Sélectionnez le pays de réception";
    if (!formData.sender_phone) newErrors.sender_phone = "Numéro expéditeur requis";
    if (!formData.receiver_phone) newErrors.receiver_phone = "Numéro bénéficiaire requis";
    if (!formData.sender_method_id) newErrors.sender_method_id = "Choisir un moyen d’envoi";
    if (!formData.receiver_method_id) newErrors.receiver_method_id = "Choisir un moyen de réception";
    if (!formData.send_amount || formData.send_amount <= 0)
      newErrors.send_amount = "Montant invalide";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("http://localhost:5000/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrors({ general: data.message || "Erreur transaction" });
        return;
      }

      onTransactionComplete(data.data);
    } catch (err) {
      console.error(err);
      setErrors({ general: "Erreur de connexion au serveur" });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          {/* Expéditeur */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <Send className="h-5 w-5 text-blue-600 mr-2" />
              Expéditeur
            </h4>

            {/* Pays d'envoi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pays d'envoi</label>
              <select
                value={formData.from_country_id}
                onChange={(e) => handleInputChange("from_country_id", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
              >
                <option value="">Sélectionner un pays</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.from_country_id && (
                <p className="mt-1 text-sm text-red-600">{errors.from_country_id}</p>
              )}
            </div>

            {/* Téléphone expéditeur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Numéro expéditeur</label>
              <input
                type="tel"
                value={formData.sender_phone}
                onChange={(e) => handleInputChange("sender_phone", e.target.value)}
                placeholder="+7XXXXXXXXXX"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
              />
              {errors.sender_phone && (
                <p className="mt-1 text-sm text-red-600">{errors.sender_phone}</p>
              )}
            </div>

            {/* Moyen d'envoi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Moyen d’envoi</label>
              <select
                value={formData.sender_method_id}
                onChange={(e) => handleInputChange("sender_method_id", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
              >
                <option value="">Sélectionner un moyen</option>
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {errors.sender_method_id && (
                <p className="mt-1 text-sm text-red-600">{errors.sender_method_id}</p>
              )}
            </div>

            {/* Montant envoyé */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Montant à envoyer</label>
              <input
                type="number"
                value={formData.send_amount}
                onChange={(e) => handleInputChange("send_amount", Number(e.target.value))}
                placeholder="0"
                min="1"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
              />
              {errors.send_amount && (
                <p className="mt-1 text-sm text-red-600">{errors.send_amount}</p>
              )}
            </div>
          </div>

          {/* Flèche */}
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="h-8 w-8 text-blue-600" />
          </div>

          {/* Bénéficiaire */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <Check className="h-5 w-5 text-green-600 mr-2" />
              Bénéficiaire
            </h4>

            {/* Pays réception */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pays réception</label>
              <select
                value={formData.to_country_id}
                onChange={(e) => handleInputChange("to_country_id", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
              >
                <option value="">Sélectionner un pays</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.to_country_id && (
                <p className="mt-1 text-sm text-red-600">{errors.to_country_id}</p>
              )}
            </div>

            {/* Téléphone bénéficiaire */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Numéro bénéficiaire</label>
              <input
                type="tel"
                value={formData.receiver_phone}
                onChange={(e) => handleInputChange("receiver_phone", e.target.value)}
                placeholder="+225XXXXXXXX"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
              />
              {errors.receiver_phone && (
                <p className="mt-1 text-sm text-red-600">{errors.receiver_phone}</p>
              )}
            </div>

            {/* Moyen de réception */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Moyen de réception</label>
              <select
                value={formData.receiver_method_id}
                onChange={(e) => handleInputChange("receiver_method_id", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
              >
                <option value="">Sélectionner un moyen</option>
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {errors.receiver_method_id && (
                <p className="mt-1 text-sm text-red-600">{errors.receiver_method_id}</p>
              )}
            </div>

            {/* Montant reçu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Montant reçu</label>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border">
                <span className="text-lg font-semibold text-gray-900">{receiveAmount} </span>
                {rate > 0 && (
                  <p className="text-sm text-gray-600 mt-1">Taux: {rate}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bouton */}
        <button
          type="submit"
          disabled={isSubmitting}
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
