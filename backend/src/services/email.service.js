import { transporter } from "../config/email.js";

/**
 * Envoi d'un email générique
 */
export const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"Move Cash" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log(`📧 Email envoyé à ${to}`);
  } catch (error) {
    console.error("Erreur envoi email:", error);
    throw new Error("Impossible d'envoyer l'email");
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
      <li><b>Montant :</b> ${transaction.send_amount} ${transaction.currency || ''} provenant de ${transaction.from_country_name || transaction.from_country_id}</li>
      <li><b>Expéditeur :</b> ${transaction.sender_phone}</li>
      <li><b>Bénéficiaire :</b> ${transaction.receiver_phone}</li>
      <li><b>Code suivi :</b> ${transaction.tracking_code}</li>
    </ul>
    <p>Veuillez vous connecter à votre tableau de bord pour gérer cette transaction.</p>
    <p>Merci,<br><b>L'équipe Move Cash</b></p>
  `;

  await sendEmail({ to: agentEmail, subject, html });
};

/**
 * Notification agent pour une redirection reçue
 */
export const notifyAgentForRedirection = async (agentEmail, redirection, transaction) => {
  const subject = "Nouvelle redirection de transaction";
  const html = `
    <h2>Bonjour,</h2>
    <p>Une transaction vous a été redirigée :</p>
    
    <h3>Détails de la redirection :</h3>
    <ul>
      <li><b>Montant redirigé :</b> ${redirection.redirected_amount} ${transaction.currency || ''}</li>
      <li><b>Agent expéditeur :</b> ${redirection.from_agent_id || `Agent #${redirection.from_agent_id}`}</li>
      <li><b>Raison :</b> ${redirection.reason || 'Aucune raison spécifiée'}</li>
    </ul>
    
    <h3>Détails de la transaction :</h3>
    <ul>
      <li><b>Code suivi :</b> ${transaction.tracking_code}</li>
      <li><b>Montant initial :</b> ${transaction.send_amount} ${transaction.currency || ''}</li>
      <li><b>Expéditeur :</b> ${transaction.sender_phone}</li>
      <li><b>Bénéficiaire :</b> ${transaction.receiver_phone}</li>
      <li><b>Pays d'origine :</b> ${transaction.from_country_name || transaction.from_country_id}</li>
      <li><b>Pays de destination :</b> ${transaction.to_country_name || transaction.to_country_id}</li>
    </ul>
    
    <p>Veuillez vous connecter à votre tableau de bord pour accepter ou refuser cette redirection.</p>
    <p><strong>Attention :</strong> Cette redirection expire après un certain temps.</p>
    
    <p>Merci,<br><b>L'équipe Move Cash</b></p>
  `;

  await sendEmail({ to: agentEmail, subject, html });
};

/**
 * Notification agent expéditeur du statut de la redirection
 */
export const notifyAgentRedirectionStatus = async (agentEmail, redirection, transaction, status) => {
  const subject = `Redirection ${status === 'accepted' ? 'acceptée' : 'rejetée'}`;
  const statusText = status === 'accepted' ? 'acceptée' : 'rejetée';
  
  const html = `
    <h2>Bonjour,</h2>
    <p>Votre redirection de transaction a été ${statusText} :</p>
    
    <h3>Détails de la redirection :</h3>
    <ul>
      <li><b>Statut :</b> ${statusText.toUpperCase()}</li>
      <li><b>Montant :</b> ${redirection.redirected_amount} ${transaction.currency || ''}</li>
      <li><b>Agent destinataire :</b> ${redirection.to_agent_name || `Agent #${redirection.to_agent_id}`}</li>
      <li><b>Raison :</b> ${redirection.reason || 'Aucune raison spécifiée'}</li>
      <li><b>Date de traitement :</b> ${new Date().toLocaleString()}</li>
    </ul>
    
    <h3>Détails de la transaction :</h3>
    <ul>
      <li><b>Code suivi :</b> ${transaction.tracking_code}</li>
      <li><b>Montant initial :</b> ${transaction.send_amount} ${transaction.currency || ''}</li>
    </ul>
    
    <p>Merci,<br><b>L'équipe Move Cash</b></p>
  `;

  await sendEmail({ to: agentEmail, subject, html });
};