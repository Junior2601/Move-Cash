import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Transporteur SMTP
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,   // ex: "smtp.gmail.com"
  port: process.env.SMTP_PORT,   // ex: 587
  secure: false,                 // true si 465
  auth: {
    user: process.env.SMTP_USER, // adresse email
    pass: process.env.SMTP_PASS  // mot de passe / app password
  },

  connectionTimeout: 10000, // 10 secondes
  socketTimeout: 35000,     // 35 secondes
  greetingTimeout: 5000,    // 5 secondes
  pool: true,               // Réutiliser les connexions
  maxConnections: 5,
  maxMessages: 100
});

// Vérifier la config au démarrage
transporter.verify((error, success) => {
  if (error) {
    console.error("Erreur SMTP:", error);
  } else {
    console.log("SMTP prêt à envoyer des emails ✅");
  }
});
