import { pool } from '../config/db.js';
import { logHistory } from './history.repository.js';

// Fonction utilitaire pour récupérer les infos du pays
const getCountryInfo = async (country_id) => {
  const result = await pool.query(
    `SELECT name, code FROM countries WHERE id = $1`,
    [country_id]
  );
  return result.rows[0] || { name: '', code: '' };
};

// Fonction utilitaire pour récupérer les infos de la devise
const getCurrencyInfo = async (currency_id) => {
  const result = await pool.query(
    `SELECT code, name, symbol FROM currencies WHERE id = $1`,
    [currency_id]
  );
  return result.rows[0] || { code: '', name: '', symbol: '' };
};

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
    `SELECT pm.*, 
            c.name AS country_name,
            c.code AS country_code,
            cur.code AS currency_code,
            cur.name AS currency_name,
            cur.symbol AS currency_symbol
     FROM payment_methods pm
     JOIN countries c ON pm.country_id = c.id
     JOIN currencies cur ON pm.currency_id = cur.id
     ORDER BY c.name, pm.method`
  );
  return result.rows;
};

// Créer un moyen de paiement avec log d'historique
export const createPaymentMethod = async (country_id, method, currency_id, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Vérifier si le moyen de paiement existe déjà pour ce pays
    const existingMethod = await client.query(
      `SELECT id FROM payment_methods WHERE country_id = $1 AND method = $2`,
      [country_id, method]
    );

    if (existingMethod.rows.length > 0) {
      throw new Error('Ce moyen de paiement existe déjà pour ce pays');
    }

    const result = await client.query(
      `INSERT INTO payment_methods (country_id, method, currency_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [country_id, method, currency_id]
    );
    
    const newPaymentMethod = result.rows[0];

    // Récupérer les infos du pays et de la devise pour le log
    const countryInfo = await getCountryInfo(country_id);
    const currencyInfo = await getCurrencyInfo(currency_id);

    // 🔎 Log de création de moyen de paiement
    await logHistory({
      action_type: 'Création moyen paiement',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'payment_method',
      entity_id: newPaymentMethod.id,
      description: `Moyen de paiement créé: ${method} pour ${countryInfo.name}`,
      metadata: { 
        method_name: method,
        country_id: country_id,
        country_name: countryInfo.name,
        country_code: countryInfo.code,
        currency_id: currency_id,
        currency_code: currencyInfo.code,
        currency_name: currencyInfo.name,
        created_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return newPaymentMethod;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Mettre à jour un moyen de paiement avec log d'historique
export const updatePaymentMethodById = async (id, method, is_active, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer l'ancien moyen de paiement pour le log
    const oldMethodResult = await client.query(
      `SELECT pm.*, 
              c.name as country_name,
              c.code as country_code,
              cur.code as currency_code,
              cur.name as currency_name
       FROM payment_methods pm
       JOIN countries c ON pm.country_id = c.id
       JOIN currencies cur ON pm.currency_id = cur.id
       WHERE pm.id = $1`,
      [id]
    );
    
    if (oldMethodResult.rows.length === 0) {
      throw new Error('Moyen de paiement introuvable');
    }
    
    const oldMethod = oldMethodResult.rows[0];

    const result = await client.query(
      `UPDATE payment_methods
       SET method = $1, is_active = $2
       WHERE id = $3
       RETURNING *`,
      [method, is_active, id]
    );
    
    const updatedMethod = result.rows[0];

    // 🔎 Log de modification de moyen de paiement
    await logHistory({
      action_type: 'Modification moyen paiement',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'payment_method',
      entity_id: id,
      description: `Moyen de paiement modifié: ${method}`,
      metadata: { 
        old_method_name: oldMethod.method,
        new_method_name: method,
        country_id: oldMethod.country_id,
        country_name: oldMethod.country_name,
        currency_id: oldMethod.currency_id,
        currency_name: oldMethod.currency_name,
        old_status: oldMethod.is_active,
        new_status: is_active,
        updated_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return updatedMethod;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Supprimer un moyen de paiement avec log d'historique
export const deletePaymentMethodById = async (id, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer le moyen de paiement avant suppression pour le log
    const oldMethodResult = await client.query(
      `SELECT pm.*, 
              c.name as country_name,
              c.code as country_code,
              cur.code as currency_code,
              cur.name as currency_name
       FROM payment_methods pm
       JOIN countries c ON pm.country_id = c.id
       JOIN currencies cur ON pm.currency_id = cur.id
       WHERE pm.id = $1`,
      [id]
    );
    
    if (oldMethodResult.rows.length === 0) {
      throw new Error('Moyen de paiement introuvable');
    }
    
    const oldMethod = oldMethodResult.rows[0];

    const result = await client.query(
      `DELETE FROM payment_methods WHERE id = $1 RETURNING *`,
      [id]
    );
    
    const deletedMethod = result.rows[0];

    // 🔎 Log de suppression de moyen de paiement
    await logHistory({
      action_type: 'Suppression moyen paiement',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'payment_method',
      entity_id: id,
      description: `Moyen de paiement supprimé: ${oldMethod.method} pour ${oldMethod.country_name}`,
      metadata: { 
        method_name: oldMethod.method,
        country_id: oldMethod.country_id,
        country_name: oldMethod.country_name,
        country_code: oldMethod.country_code,
        currency_id: oldMethod.currency_id,
        currency_code: oldMethod.currency_code,
        currency_name: oldMethod.currency_name,
        deleted_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return deletedMethod;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Activer/désactiver un moyen de paiement avec log d'historique
export const togglePaymentMethodStatus = async (id, is_active, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer les infos du moyen de paiement avant modification
    const oldMethodResult = await client.query(
      `SELECT pm.*, 
              c.name as country_name,
              c.code as country_code,
              cur.code as currency_code,
              cur.name as currency_name
       FROM payment_methods pm
       JOIN countries c ON pm.country_id = c.id
       JOIN currencies cur ON pm.currency_id = cur.id
       WHERE pm.id = $1`,
      [id]
    );
    
    if (oldMethodResult.rows.length === 0) {
      throw new Error('Moyen de paiement introuvable');
    }
    
    const oldMethod = oldMethodResult.rows[0];

    const result = await client.query(
      `UPDATE payment_methods 
       SET is_active = $1
       WHERE id = $2 
       RETURNING *`,
      [is_active, id]
    );
    
    const updatedMethod = result.rows[0];

    // 🔎 Log de changement de statut
    await logHistory({
      action_type: 'Statut moyen paiement modifié',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'payment_method',
      entity_id: id,
      description: `Statut modifié pour ${oldMethod.method}: ${is_active ? 'Activé' : 'Désactivé'}`,
      metadata: { 
        method_name: oldMethod.method,
        country_name: oldMethod.country_name,
        currency_name: oldMethod.currency_name,
        old_status: oldMethod.is_active,
        new_status: is_active,
        changed_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return updatedMethod;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Récupérer un moyen de paiement par ID
export const findPaymentMethodById = async (id) => {
  const result = await pool.query(
    `SELECT pm.*, 
            c.name AS country_name,
            c.code AS country_code,
            cur.code AS currency_code,
            cur.name AS currency_name,
            cur.symbol AS currency_symbol
     FROM payment_methods pm
     JOIN countries c ON pm.country_id = c.id
     JOIN currencies cur ON pm.currency_id = cur.id
     WHERE pm.id = $1`,
    [id]
  );
  return result.rows[0];
};

// Récupérer les moyens de paiement par devise
export const findPaymentMethodsByCurrency = async (currency_id) => {
  const result = await pool.query(
    `SELECT pm.*, 
            c.name AS country_name,
            c.code AS country_code
     FROM payment_methods pm
     JOIN countries c ON pm.country_id = c.id
     WHERE pm.currency_id = $1
     ORDER BY c.name, pm.method`,
    [currency_id]
  );
  return result.rows;
};

// Compter le nombre total de moyens de paiement
export const countPaymentMethods = async () => {
  const result = await pool.query(`SELECT COUNT(*) FROM payment_methods`);
  return parseInt(result.rows[0].count);
};

// Compter le nombre de moyens de paiement actifs
export const countActivePaymentMethods = async () => {
  const result = await pool.query(`SELECT COUNT(*) FROM payment_methods WHERE is_active = true`);
  return parseInt(result.rows[0].count);
};

// Récupérer les statistiques des moyens de paiement
export const getPaymentMethodsStats = async () => {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_methods,
      COUNT(*) FILTER (WHERE is_active = true) as active_methods,
      COUNT(*) FILTER (WHERE is_active = false) as inactive_methods,
      COUNT(DISTINCT country_id) as countries_with_methods,
      COUNT(DISTINCT currency_id) as currencies_used
    FROM payment_methods
  `);
  
  return result.rows[0];
};

// Récupérer l'historique des modifications d'un moyen de paiement
export const getPaymentMethodHistory = async (payment_method_id) => {
  const result = await pool.query(`
    SELECT * FROM history 
    WHERE entity_type = 'payment_method' AND entity_id = $1
    ORDER BY created_at DESC
  `, [payment_method_id]);
  
  return result.rows;
};

// Vérifier si un moyen de paiement peut être supprimé (sans dépendances)
export const canDeletePaymentMethod = async (id) => {
  const result = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM transactions WHERE payment_method_id = $1) as transactions_count
  `, [id]);
  
  const dependencies = result.rows[0];
  return {
    canDelete: dependencies.transactions_count === 0,
    dependencies: {
      transactions: dependencies.transactions_count
    }
  };
};