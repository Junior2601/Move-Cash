// src/models/currency.model.js
import {pool} from '../config/db.js';

// 📌 Lister uniquement les devises actives
export const findActiveCurrencies = async () => {
  const result = await pool.query(
    `SELECT id, code, name, symbol 
     FROM currencies 
     WHERE is_active = true 
     ORDER BY code ASC`
  );
  return result.rows;
};

// 📌 Lister toutes les devises
export const findAllCurrencies = async () => {
  const result = await pool.query(`SELECT * FROM currencies ORDER BY code ASC`);
  return result.rows;
};

// 📌 Créer une devise
export const createCurrency = async (code, name, symbol) => {
  const result = await pool.query(
    `INSERT INTO currencies (code, name, symbol) 
     VALUES ($1, $2, $3) 
     RETURNING *`,
    [code, name, symbol]
  );
  return result.rows[0];
};

// 📌 Mettre à jour une devise
export const updateCurrencyById = async (id, code, name, symbol, is_active) => {
  const result = await pool.query(
    `UPDATE currencies 
     SET code=$1, name=$2, symbol=$3, is_active=$4, updated_at=NOW()
     WHERE id=$5 RETURNING *`,
    [code, name, symbol, is_active, id]
  );
  return result.rows[0];
};

// 📌 Supprimer une devise
export const deleteCurrencyById = async (id) => {
  const result = await pool.query(`DELETE FROM currencies WHERE id=$1 RETURNING *`, [id]);
  return result.rows[0];
};
