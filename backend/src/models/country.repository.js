import {pool} from '../config/db.js';

//  Lister uniquement les pays actifs avec le code de la devise
export const findActiveCountries = async () => {
  const result = await pool.query(
    `SELECT c.id, c.name, c.code, c.phone_prefix, c.currency_id, cur.code as currency_code
     FROM countries c
     LEFT JOIN currencies cur ON c.currency_id = cur.id
     WHERE c.is_active = true 
     ORDER BY c.name ASC`
  );
  return result.rows;
};

//  Lister tous les pays avec le code de la devise
export const findAllCountries = async () => {
  const result = await pool.query(
    `SELECT c.*, cur.code as currency_code 
     FROM countries c
     LEFT JOIN currencies cur ON c.currency_id = cur.id
     ORDER BY c.name ASC`
  );
  return result.rows;
};

//  Compter le nombre total de pays
export const countAllCountries = async () => {
  const result = await pool.query(`SELECT COUNT(*) FROM countries`);
  return parseInt(result.rows[0].count);
};

//  Compter le nombre de pays actifs
export const countActiveCountries = async () => {
  const result = await pool.query(`SELECT COUNT(*) FROM countries WHERE is_active = true`);
  return parseInt(result.rows[0].count);
};

//  Compter le nombre de pays inactifs
export const countInactiveCountries = async () => {
  const result = await pool.query(`SELECT COUNT(*) FROM countries WHERE is_active = false`);
  return parseInt(result.rows[0].count);
};

//  Créer un pays
export const createCountry = async (name, code, phone_prefix, currency_id) => {
  const result = await pool.query(
    `INSERT INTO countries (name, code, phone_prefix, currency_id) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
    [name, code, phone_prefix, currency_id]
  );
  return result.rows[0];
};

//  Mettre à jour un pays
export const updateCountryById = async (id, name, code, phone_prefix, currency_id, is_active) => {
  const result = await pool.query(
    `UPDATE countries 
     SET name=$1, code=$2, phone_prefix=$3, currency_id=$4, is_active=$5, updated_at=NOW()
     WHERE id=$6 RETURNING *`,
    [name, code, phone_prefix, currency_id, is_active, id]
  );
  return result.rows[0];
};

//  Supprimer un pays
export const deleteCountryById = async (id) => {
  const result = await pool.query(`DELETE FROM countries WHERE id=$1 RETURNING *`, [id]);
  return result.rows[0];
};