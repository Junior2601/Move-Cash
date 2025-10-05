import { pool } from '../config/db.js';
import { logHistory } from './history.repository.js';

// Fonction utilitaire pour récupérer les infos de la devise
const getCurrencyInfo = async (currency_id) => {
  const result = await pool.query(
    `SELECT code, name, symbol FROM currencies WHERE id = $1`,
    [currency_id]
  );
  return result.rows[0] || { code: '', name: '', symbol: '' };
};

// Lister uniquement les pays actifs avec le code de la devise
export const findActiveCountries = async () => {
  const result = await pool.query(
    `SELECT c.id, c.name, c.code, c.phone_prefix, c.currency_id, c.is_active, c.created_at, c.updated_at,
            cur.code as currency_code, cur.name as currency_name, cur.symbol as currency_symbol
     FROM countries c
     LEFT JOIN currencies cur ON c.currency_id = cur.id
     WHERE c.is_active = true 
     ORDER BY c.name ASC`
  );
  return result.rows;
};

// Lister tous les pays avec le code de la devise
export const findAllCountries = async () => {
  const result = await pool.query(
    `SELECT c.*, 
            cur.code as currency_code, 
            cur.name as currency_name,
            cur.symbol as currency_symbol
     FROM countries c
     LEFT JOIN currencies cur ON c.currency_id = cur.id
     ORDER BY c.name ASC`
  );
  return result.rows;
};

// Compter le nombre total de pays
export const countAllCountries = async () => {
  const result = await pool.query(`SELECT COUNT(*) FROM countries`);
  return parseInt(result.rows[0].count);
};

// Compter le nombre de pays actifs
export const countActiveCountries = async () => {
  const result = await pool.query(`SELECT COUNT(*) FROM countries WHERE is_active = true`);
  return parseInt(result.rows[0].count);
};

// Compter le nombre de pays inactifs
export const countInactiveCountries = async () => {
  const result = await pool.query(`SELECT COUNT(*) FROM countries WHERE is_active = false`);
  return parseInt(result.rows[0].count);
};

// Créer un pays avec log d'historique
export const createCountry = async (name, code, phone_prefix, currency_id, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Vérifier si le pays existe déjà
    const existingCountry = await client.query(
      `SELECT id FROM countries WHERE code = $1 OR name = $2`,
      [code, name]
    );

    if (existingCountry.rows.length > 0) {
      throw new Error('Un pays avec ce code ou ce nom existe déjà');
    }

    const result = await client.query(
      `INSERT INTO countries (name, code, phone_prefix, currency_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, code, phone_prefix, currency_id]
    );
    
    const newCountry = result.rows[0];

    // Récupérer les infos de la devise pour le log
    const currencyInfo = await getCurrencyInfo(currency_id);

    // 🔎 Log de création de pays
    await logHistory({
      action_type: 'Création Pays',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'country',
      entity_id: newCountry.id,
      description: `Pays créé: ${name} (${code})`,
      metadata: { 
        country_name: name,
        country_code: code,
        phone_prefix: phone_prefix,
        currency_id: currency_id,
        currency_code: currencyInfo.code,
        currency_name: currencyInfo.name,
        created_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return newCountry;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Mettre à jour un pays avec log d'historique
export const updateCountryById = async (id, name, code, phone_prefix, currency_id, is_active, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer l'ancien pays pour le log
    const oldCountryResult = await client.query(
      `SELECT c.*, 
              cur.code as currency_code,
              cur.name as currency_name
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       WHERE c.id = $1`,
      [id]
    );
    
    if (oldCountryResult.rows.length === 0) {
      throw new Error('Pays introuvable');
    }
    
    const oldCountry = oldCountryResult.rows[0];

    const result = await client.query(
      `UPDATE countries 
       SET name=$1, code=$2, phone_prefix=$3, currency_id=$4, is_active=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [name, code, phone_prefix, currency_id, is_active, id]
    );
    
    const updatedCountry = result.rows[0];

    // Récupérer les nouvelles infos de la devise
    const newCurrencyInfo = await getCurrencyInfo(currency_id);

    // 🔎 Log de modification de pays
    await logHistory({
      action_type: 'country_updated',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'country',
      entity_id: id,
      description: `Pays modifié: ${name} (${code})`,
      metadata: { 
        old_country_name: oldCountry.name,
        new_country_name: name,
        old_country_code: oldCountry.code,
        new_country_code: code,
        old_phone_prefix: oldCountry.phone_prefix,
        new_phone_prefix: phone_prefix,
        old_currency_id: oldCountry.currency_id,
        new_currency_id: currency_id,
        old_currency_code: oldCountry.currency_code,
        new_currency_code: newCurrencyInfo.code,
        old_status: oldCountry.is_active,
        new_status: is_active,
        updated_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return updatedCountry;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Supprimer un pays avec log d'historique
export const deleteCountryById = async (id, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer le pays avant suppression pour le log
    const oldCountryResult = await client.query(
      `SELECT c.*, 
              cur.code as currency_code,
              cur.name as currency_name
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       WHERE c.id = $1`,
      [id]
    );
    
    if (oldCountryResult.rows.length === 0) {
      throw new Error('Pays introuvable');
    }
    
    const oldCountry = oldCountryResult.rows[0];

    const result = await client.query(
      `DELETE FROM countries WHERE id=$1 RETURNING *`, 
      [id]
    );
    
    const deletedCountry = result.rows[0];

    // 🔎 Log de suppression de pays
    await logHistory({
      action_type: 'country_deleted',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'country',
      entity_id: id,
      description: `Pays supprimé: ${oldCountry.name} (${oldCountry.code})`,
      metadata: { 
        country_name: oldCountry.name,
        country_code: oldCountry.code,
        phone_prefix: oldCountry.phone_prefix,
        currency_id: oldCountry.currency_id,
        currency_code: oldCountry.currency_code,
        currency_name: oldCountry.currency_name,
        deleted_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return deletedCountry;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Activer/désactiver un pays avec log d'historique
export const toggleCountryStatus = async (id, is_active, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer les infos du pays avant modification
    const oldCountryResult = await client.query(
      `SELECT c.*, 
              cur.code as currency_code,
              cur.name as currency_name
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       WHERE c.id = $1`,
      [id]
    );
    
    if (oldCountryResult.rows.length === 0) {
      throw new Error('Pays introuvable');
    }
    
    const oldCountry = oldCountryResult.rows[0];

    const result = await client.query(
      `UPDATE countries 
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2 
       RETURNING *`,
      [is_active, id]
    );
    
    const updatedCountry = result.rows[0];

    // 🔎 Log de changement de statut
    await logHistory({
      action_type: 'country_status_changed',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'country',
      entity_id: id,
      description: `Statut du pays modifié: ${oldCountry.name} (${oldCountry.code}) - ${is_active ? 'Activé' : 'Désactivé'}`,
      metadata: { 
        country_name: oldCountry.name,
        country_code: oldCountry.code,
        old_status: oldCountry.is_active,
        new_status: is_active,
        changed_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return updatedCountry;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Trouver un pays par son ID avec informations complètes
export const findCountryById = async (id) => {
  const result = await pool.query(
    `SELECT c.*, 
            cur.code as currency_code, 
            cur.name as currency_name,
            cur.symbol as currency_symbol
     FROM countries c
     LEFT JOIN currencies cur ON c.currency_id = cur.id
     WHERE c.id = $1`,
    [id]
  );
  return result.rows[0];
};

// Trouver un pays par son code
export const findCountryByCode = async (code) => {
  const result = await pool.query(
    `SELECT c.*, 
            cur.code as currency_code, 
            cur.name as currency_name,
            cur.symbol as currency_symbol
     FROM countries c
     LEFT JOIN currencies cur ON c.currency_id = cur.id
     WHERE c.code = $1`,
    [code]
  );
  return result.rows[0];
};

// Récupérer les statistiques des pays
export const getCountriesStats = async () => {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_countries,
      COUNT(*) FILTER (WHERE is_active = true) as active_countries,
      COUNT(*) FILTER (WHERE is_active = false) as inactive_countries,
      COUNT(DISTINCT currency_id) as unique_currencies
    FROM countries
  `);
  
  return result.rows[0];
};

// Récupérer l'historique des modifications d'un pays spécifique
export const getCountryHistory = async (country_id) => {
  const result = await pool.query(`
    SELECT * FROM history 
    WHERE entity_type = 'country' AND entity_id = $1
    ORDER BY created_at DESC
  `, [country_id]);
  
  return result.rows;
};

// Vérifier si un pays peut être supprimé (sans dépendances)
export const canDeleteCountry = async (id) => {
  const result = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM payment_methods WHERE country_id = $1) as payment_methods_count,
      (SELECT COUNT(*) FROM transactions WHERE from_country_id = $1 OR to_country_id = $1) as transactions_count,
      (SELECT COUNT(*) FROM rates WHERE from_country_id = $1 OR to_country_id = $1) as rates_count
  `, [id]);
  
  const dependencies = result.rows[0];
  return {
    canDelete: dependencies.payment_methods_count === 0 && 
               dependencies.transactions_count === 0 && 
               dependencies.rates_count === 0,
    dependencies: {
      payment_methods: dependencies.payment_methods_count,
      transactions: dependencies.transactions_count,
      rates: dependencies.rates_count
    }
  };
};