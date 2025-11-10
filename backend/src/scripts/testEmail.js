// scripts/testEmail.js
import { sendEmail } from "../services/email.service.js";

(async () => {
  try {
    await sendEmail({
      to: "pauljunioryao@yandex.com",
      subject: "Test envoi d’email 🚀",
      html: `
        <h1>Bravo 🎉</h1>
        <p>Ton système d’email fonctionne parfaitement.</p>
      `
    });

    console.log("✅ Email envoyé avec succès !");
  } catch (err) {
    console.error("❌ Erreur lors de l’envoi d’email:", err.message);
  }
})();
