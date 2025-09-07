import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function CountdownTimer({ initialMinutes, onExpire, onConfirm }) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) {
      if (timeLeft <= 0) {
        onExpire();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((time) => time - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft, onExpire]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleConfirm = () => {
    setIsActive(false);
    onConfirm();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center space-x-2">
        <Clock className="h-5 w-5 text-orange-600" />
        <span className="text-lg font-mono text-gray-900">
          {minutes.toString().padStart(2, "0")}:
          {seconds.toString().padStart(2, "0")}
        </span>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600 mb-3">
          Temps restant pour effectuer le virement
        </p>
        <button
          onClick={handleConfirm}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          Valider le paiement
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Cliquez pour confirmer que le virement a été effectué
        </p>
      </div>
    </div>
  );
}
