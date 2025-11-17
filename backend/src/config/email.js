import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Vérification des variables d'environnement
const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('⚠️ Variables SMTP manquantes:', missingVars);
  console.warn('Les emails ne pourront pas être envoyés');
}

// Configuration du transporteur SMTP
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: parseInt(process.env.SMTP_PORT) === 465, // true pour 465, false pour autres ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  // Options de fiabilité améliorées
  connectionTimeout: 15000, // 15 secondes
  socketTimeout: 45000,     // 45 secondes
  greetingTimeout: 10000,   // 10 secondes
  pool: true,               // Réutiliser les connexions
  maxConnections: 3,        // Réduit pour éviter la surcharge
  maxMessages: 50,          // Messages par connexion
  rateLimit: 10,            // Max 10 emails par seconde
  debug: process.env.NODE_ENV === 'development', // Debug en développement
  logger: process.env.NODE_ENV === 'development' // Logs en développement
});

// Vérification asynchrone de la configuration SMTP
let smtpVerified = false;

export const verifySMTPConnection = async () => {
  try {
    console.log('🔧 Vérification de la connexion SMTP...');
    await transporter.verify();
    smtpVerified = true;
    console.log('✅ SMTP configuré et prêt à envoyer des emails');
    return true;
  } catch (error) {
    console.error('❌ Échec de la configuration SMTP:', {
      error: error.message,
      code: error.code,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER ? 'défini' : 'non défini'
    });
    smtpVerified = false;
    return false;
  }
};

// Vérifier au démarrage
if (missingVars.length === 0) {
  verifySMTPConnection().catch(console.error);
}

// Export pour vérifier l'état SMTP
export const isSMTPReady = () => smtpVerified;