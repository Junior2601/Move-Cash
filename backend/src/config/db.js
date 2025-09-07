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

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', result.rows[0]);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};