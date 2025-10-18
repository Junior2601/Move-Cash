import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Transporteur SMTP pour Gmail
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,   
  port: process.env.SMTP_PORT,   
  secure: false, // true pour 465, false pour 587
  auth: {
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS 
  },
  // Configuration spécifique Gmail
  tls: {
    rejectUnauthorized: false
  },
  debug: true, // Active le debug
  logger: true // Active les logs
});

// Vérifier la config au démarrage
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Erreur configuration SMTP:", error);
  } else {
    console.log("✅ SMTP prêt à envoyer des emails");
    console.log("📧 Configuration:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER
    });
  }
});