import { pool } from '../config/db.js';

// Récupérer un agent par email
export const getAgentByEmail = async (email) => {
  const query = 'SELECT * FROM agents WHERE email = $1 LIMIT 1';
  const { rows } = await pool.query(query, [email]);
  return rows[0];
};

// Créer un agent
export const createAgent = async ({ email, hashedPassword, name, country_id }) => {
  const query = `
    INSERT INTO agents (email, password, name, country_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, name, country_id, is_active, created_at
  `;
  const { rows } = await pool.query(query, [email, hashedPassword, name, country_id]);
  return rows[0];
};
