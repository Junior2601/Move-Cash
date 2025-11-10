import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuration optimisée pour Render
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Configuration spécifique pour les connexions distantes
  connectionTimeoutMillis: 19000, // 10 secondes max pour établir la connexion
  idleTimeoutMillis: 55000, // 30 secondes avant fermeture si inactif
  max: 10, // Réduire le nombre max de connexions pour Render
  allowExitOnIdle: true
});

// Gestion des événements du pool
pool.on('connect', () => {
  console.log('✅ Nouvelle connexion DB établie');
});

pool.on('error', (err, client) => {
  console.error('❌ Erreur pool PostgreSQL:', err);
});

pool.on('remove', () => {
  console.log('🔌 Connexion DB retirée du pool');
});

// Test de connexion avec gestion d'erreur améliorée
export const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Test connexion DB réussi:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Test connexion DB échoué:', error.message);
    return false;
  } finally {
    if (client) {
      client.release();
      console.log('🔓 Client libéré après test');
    }
  }
};

// Fonction pour obtenir une connexion avec timeout
export const getClientWithTimeout = async (timeoutMs = 10000) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout lors de l\'acquisition de la connexion DB'));
    }, timeoutMs);

    pool.connect()
      .then((client) => {
        clearTimeout(timeout);
        resolve(client);
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
};