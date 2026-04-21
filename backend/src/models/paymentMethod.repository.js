import { pool } from '../config/db.js';
import { logHistory } from './history.repository.js';

// Cache pour les infos pays/devise (5 minutes)
const infoCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// Fonction utilitaire pour le cache
const getCachedInfo = async (type, id, query, params) => {
  const cacheKey = `${type}_${id}`;
  const cached = infoCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  
  const result = await pool.query(query, params);
  const data = result.rows[0] || {};
  infoCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

// Récupérer les infos du pays avec cache
const getCountryInfo = async (country_id) => {
  return getCachedInfo(
    'country', 
    country_id,
    `SELECT id, name, code FROM countries WHERE id = $1`,
    [country_id]
  );
};

// Récupérer les infos de la devise avec cache
const getCurrencyInfo = async (currency_id) => {
  return getCachedInfo(
    'currency',
    currency_id,
    `SELECT id, code, name, symbol FROM currencies WHERE id = $1`,
    [currency_id]
  );
};

// Nettoyer le cache
export const clearPaymentMethodCache = () => {
  infoCache.clear();
};

// ============ REQUÊTES PRINCIPALES OPTIMISÉES ============

// Lister les moyens de paiement actifs par pays (optimisé)
export const findActivePaymentMethodsByCountry = async (country_id) => {
  const result = await pool.query(
    `SELECT id, method, is_active, currency_id
     FROM payment_methods
     WHERE country_id = $1 AND is_active = true
     ORDER BY method ASC`,
    [country_id]
  );
  return result.rows;
};

// Lister tous les moyens de paiement avec pagination et filtres (admin)
export const findAllPaymentMethods = async (page = 1, limit = 50, filters = {}) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  if (filters.country_id) {
    conditions.push(`pm.country_id = $${paramIndex++}`);
    params.push(filters.country_id);
  }
  
  if (filters.is_active !== undefined && filters.is_active !== '') {
    conditions.push(`pm.is_active = $${paramIndex++}`);
    params.push(filters.is_active === true || filters.is_active === 'true');
  }
  
  if (filters.method) {
    conditions.push(`pm.method ILIKE $${paramIndex++}`);
    params.push(`%${filters.method}%`);
  }
  
  if (filters.currency_id) {
    conditions.push(`pm.currency_id = $${paramIndex++}`);
    params.push(filters.currency_id);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Requête optimisée avec COUNT en une seule passe
  const result = await pool.query(`
    SELECT 
      pm.*,
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'code', c.code
      ) as country,
      jsonb_build_object(
        'id', cur.id,
        'code', cur.code,
        'name', cur.name,
        'symbol', cur.symbol
      ) as currency,
      COUNT(*) OVER() as total_count
    FROM payment_methods pm
    JOIN countries c ON pm.country_id = c.id
    JOIN currencies cur ON pm.currency_id = cur.id
    ${whereClause}
    ORDER BY c.name, pm.method
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, limit, offset]);
  
  const rows = result.rows;
  const total = rows[0]?.total_count ? parseInt(rows[0].total_count) : 0;
  
  // Nettoyer les données pour ne pas renvoyer total_count dans chaque ligne
  const cleanRows = rows.map(({ total_count, ...row }) => row);
  
  return {
    data: cleanRows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// Créer un moyen de paiement avec upsert optimisé
export const createPaymentMethod = async (country_id, method, currency_id, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Vérifications préalables
    if (!country_id || !method || !currency_id) {
      throw new Error('Tous les champs sont requis: country_id, method, currency_id');
    }
    
    // Utilisation de INSERT avec ON CONFLICT pour éviter une requête SELECT supplémentaire
    const result = await client.query(`
      INSERT INTO payment_methods (country_id, method, currency_id, created_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (country_id, method) 
      DO UPDATE SET 
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE payment_methods.is_active = false
      RETURNING *
    `, [country_id, method, currency_id, admin_id]);
    
    if (result.rows.length === 0) {
      throw new Error('Ce moyen de paiement existe déjà et est actif');
    }
    
    const newPaymentMethod = result.rows[0];
    
    // Log uniquement si c'est une nouvelle création (pas une réactivation)
    const isNewCreation = newPaymentMethod.created_at === newPaymentMethod.updated_at;
    if (isNewCreation) {
      const [countryInfo, currencyInfo] = await Promise.all([
        getCountryInfo(country_id),
        getCurrencyInfo(currency_id)
      ]);
      
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
    }
    
    await client.query('COMMIT');
    return newPaymentMethod;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Fonction dédiée pour l'activation/désactivation (optimisée)
export const togglePaymentMethodStatus = async (id, is_active, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Récupération optimisée avec moins de colonnes
    const oldMethodResult = await client.query(`
      SELECT pm.id, pm.method, pm.is_active as old_status,
             c.id as country_id, c.name as country_name, c.code as country_code,
             cur.id as currency_id, cur.code as currency_code, cur.name as currency_name
      FROM payment_methods pm
      JOIN countries c ON pm.country_id = c.id
      JOIN currencies cur ON pm.currency_id = cur.id
      WHERE pm.id = $1
    `, [id]);
    
    if (oldMethodResult.rows.length === 0) {
      throw new Error('Moyen de paiement introuvable');
    }
    
    const oldMethod = oldMethodResult.rows[0];
    
    // Mise à jour simple et rapide
    const result = await client.query(`
      UPDATE payment_methods 
      SET is_active = $1
      WHERE id = $2 
      RETURNING *
    `, [is_active, id]);
    
    // Log après mise à jour
    await logHistory({
      action_type: is_active ? 'Activation moyen paiement' : 'Désactivation moyen paiement',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'payment_method',
      entity_id: id,
      description: `Moyen de paiement ${is_active ? 'activé' : 'désactivé'}: ${oldMethod.method} pour ${oldMethod.country_name}`,
      metadata: { 
        method_name: oldMethod.method,
        country_id: oldMethod.country_id,
        country_name: oldMethod.country_name,
        country_code: oldMethod.country_code,
        currency_id: oldMethod.currency_id,
        currency_code: oldMethod.currency_code,
        currency_name: oldMethod.currency_name,
        old_status: oldMethod.old_status,
        new_status: is_active,
        changed_by: admin_id
      }
    }, client);
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Mettre à jour un moyen de paiement (mise à jour partielle)
export const updatePaymentMethodById = async (id, updates, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Récupérer l'ancien moyen de paiement pour le log
    const oldMethodResult = await client.query(`
      SELECT pm.*, 
             c.name as country_name, c.code as country_code,
             cur.code as currency_code, cur.name as currency_name
      FROM payment_methods pm
      JOIN countries c ON pm.country_id = c.id
      JOIN currencies cur ON pm.currency_id = cur.id
      WHERE pm.id = $1
    `, [id]);
    
    if (oldMethodResult.rows.length === 0) {
      throw new Error('Moyen de paiement introuvable');
    }
    
    const oldMethod = oldMethodResult.rows[0];
    
    // Construction dynamique de la requête UPDATE
    const allowedFields = ['method', 'is_active', 'currency_id'];
    const setClauses = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        setClauses.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }
    
    if (setClauses.length === 0) {
      throw new Error('Aucun champ valide à mettre à jour');
    }
    
    values.push(id);
    
    const result = await client.query(`
      UPDATE payment_methods 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, [...values]);
    
    // Log de modification
    await logHistory({
      action_type: 'Modification moyen paiement',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'payment_method',
      entity_id: id,
      description: `Moyen de paiement modifié: ${oldMethod.method}`,
      metadata: { 
        old_method_name: oldMethod.method,
        new_method_name: updates.method || oldMethod.method,
        country_id: oldMethod.country_id,
        country_name: oldMethod.country_name,
        currency_id: oldMethod.currency_id,
        currency_name: oldMethod.currency_name,
        old_status: oldMethod.is_active,
        new_status: updates.is_active !== undefined ? updates.is_active : oldMethod.is_active,
        updated_by: admin_id,
        changes: updates
      }
    }, client);
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Supprimer un moyen de paiement
export const deletePaymentMethodById = async (id, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Récupérer le moyen de paiement avant suppression pour le log
    const oldMethodResult = await client.query(`
      SELECT pm.*, 
             c.name as country_name, c.code as country_code,
             cur.code as currency_code, cur.name as currency_name
      FROM payment_methods pm
      JOIN countries c ON pm.country_id = c.id
      JOIN currencies cur ON pm.currency_id = cur.id
      WHERE pm.id = $1
    `, [id]);
    
    if (oldMethodResult.rows.length === 0) {
      throw new Error('Moyen de paiement introuvable');
    }
    
    const oldMethod = oldMethodResult.rows[0];
    
    // Vérifier si le moyen de paiement peut être supprimé
    const canDelete = await canDeletePaymentMethod(id, client);
    if (!canDelete.canDelete) {
      throw new Error(`Impossible de supprimer: ${canDelete.message}`);
    }
    
    const result = await client.query(
      `DELETE FROM payment_methods WHERE id = $1 RETURNING *`,
      [id]
    );
    
    // Log de suppression
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
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ============ FONCTIONS UTILITAIRES ============

// Récupérer un moyen de paiement par ID
export const findPaymentMethodById = async (id) => {
  const result = await pool.query(
    `SELECT pm.*, 
            c.id as country_id, c.name AS country_name, c.code AS country_code,
            cur.id as currency_id, cur.code AS currency_code, cur.name AS currency_name, cur.symbol AS currency_symbol
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
    `SELECT pm.id, pm.method, pm.is_active,
            c.id as country_id, c.name AS country_name, c.code AS country_code
     FROM payment_methods pm
     JOIN countries c ON pm.country_id = c.id
     WHERE pm.currency_id = $1 AND pm.is_active = true
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

// Récupérer les statistiques des moyens de paiement (version optimisée)
export const getPaymentMethodsStats = async () => {
  // Essayer d'utiliser la vue matérialisée d'abord
  try {
    const result = await pool.query(`SELECT * FROM payment_methods_stats`);
    return result.rows[0];
  } catch (error) {
    // Fallback si la vue n'existe pas
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
  }
};

// Récupérer l'historique des modifications d'un moyen de paiement
export const getPaymentMethodHistory = async (payment_method_id, limit = 50) => {
  const result = await pool.query(`
    SELECT * FROM history 
    WHERE entity_type = 'payment_method' AND entity_id = $1::text
    ORDER BY created_at DESC
    LIMIT $2
  `, [payment_method_id.toString(), limit]);
  
  return result.rows;
};

// Vérifier si un moyen de paiement peut être supprimé (sans dépendances)
export const canDeletePaymentMethod = async (id, client = null) => {
  const dbClient = client || pool;
  const result = await dbClient.query(`
    SELECT 
      (SELECT COUNT(*) FROM transactions WHERE payment_method_id = $1) as transactions_count,
      (SELECT COUNT(*) FROM orders WHERE payment_method_id = $1) as orders_count
  `, [id]);
  
  const dependencies = result.rows[0];
  const canDelete = dependencies.transactions_count === 0 && dependencies.orders_count === 0;
  
  let message = '';
  if (dependencies.transactions_count > 0) {
    message = `${dependencies.transactions_count} transaction(s) associée(s)`;
  }
  if (dependencies.orders_count > 0) {
    message += `${message ? ' et ' : ''}${dependencies.orders_count} commande(s) associée(s)`;
  }
  
  return {
    canDelete,
    message: message || 'Aucune dépendance',
    dependencies: {
      transactions: parseInt(dependencies.transactions_count),
      orders: parseInt(dependencies.orders_count)
    }
  };
};

// Récupérer les moyens de paiement par pays avec détails devise
export const findPaymentMethodsByCountryWithDetails = async (country_id) => {
  const result = await pool.query(
    `SELECT pm.id, pm.method, pm.is_active,
            cur.id as currency_id, cur.code as currency_code, cur.name as currency_name, cur.symbol as currency_symbol
     FROM payment_methods pm
     JOIN currencies cur ON pm.currency_id = cur.id
     WHERE pm.country_id = $1
     ORDER BY pm.method ASC`,
    [country_id]
  );
  return result.rows;
};

// Mise à jour groupée (batch update) pour activer/désactiver plusieurs méthodes
export const batchUpdatePaymentMethodsStatus = async (ids, is_active, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const results = [];
    for (const id of ids) {
      const result = await togglePaymentMethodStatus(id, is_active, admin_id);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};