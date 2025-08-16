import {pool} from '../config/db.js';

//  Lister uniquement les pays actifs
export const findActiveCountries = async () => {
  const result = await pool.query(
    `SELECT id, name, code, phone_prefix, currency_id 
     FROM countries 
     WHERE is_active = true 
     ORDER BY name ASC`
  );
  return result.rows;
};

//  Lister tous les pays
export const findAllCountries = async () => {
  const result = await pool.query(`SELECT * FROM countries ORDER BY name ASC`);
  return result.rows;
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