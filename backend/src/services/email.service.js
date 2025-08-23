import { transporter } from "../config/email.js";

/**
 * Envoi d’un email générique
 */
export const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"Transfert Russie-Afrique" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log(`📧 Email envoyé à ${to}`);
  } catch (error) {
    console.error("Erreur envoi email:", error);
    throw new Error("Impossible d’envoyer l’email");
  }
};

/**
 * Notification agent choisi pour une transaction
 */
export const notifyAgentForTransaction = async (agentEmail, transaction) => {
  const subject = "Nouvelle transaction assignée";
  const html = `
    <h2>Bonjour,</h2>
    <p>Une nouvelle transaction vous a été assignée :</p>
    <ul>
      <li><b>Montant :</b> ${transaction.amount} provenant de ${transaction.from_country_id}</li>
      <li><b>Expéditeur :</b> ${transaction.sender_phone}</li>
      <li><b>Bénéficiaire :</b> ${transaction.receiver_phone}</li>
      <li><b>Code suivi :</b> ${transaction.tracking_code}</li>
    </ul>
    <p>Veuillez vous connecter à votre tableau de bord pour gérer cette transaction.</p>
    <p>Merci,<br>L’équipe Move Cash</p>
  `;

  await sendEmail({ to: agentEmail, subject, html });
};
