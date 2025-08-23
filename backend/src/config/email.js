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
  }
});

// Vérifier la config au démarrage
transporter.verify((error, success) => {
  if (error) {
    console.error("Erreur SMTP:", error);
  } else {
    console.log("SMTP prêt à envoyer des emails ✅");
  }
});
