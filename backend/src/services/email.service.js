import { transporter } from "../config/email.js";

/**
 * Envoi d'un email générique avec gestion d'erreur robuste
 */
export const sendEmail = async ({ to, subject, html }) => {
  try {
    console.log(`📧 Tentative d'envoi email à: ${to}`, { subject });
    
    const mailOptions = {
      from: `"Move Cash" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      // Ajout d'options pour améliorer la fiabilité
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email envoyé avec succès à ${to}`, { 
      messageId: result.messageId,
      subject 
    });
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("❌ Erreur détaillée envoi email:", {
      to,
      subject,
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Ne pas bloquer l'application pour une erreur d'email
    return { 
      success: false, 
      error: error.message,
      code: error.code
    };
  }
};

/**
 * Notification agent choisi pour une transaction - VERSION AMÉLIORÉE
 */
export const notifyAgentForTransaction = async (agentEmail, transaction) => {
  try {
    console.log('📧 Notification transaction à l\'agent:', agentEmail);
    
    const subject = "💰 Nouvelle transaction assignée - Move Cash";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
          .transaction-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px; }
          .amount { font-size: 24px; font-weight: bold; color: #2c5aa0; }
          .code { background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 16px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Nouvelle Transaction</h1>
            <p>Une nouvelle transaction vous a été assignée</p>
          </div>
          
          <div class="content">
            <div class="transaction-details">
              <h2>Détails de la transaction</h2>
              
              <p><strong>Montant à envoyer :</strong><br>
              <span class="amount">${transaction.send_amount} ${transaction.from_currency_symbol || transaction.from_currency_code || ''}</span></p>
              
              <p><strong>Montant à recevoir :</strong><br>
              <span class="amount">${transaction.receive_amount} ${transaction.to_currency_symbol || transaction.to_currency_code || ''}</span></p>
              
              <p><strong>Taux appliqué :</strong> 1 ${transaction.from_currency_code} = ${transaction.rate_applied} ${transaction.to_currency_code}</p>
              
              <p><strong>Code de suivi :</strong><br>
              <div class="code">${transaction.tracking_code}</div></p>
              
              <p><strong>Expéditeur :</strong> ${transaction.sender_phone}</p>
              <p><strong>Bénéficiaire :</strong> ${transaction.receiver_phone}</p>
              
              <p><strong>Pays d'envoi :</strong> ${transaction.from_country_name}</p>
              <p><strong>Pays de réception :</strong> ${transaction.to_country_name}</p>
              
              <p><strong>Méthode d'envoi :</strong> ${transaction.sender_method_name}</p>
              <p><strong>Méthode de réception :</strong> ${transaction.receiver_method_name}</p>
              
              <p><strong>Numéro autorisé :</strong> ${transaction.authorized_number}</p>
            </div>
            
            <p><strong>⏰ Délai :</strong> Cette transaction expire dans 5 minutes</p>
            
            <p>
              <a href="${process.env.FRONTEND_URL || 'https://movecash.online'}/agent" class="button">
                📊 Accéder au Tableau de Bord
              </a>
            </p>
            
            <p><em>Veuillez traiter cette transaction dans les plus brefs délais.</em></p>
          </div>
          
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par le système Move Cash.</p>
            <p>© ${new Date().getFullYear()} Move Cash. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail({ to: agentEmail, subject, html });
    
    if (!result.success) {
      console.warn('⚠️ Email non envoyé mais transaction continuée:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erreur notification transaction:', error);
    // Ne pas throw pour ne pas bloquer la transaction
    return { success: false, error: error.message };
  }
};

/**
 * Notification agent pour une redirection reçue - VERSION AMÉLIORÉE
 */
export const notifyAgentForRedirection = async (agentEmail, redirection, transaction) => {
  try {
    console.log('📧 Notification redirection à l\'agent:', agentEmail);
    
    const subject = "🔄 Redirection de transaction reçue - Move Cash";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
          .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f5576c; }
          .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px; }
          .amount { font-size: 20px; font-weight: bold; color: #d63031; }
          .button { display: inline-block; padding: 12px 24px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
          .button.accept { background: #00b894; }
          .button.reject { background: #d63031; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔄 Redirection de Transaction</h1>
            <p>Une transaction vous a été redirigée</p>
          </div>
          
          <div class="content">
            <div class="alert">
              <strong>⚠️ Action Requise :</strong> Vous devez accepter ou rejeter cette redirection.
            </div>
            
            <div class="details">
              <h2>Détails de la redirection</h2>
              
              <p><strong>Montant redirigé :</strong><br>
              <span class="amount">${redirection.redirected_amount} ${transaction.from_currency_symbol || transaction.from_currency_code || ''}</span></p>
              
              <p><strong>Agent expéditeur :</strong> ${redirection.from_agent_name || `Agent #${redirection.from_agent_id}`}</p>
              
              <p><strong>Raison :</strong><br>
              <em>${redirection.reason || 'Aucune raison spécifiée'}</em></p>
              
              <p><strong>Date de redirection :</strong> ${new Date(redirection.created_at).toLocaleString('fr-FR')}</p>
            </div>
            
            <div class="details">
              <h2>Détails de la transaction originale</h2>
              
              <p><strong>Code de suivi :</strong> ${transaction.tracking_code}</p>
              <p><strong>Montant total :</strong> ${transaction.send_amount} ${transaction.from_currency_symbol || transaction.from_currency_code || ''}</p>
              <p><strong>Expéditeur :</strong> ${transaction.sender_phone}</p>
              <p><strong>Bénéficiaire :</strong> ${transaction.receiver_phone}</p>
              <p><strong>Pays :</strong> ${transaction.from_country_name} → ${transaction.to_country_name}</p>
              <p><strong>Statut :</strong> ${transaction.status}</p>
            </div>
            
            <p>
              <a href="${process.env.FRONTEND_URL || 'https://movecash.online'}/agent" class="button accept">
                ✅ Accepter la Redirection
              </a>
              <a href="${process.env.FRONTEND_URL || 'https://movecash.online'}/agent" class="button reject">
                ❌ Rejeter la Redirection
              </a>
            </p>
            
            <p><em>Veuillez traiter cette redirection rapidement.</em></p>
          </div>
          
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par le système Move Cash.</p>
            <p>© ${new Date().getFullYear()} Move Cash. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail({ to: agentEmail, subject, html });
    
    if (!result.success) {
      console.warn('⚠️ Email redirection non envoyé mais processus continué:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erreur notification redirection:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Notification agent expéditeur du statut de la redirection - VERSION AMÉLIORÉE
 */
export const notifyAgentRedirectionStatus = async (agentEmail, redirection, transaction, status) => {
  try {
    console.log('📧 Notification statut redirection à l\'agent:', agentEmail, status);
    
    const isAccepted = status === 'accepted';
    const subject = isAccepted 
      ? "✅ Redirection acceptée - Move Cash" 
      : "❌ Redirection rejetée - Move Cash";
    
    const statusText = isAccepted ? 'acceptée' : 'rejetée';
    const statusColor = isAccepted ? '#00b894' : '#d63031';
    const statusIcon = isAccepted ? '✅' : '❌';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}99 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
          .status { text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; color: ${statusColor}; }
          .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid ${statusColor}; }
          .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusIcon} Redirection ${statusText.toUpperCase()}</h1>
            <p>Votre demande de redirection a été ${statusText}</p>
          </div>
          
          <div class="content">
            <div class="status">
              ${statusIcon} Redirection ${statusText}
            </div>
            
            <div class="details">
              <h2>Détails de la redirection</h2>
              
              <p><strong>Statut :</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText.toUpperCase()}</span></p>
              <p><strong>Montant redirigé :</strong> ${redirection.redirected_amount} ${transaction.from_currency_symbol || transaction.from_currency_code || ''}</p>
              <p><strong>Agent destinataire :</strong> ${redirection.to_agent_name || `Agent #${redirection.to_agent_id}`}</p>
              <p><strong>Raison de la redirection :</strong><br>
              <em>${redirection.reason || 'Aucune raison spécifiée'}</em></p>
              <p><strong>Date de traitement :</strong> ${new Date().toLocaleString('fr-FR')}</p>
            </div>
            
            <div class="details">
              <h2>Détails de la transaction</h2>
              <p><strong>Code de suivi :</strong> ${transaction.tracking_code}</p>
              <p><strong>Montant total :</strong> ${transaction.send_amount} ${transaction.from_currency_symbol || transaction.from_currency_code || ''}</p>
              <p><strong>Expéditeur :</strong> ${transaction.sender_phone}</p>
              <p><strong>Bénéficiaire :</strong> ${transaction.receiver_phone}</p>
            </div>
            
            ${isAccepted ? `
            <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <strong>✅ Succès :</strong> La transaction a été transférée avec succès à l'agent ${redirection.to_agent_name || `Agent #${redirection.to_agent_id}`}.
            </div>
            ` : `
            <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <strong>❌ Refus :</strong> L'agent a refusé la redirection. La transaction reste sous votre responsabilité.
            </div>
            `}
            
            <p>
              <a href="${process.env.FRONTEND_URL || 'https://votre-app.com'}/agent/dashboard" style="display: inline-block; padding: 12px 24px; background: ${statusColor}; color: white; text-decoration: none; border-radius: 5px;">
                📊 Retour au Tableau de Bord
              </a>
            </p>
          </div>
          
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par le système Move Cash.</p>
            <p>© ${new Date().getFullYear()} Move Cash. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail({ to: agentEmail, subject, html });
    
    if (!result.success) {
      console.warn('⚠️ Email statut redirection non envoyé:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erreur notification statut redirection:', error);
    return { success: false, error: error.message };
  }
};