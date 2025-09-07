import React from "react";
import TransactionForm from "../transaction/TransactionForm";
import TrackingForm from "../transaction/TrackingForm";
import SupportSection from "../support/SupportSection";
import CurrencyCalculator from "../calculator/CurrencyCalculator";

export default function ServiceContent({ active, onTransactionComplete }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          {active === "transfer" && (
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Effectuer un Transfert
              </h3>
              <TransactionForm onTransactionComplete={onTransactionComplete} />
            </div>
          )}

          {active === "track" && (
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Suivi de Transaction
              </h3>
              <TrackingForm />
            </div>
          )}

          {active === "support" && (
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Service Client
              </h3>
              <SupportSection />
            </div>
          )}

          {active === "calculator" && (
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Calculatrice de Conversion
              </h3>
              <CurrencyCalculator />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
