import {pool} from '../config/db.js';

// Lister les moyens de paiement actifs par pays
export const findActivePaymentMethodsByCountry = async (country_id) => {
  const result = await pool.query(
    `SELECT pm.id, pm.method, pm.is_active, c.name AS country
     FROM payment_methods pm
     JOIN countries c ON pm.country_id = c.id
     WHERE pm.country_id = $1 AND pm.is_active = true
     ORDER BY pm.method ASC`,
    [country_id]
  );
  return result.rows;
};

// Lister tous les moyens de paiement (admin)
export const findAllPaymentMethods = async () => {
  const result = await pool.query(
    `SELECT pm.*, c.name AS country
     FROM payment_methods pm
     JOIN countries c ON pm.country_id = c.id
     ORDER BY c.name, pm.method`
  );
  return result.rows;
};

// Créer un moyen de paiement
export const createPaymentMethod = async (country_id, method) => {
  const result = await pool.query(
    `INSERT INTO payment_methods (country_id, method)
     VALUES ($1, $2) RETURNING *`,
    [country_id, method]
  );
  return result.rows[0];
};

// Mettre à jour un moyen de paiement
export const updatePaymentMethodById = async (id, method, is_active) => {
  const result = await pool.query(
    `UPDATE payment_methods
     SET method = $1, is_active = $2
     WHERE id = $3
     RETURNING *`,
    [method, is_active, id]
  );
  return result.rows[0];
};

// Supprimer un moyen de paiement
export const deletePaymentMethodById = async (id) => {
  const result = await pool.query(
    `DELETE FROM payment_methods WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
};
