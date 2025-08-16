import {pool} from '../config/db.js';

// Lister tous les numéros autorisés d'un agent
export const findAuthorizedNumbersByAgent = async (agent_id) => {
  const result = await pool.query(
    `SELECT an.*, c.name AS country, pm.method AS payment_method
     FROM authorized_numbers an
     JOIN countries c ON an.country_id = c.id
     JOIN payment_methods pm ON an.payment_method_id = pm.id
     WHERE an.agent_id = $1
     ORDER BY an.created_at DESC`,
    [agent_id]
  );
  return result.rows;
};

// Lister tous les numéros (admin)
export const findAllAuthorizedNumbers = async () => {
  const result = await pool.query(
    `SELECT an.*, a.name AS agent_name, c.name AS country, pm.method AS payment_method
     FROM authorized_numbers an
     JOIN agents a ON an.agent_id = a.id
     JOIN countries c ON an.country_id = c.id
     JOIN payment_methods pm ON an.payment_method_id = pm.id
     ORDER BY an.created_at DESC`
  );
  return result.rows;
};

// Ajouter un numéro autorisé
export const createAuthorizedNumber = async (agent_id, country_id, payment_method_id, number, label) => {
  const result = await pool.query(
    `INSERT INTO authorized_numbers (agent_id, country_id, payment_method_id, number, label)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [agent_id, country_id, payment_method_id, number, label]
  );
  return result.rows[0];
};

// Mettre à jour un numéro autorisé
export const updateAuthorizedNumberById = async (id, number, label, is_active) => {
  const result = await pool.query(
    `UPDATE authorized_numbers
     SET number = $1, label = $2, is_active = $3
     WHERE id = $4
     RETURNING *`,
    [number, label, is_active, id]
  );
  return result.rows[0];
};

// Supprimer un numéro autorisé
export const deleteAuthorizedNumberById = async (id) => {
  const result = await pool.query(
    `DELETE FROM authorized_numbers WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
};
