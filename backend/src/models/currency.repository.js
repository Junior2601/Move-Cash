import { pool } from '../config/db.js';

// Lister uniquement les devises actives
export const findActiveCurrencies = async () => {
  const result = await pool.query(
    `SELECT id, code, name, symbol 
     FROM currencies 
     WHERE is_active = true AND deleted_at IS NULL
     ORDER BY code ASC`
  );
  return result.rows;
};

// Lister toutes les devises (soft delete inclus)
export const findAllCurrencies = async () => {
  const result = await pool.query(
    `SELECT id, code, name, symbol, is_active, created_at, updated_at
     FROM currencies 
     WHERE deleted_at IS NULL
     ORDER BY code ASC`
  );
  return result.rows;
};

// Créer une devise
export const createCurrency = async (code, name, symbol) => {
  // Vérifier si une devise avec le même code existe déjà (même soft delete)
  const existing = await pool.query(
    `SELECT id FROM currencies WHERE code = $1 AND deleted_at IS NULL`,
    [code]
  );
  
  if (existing.rows.length > 0) {
    throw new Error('Une devise avec ce code existe déjà');
  }

  const result = await pool.query(
    `INSERT INTO currencies (code, name, symbol) 
     VALUES ($1, $2, $3) 
     RETURNING id, code, name, symbol, is_active, created_at, updated_at`,
    [code, name, symbol]
  );
  return result.rows[0];
};

// Mettre à jour une devise
export const updateCurrencyById = async (id, code, name, symbol, is_active) => {
  // Vérifier si la devise existe
  const checkResult = await pool.query(
    `SELECT id FROM currencies WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  
  if (checkResult.rows.length === 0) {
    return null;
  }

  // Vérifier l'unicité du code (si changé)
  if (code) {
    const codeExists = await pool.query(
      `SELECT id FROM currencies WHERE code = $1 AND id != $2 AND deleted_at IS NULL`,
      [code, id]
    );
    
    if (codeExists.rows.length > 0) {
      throw new Error('Une devise avec ce code existe déjà');
    }
  }

  const result = await pool.query(
    `UPDATE currencies 
     SET code = COALESCE($1, code), 
         name = COALESCE($2, name), 
         symbol = COALESCE($3, symbol),
         is_active = COALESCE($4, is_active),
         updated_at = NOW()
     WHERE id = $5 AND deleted_at IS NULL
     RETURNING id, code, name, symbol, is_active, created_at, updated_at`,
    [code, name, symbol, is_active, id]
  );
  return result.rows[0];
};

// Désactiver une devise (soft delete)
export const deactivateCurrencyById = async (id) => {
  const result = await pool.query(
    `UPDATE currencies 
     SET is_active = false, 
         deleted_at = NOW(),
         updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, code, name, symbol, is_active`,
    [id]
  );
  return result.rows[0];
};

// Activer une devise (restaurer)
export const activateCurrencyById = async (id) => {
  const result = await pool.query(
    `UPDATE currencies 
     SET is_active = true, 
         deleted_at = NULL,
         updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NOT NULL
     RETURNING id, code, name, symbol, is_active`,
    [id]
  );
  return result.rows[0];
};

// Supprimer définitivement une devise
export const deleteCurrencyById = async (id) => {
  // Vérifier si la devise est utilisée dans des transactions
  const usageCheck = await pool.query(
    `SELECT COUNT(*) as count FROM transactions WHERE currency_id = $1`,
    [id]
  );
  
  if (parseInt(usageCheck.rows[0].count) > 0) {
    throw new Error('Cette devise est utilisée dans des transactions et ne peut pas être supprimée');
  }

  const result = await pool.query(
    `DELETE FROM currencies WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rows[0];
};

// Basculer le statut d'une devise
export const toggleCurrencyStatusById = async (id) => {
  const currency = await pool.query(
    `SELECT is_active, deleted_at FROM currencies WHERE id = $1`,
    [id]
  );
  
  if (currency.rows.length === 0) {
    return null;
  }
  
  const newStatus = !currency.rows[0].is_active;
  const deletedAt = newStatus ? null : new Date();
  
  const result = await pool.query(
    `UPDATE currencies 
     SET is_active = $1, 
         deleted_at = $2,
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, code, name, symbol, is_active`,
    [newStatus, deletedAt, id]
  );
  
  return result.rows[0];
};