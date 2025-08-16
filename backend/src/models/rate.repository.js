import {pool} from '../config/db.js';

// Lister uniquement les taux actifs
export const findActiveRates = async () => {
  const result = await pool.query(
    `SELECT r.id, 
            fc.code AS from_currency, 
            tc.code AS to_currency, 
            r.rate, 
            r.commission_percent
     FROM rates r
     JOIN currencies fc ON r.from_currency_id = fc.id
     JOIN currencies tc ON r.to_currency_id = tc.id
     WHERE r.is_active = true
     ORDER BY fc.code, tc.code`
  );
  return result.rows;
};

// Lister tous les taux (admin)
export const findAllRates = async () => {
  const result = await pool.query(
    `SELECT r.*, 
            fc.code AS from_currency, 
            tc.code AS to_currency
     FROM rates r
     JOIN currencies fc ON r.from_currency_id = fc.id
     JOIN currencies tc ON r.to_currency_id = tc.id
     ORDER BY r.created_at DESC`
  );
  return result.rows;
};

// Créer un taux
export const createRate = async (from_currency_id, to_currency_id, rate, commission_percent, admin_id) => {
  const result = await pool.query(
    `INSERT INTO rates (from_currency_id, to_currency_id, rate, commission_percent, created_by) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING *`,
    [from_currency_id, to_currency_id, rate, commission_percent, admin_id]
  );
  return result.rows[0];
};

// Mettre à jour un taux
export const updateRateById = async (id, rate, commission_percent, is_active) => {
  const result = await pool.query(
    `UPDATE rates 
     SET rate=$1, commission_percent=$2, is_active=$3, updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [rate, commission_percent, is_active, id]
  );
  return result.rows[0];
};

// Supprimer un taux
export const deleteRateById = async (id) => {
  const result = await pool.query(`DELETE FROM rates WHERE id=$1 RETURNING *`, [id]);
  return result.rows[0];
};
