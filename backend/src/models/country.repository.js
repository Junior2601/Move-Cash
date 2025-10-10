import { pool } from '../config/db.js';
import { logHistory } from './history.repository.js';

// Fonction utilitaire pour récupérer les infos de la devise
const getCurrencyInfo = async (currency_id) => {
  console.log(`🔍 Récupération info devise ID: ${currency_id}`);
  try {
    const result = await pool.query(
      `SELECT code, name, symbol FROM currencies WHERE id = $1`,
      [currency_id]
    );
    console.log(`✅ Info devise récupérée:`, result.rows[0]);
    return result.rows[0] || { code: '', name: '', symbol: '' };
  } catch (error) {
    console.error(`💥 Erreur récupération devise ${currency_id}:`, error);
    return { code: '', name: '', symbol: '' };
  }
};

// Lister uniquement les pays actifs avec le code de la devise
export const findActiveCountries = async () => {
  console.log('🔍 Récupération pays actifs');
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.code, c.phone_prefix, c.currency_id, c.is_active, c.created_at, c.updated_at,
              cur.code as currency_code, cur.name as currency_name, cur.symbol as currency_symbol
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       WHERE c.is_active = true 
       ORDER BY c.name ASC`
    );
    console.log(`✅ ${result.rows.length} pays actifs récupérés`);
    return result.rows;
  } catch (error) {
    console.error('💥 Erreur récupération pays actifs:', error);
    throw error;
  }
};

// Lister tous les pays avec le code de la devise
export const findAllCountries = async () => {
  console.log('🔍 Récupération de tous les pays');
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.code, c.phone_prefix, c.currency_id, c.is_active, c.created_at, c.updated_at,
              cur.code as currency_code, 
              cur.name as currency_name,
              cur.symbol as currency_symbol
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       ORDER BY c.name ASC`
    );
    console.log(`✅ ${result.rows.length} pays récupérés`);
    return result.rows;
  } catch (error) {
    console.error('💥 Erreur récupération pays:', error);
    throw error;
  }
};

// Compter le nombre total de pays
export const countAllCountries = async () => {
  console.log('🔢 Comptage total pays');
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM countries`);
    const count = parseInt(result.rows[0].count);
    console.log(`✅ Total pays: ${count}`);
    return count;
  } catch (error) {
    console.error('💥 Erreur comptage pays:', error);
    throw error;
  }
};

// Compter le nombre de pays actifs
export const countActiveCountries = async () => {
  console.log('🔢 Comptage pays actifs');
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM countries WHERE is_active = true`);
    const count = parseInt(result.rows[0].count);
    console.log(`✅ Pays actifs: ${count}`);
    return count;
  } catch (error) {
    console.error('💥 Erreur comptage pays actifs:', error);
    throw error;
  }
};

// Compter le nombre de pays inactifs
export const countInactiveCountries = async () => {
  console.log('🔢 Comptage pays inactifs');
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM countries WHERE is_active = false`);
    const count = parseInt(result.rows[0].count);
    console.log(`✅ Pays inactifs: ${count}`);
    return count;
  } catch (error) {
    console.error('💥 Erreur comptage pays inactifs:', error);
    throw error;
  }
};

// Créer un pays avec log d'historique
export const createCountry = async (name, code, phone_prefix, currency_id, admin_id = null) => {
  const client = await pool.connect();
  console.log('🚀 CREATE COUNTRY - Début');
  console.log('📝 Données:', { name, code, phone_prefix, currency_id, admin_id });

  try {
    await client.query('BEGIN');

    // Vérifier si le pays existe déjà
    console.log('🔍 Vérification doublons...');
    const existingCountry = await client.query(
      `SELECT id FROM countries WHERE code = $1 OR name = $2`,
      [code, name]
    );

    if (existingCountry.rows.length > 0) {
      console.log('❌ Doublon détecté');
      throw new Error('Un pays avec ce code ou ce nom existe déjà');
    }
    console.log('✅ Aucun doublon détecté');

    // Créer le pays
    console.log('📝 Création du pays...');
    const result = await client.query(
      `INSERT INTO countries (name, code, phone_prefix, currency_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, code, phone_prefix, currency_id]
    );
    
    const newCountry = result.rows[0];
    console.log('✅ Pays créé:', newCountry);

    // Récupérer les infos de la devise pour le log
    const currencyInfo = await getCurrencyInfo(currency_id);

    // Log de création de pays
    console.log('📝 Sauvegarde historique...');
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
    console.log('✅ Historique sauvegardé');

    await client.query('COMMIT');
    console.log('✅ CREATE COUNTRY - Succès');
    return newCountry;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('💥 CREATE COUNTRY - Erreur:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Mettre à jour un pays avec log d'historique
export const updateCountryById = async (id, name, code, phone_prefix, currency_id, is_active, admin_id = null) => {
  const client = await pool.connect();
  console.log('🚀 UPDATE COUNTRY - Début');
  console.log('📝 Paramètres:', { id, name, code, phone_prefix, currency_id, is_active, admin_id });

  try {
    await client.query('BEGIN');

    // Vérifier d'abord si le pays existe
    console.log(`🔍 Vérification existence pays ID: ${id}`);
    const existingCountry = await client.query(
      `SELECT id FROM countries WHERE id = $1`,
      [id]
    );
    
    if (existingCountry.rows.length === 0) {
      console.log('❌ Pays non trouvé');
      throw new Error('Pays introuvable');
    }
    console.log('✅ Pays trouvé');

    // Vérifier les doublons (sauf pour le pays actuel)
    console.log('🔍 Vérification doublons...');
    const duplicateCheck = await client.query(
      `SELECT id FROM countries WHERE (code = $1 OR name = $2) AND id != $3`,
      [code, name, id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      console.log('❌ Doublon détecté');
      throw new Error('Un pays avec ce code ou ce nom existe déjà');
    }
    console.log('✅ Aucun doublon détecté');

    // Récupérer l'ancien pays pour le log
    console.log('📋 Récupération ancien pays...');
    const oldCountryResult = await client.query(
      `SELECT c.id, c.name, c.code, c.phone_prefix, c.currency_id, c.is_active, c.created_at, c.updated_at,
              cur.code as currency_code,
              cur.name as currency_name
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       WHERE c.id = $1`,
      [id]
    );
    
    const oldCountry = oldCountryResult.rows[0];
    console.log('📋 Ancien pays:', oldCountry);

    // Mettre à jour le pays
    console.log('📝 Mise à jour du pays...');
    const result = await client.query(
      `UPDATE countries 
       SET name = $1, code = $2, phone_prefix = $3, currency_id = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6 
       RETURNING *`,
      [name, code, phone_prefix, currency_id, is_active, id]
    );
    
    const updatedCountry = result.rows[0];
    console.log('✅ Pays mis à jour:', updatedCountry);

    // Récupérer les nouvelles infos de la devise
    const newCurrencyInfo = await getCurrencyInfo(currency_id);
    console.log('💰 Nouvelle devise:', newCurrencyInfo);

    // Log d'historique
    console.log('📝 Sauvegarde historique...');
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
    console.log('✅ Historique sauvegardé');

    await client.query('COMMIT');
    console.log('✅ UPDATE COUNTRY - Succès');
    
    return updatedCountry;
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('💥 UPDATE COUNTRY - Erreur:', err);
    console.error('Stack trace:', err.stack);
    throw err;
  } finally {
    client.release();
  }
};

// Activer/désactiver un pays avec log d'historique
export const toggleCountryStatusById = async (id, is_active, admin_id = null) => {
  const client = await pool.connect();
  console.log('🚀 TOGGLE COUNTRY STATUS - Début');
  console.log('📝 Paramètres:', { id, is_active, admin_id });

  try {
    await client.query('BEGIN');

    // Récupérer les infos du pays avant modification
    console.log(`🔍 Récupération pays ID: ${id}`);
    const oldCountryResult = await client.query(
      `SELECT c.id, c.name, c.code, c.phone_prefix, c.currency_id, c.is_active, c.created_at, c.updated_at,
              cur.code as currency_code,
              cur.name as currency_name
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       WHERE c.id = $1`,
      [id]
    );
    
    if (oldCountryResult.rows.length === 0) {
      console.log('❌ Pays non trouvé');
      throw new Error('Pays introuvable');
    }
    
    const oldCountry = oldCountryResult.rows[0];
    console.log('📋 Pays avant modification:', oldCountry);

    // Mettre à jour le statut
    console.log('📝 Mise à jour statut...');
    const result = await client.query(
      `UPDATE countries 
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2 
       RETURNING *`,
      [is_active, id]
    );
    
    const updatedCountry = result.rows[0];
    console.log('✅ Statut mis à jour:', updatedCountry);

    // Log de changement de statut
    console.log('📝 Sauvegarde historique...');
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
    console.log('✅ Historique sauvegardé');

    await client.query('COMMIT');
    console.log('✅ TOGGLE COUNTRY STATUS - Succès');
    return updatedCountry;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('💥 TOGGLE COUNTRY STATUS - Erreur:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Supprimer un pays avec log d'historique
export const deleteCountryById = async (id, admin_id = null) => {
  const client = await pool.connect();
  console.log('🚀 DELETE COUNTRY - Début');
  console.log('📝 Paramètres:', { id, admin_id });

  try {
    await client.query('BEGIN');

    // Récupérer le pays avant suppression pour le log
    console.log(`🔍 Récupération pays ID: ${id}`);
    const oldCountryResult = await client.query(
      `SELECT c.id, c.name, c.code, c.phone_prefix, c.currency_id, c.is_active, c.created_at, c.updated_at,
              cur.code as currency_code,
              cur.name as currency_name
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       WHERE c.id = $1`,
      [id]
    );
    
    if (oldCountryResult.rows.length === 0) {
      console.log('❌ Pays non trouvé');
      throw new Error('Pays introuvable');
    }
    
    const oldCountry = oldCountryResult.rows[0];
    console.log('📋 Pays à supprimer:', oldCountry);

    // Supprimer le pays
    console.log('🗑️ Suppression du pays...');
    const result = await client.query(
      `DELETE FROM countries WHERE id=$1 RETURNING *`, 
      [id]
    );
    
    const deletedCountry = result.rows[0];
    console.log('✅ Pays supprimé:', deletedCountry);

    // Log de suppression
    console.log('📝 Sauvegarde historique...');
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
    console.log('✅ Historique sauvegardé');

    await client.query('COMMIT');
    console.log('✅ DELETE COUNTRY - Succès');
    return deletedCountry;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('💥 DELETE COUNTRY - Erreur:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Trouver un pays par son ID avec informations complètes
export const findCountryById = async (id) => {
  console.log(`🔍 Recherche pays par ID: ${id}`);
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.code, c.phone_prefix, c.currency_id, c.is_active, c.created_at, c.updated_at,
              cur.code as currency_code, 
              cur.name as currency_name,
              cur.symbol as currency_symbol
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       WHERE c.id = $1`,
      [id]
    );
    console.log(`✅ Pays trouvé:`, result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error(`💥 Erreur recherche pays ${id}:`, error);
    throw error;
  }
};

// Trouver un pays par son code
export const findCountryByCode = async (code) => {
  console.log(`🔍 Recherche pays par code: ${code}`);
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.code, c.phone_prefix, c.currency_id, c.is_active, c.created_at, c.updated_at,
              cur.code as currency_code, 
              cur.name as currency_name,
              cur.symbol as currency_symbol
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       WHERE c.code = $1`,
      [code]
    );
    console.log(`✅ Pays trouvé:`, result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error(`💥 Erreur recherche pays code ${code}:`, error);
    throw error;
  }
};

// Récupérer les statistiques des pays
export const getCountriesStats = async () => {
  console.log('📊 Récupération statistiques pays');
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_countries,
        COUNT(*) FILTER (WHERE is_active = true) as active_countries,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_countries,
        COUNT(DISTINCT currency_id) as unique_currencies
      FROM countries
    `);
    console.log('✅ Statistiques récupérées:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('💥 Erreur statistiques pays:', error);
    throw error;
  }
};

// Récupérer l'historique des modifications d'un pays spécifique
export const getCountryHistory = async (country_id) => {
  console.log(`📜 Récupération historique pays: ${country_id}`);
  try {
    const result = await pool.query(`
      SELECT * FROM history 
      WHERE entity_type = 'country' AND entity_id = $1
      ORDER BY created_at DESC
    `, [country_id]);
    console.log(`✅ ${result.rows.length} entrées d'historique récupérées`);
    return result.rows;
  } catch (error) {
    console.error(`💥 Erreur historique pays ${country_id}:`, error);
    throw error;
  }
};

// Vérifier si un pays peut être supprimé (sans dépendances)
export const canDeleteCountry = async (id) => {
  console.log(`🔍 Vérification dépendances pays: ${id}`);
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM payment_methods WHERE country_id = $1) as payment_methods_count,
        (SELECT COUNT(*) FROM transactions WHERE from_country_id = $1 OR to_country_id = $1) as transactions_count,
        (SELECT COUNT(*) FROM rates WHERE from_country_id = $1 OR to_country_id = $1) as rates_count
    `, [id]);
    
    const dependencies = result.rows[0];
    const canDelete = dependencies.payment_methods_count === 0 && 
                     dependencies.transactions_count === 0 && 
                     dependencies.rates_count === 0;
    
    console.log(`✅ Vérification dépendances:`, { canDelete, dependencies });
    return {
      canDelete,
      dependencies: {
        payment_methods: dependencies.payment_methods_count,
        transactions: dependencies.transactions_count,
        rates: dependencies.rates_count
      }
    };
  } catch (error) {
    console.error(`💥 Erreur vérification dépendances ${id}:`, error);
    throw error;
  }
};