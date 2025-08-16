import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Connexion PostgreSQL via Render
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Obligatoire pour Render
  }
});

// Test immédiat de connexion
pool.connect()
  .then(() => {
    console.log('✅ Connecté à PostgreSQL via Render');
  })
  .catch((err) => {
    console.error('❌ Erreur de connexion à PostgreSQL', err);
  });
