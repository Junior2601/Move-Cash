import { pool } from '../config/db.js';

// Récupérer un admin par email
export const getAdminByEmail = async (email) => {
  const query = 'SELECT * FROM admins WHERE email = $1 LIMIT 1';
  const { rows } = await pool.query(query, [email]);
  return rows[0];
};

// Créer un nouvel admin
export const createAdmin = async ({ email, hashedPassword, name }) => {
  const query = `
    INSERT INTO admins (email, password, name)
    VALUES ($1, $2, $3)
    RETURNING id, email, name, is_active, created_at
  `;
  const { rows } = await pool.query(query, [email, hashedPassword, name]);
  return rows[0];
};
