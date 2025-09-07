import React from "react";
import { Phone, Mail } from "lucide-react";

export default function SupportSection() {
  return (
    <div className="space-y-6 text-center">
      <p className="text-lg text-gray-700">
        Notre service client est disponible 24/7 pour vous assister.
      </p>
      <div className="flex justify-center gap-6">
        <a
          href="tel:+79991234567"
          className="flex items-center gap-2 text-blue-600 hover:underline"
        >
          <Phone className="h-5 w-5" /> +7 999 123 45 67
        </a>
        <a
          href="mailto:support@transferbridge.com"
          className="flex items-center gap-2 text-blue-600 hover:underline"
        >
          <Mail className="h-5 w-5" /> support@transferbridge.com
        </a>
      </div>
    </div>
  );
}
