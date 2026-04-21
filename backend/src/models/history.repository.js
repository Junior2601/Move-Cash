import { pool } from '../config/db.js';

/**
 * Insère une ligne dans l'historique.
 * - Utilisable avec ou sans client de transaction (BEGIN...COMMIT).
 * - Retourne la ligne insérée.
 * - Optimisé pour les transactions concurrentes
 */
export const logHistory = async (
  {
    action_type,
    actor_type,
    actor_id = null,
    entity_type = null,
    entity_id = null,
    description = '',
    metadata = {},
  },
  client = null
) => {
  const db = client || pool;
  
  // Validation basique pour éviter les erreurs silencieuses
  if (!action_type || !actor_type) {
    throw new Error('action_type et actor_type sont requis pour logHistory');
  }
  
  const { rows } = await db.query(
    `INSERT INTO history (
       action_type, actor_type, actor_id,
       entity_type, entity_id,
       description, metadata
     ) VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      action_type,
      actor_type,
      actor_id,
      entity_type,
      entity_id,
      description,
      metadata,
    ]
  );
  return rows[0];
};

/**
 * Récupère l'historique avec filtres + pagination + noms des acteurs
 * OPTIMISÉ: Utilise UNION ALL au lieu de LEFT JOIN conditionnels
 */
export const getHistory = async ({
  action_type,
  actor_type,
  actor_id,
  entity_type,
  entity_id,
  date_from,   // ISO date string
  date_to,     // ISO date string
  limit = 50,
  offset = 0,
} = {}) => {
  
  const params = [];
  let idx = 1;

  // Fonction utilitaire pour construire la clause WHERE
  const buildWhereClause = (prefix = 'h') => {
    const conditions = [];
    
    if (action_type) {
      conditions.push(` AND ${prefix}.action_type = $${idx++}`);
      params.push(action_type);
    }
    if (actor_type) {
      conditions.push(` AND ${prefix}.actor_type = $${idx++}`);
      params.push(actor_type);
    }
    if (actor_id) {
      conditions.push(` AND ${prefix}.actor_id = $${idx++}`);
      params.push(actor_id);
    }
    if (entity_type) {
      conditions.push(` AND ${prefix}.entity_type = $${idx++}`);
      params.push(entity_type);
    }
    if (entity_id) {
      conditions.push(` AND ${prefix}.entity_id = $${idx++}`);
      params.push(entity_id);
    }
    if (date_from) {
      conditions.push(` AND ${prefix}.created_at >= $${idx++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(` AND ${prefix}.created_at <= $${idx++}`);
      params.push(date_to);
    }
    
    return conditions.join('');
  };

  const commonWhere = buildWhereClause('h');

  // OPTIMISATION CRITIQUE: UNION ALL par type d'entité
  // Cela permet à PostgreSQL d'utiliser les index partiels et d'éviter
  // les LEFT JOIN inutiles sur des tables non concernées
  let sql = `
    (
      -- 1. Logs liés aux Agents (Entité)
      SELECT 
        h.id,
        h.action_type,
        h.actor_type,
        h.actor_id,
        h.entity_type,
        h.entity_id,
        h.description,
        h.metadata,
        h.created_at,
        a.name as actor_name, 
        ae.name as entity_name,
        ae.email as entity_email,
        NULL::numeric as entity_amount,
        NULL::text as entity_tracking_code
      FROM history h
      LEFT JOIN agents a ON h.actor_id = a.id AND h.actor_type = 'agent'
      LEFT JOIN agents ae ON h.entity_id = ae.id AND h.entity_type = 'agent'
      WHERE h.entity_type = 'agent' ${commonWhere.replace(/h\./g, 'h.')}
    )
    UNION ALL
    (
      -- 2. Logs liés aux Transactions
      SELECT 
        h.id,
        h.action_type,
        h.actor_type,
        h.actor_id,
        h.entity_type,
        h.entity_id,
        h.description,
        h.metadata,
        h.created_at,
        a.name as actor_name,
        t.tracking_code as entity_name,
        NULL::text as entity_email,
        t.send_amount as entity_amount,
        t.tracking_code as entity_tracking_code
      FROM history h
      LEFT JOIN agents a ON h.actor_id = a.id AND h.actor_type = 'agent'
      LEFT JOIN transactions t ON h.entity_id = t.id AND h.entity_type = 'transaction'
      WHERE h.entity_type = 'transaction' ${commonWhere.replace(/h\./g, 'h.')}
    )
    UNION ALL
    (
      -- 3. Logs liés aux Taux (Rates)
      SELECT 
        h.id,
        h.action_type,
        h.actor_type,
        h.actor_id,
        h.entity_type,
        h.entity_id,
        h.description,
        h.metadata,
        h.created_at,
        a.name as actor_name,
        CONCAT('Taux #', r.id) as entity_name,
        NULL::text as entity_email,
        NULL::numeric as entity_amount,
        NULL::text as entity_tracking_code
      FROM history h
      LEFT JOIN agents a ON h.actor_id = a.id AND h.actor_type = 'agent'
      LEFT JOIN rates r ON h.entity_id = r.id AND h.entity_type = 'rate'
      WHERE h.entity_type = 'rate' ${commonWhere.replace(/h\./g, 'h.')}
    )
    UNION ALL
    (
      -- 4. Logs avec Admin comme acteur
      SELECT 
        h.id,
        h.action_type,
        h.actor_type,
        h.actor_id,
        h.entity_type,
        h.entity_id,
        h.description,
        h.metadata,
        h.created_at,
        adm.name as actor_name,
        NULL::text as entity_name,
        NULL::text as entity_email,
        NULL::numeric as entity_amount,
        NULL::text as entity_tracking_code
      FROM history h
      LEFT JOIN admins adm ON h.actor_id = adm.id AND h.actor_type = 'admin'
      WHERE h.actor_type = 'admin' 
        AND (h.entity_type IS NULL OR h.entity_type NOT IN ('agent', 'transaction', 'rate'))
        ${commonWhere.replace(/h\./g, 'h.')}
    )
    UNION ALL
    (
      -- 5. Logs Système ou sans jointure utile
      SELECT 
        h.id,
        h.action_type,
        h.actor_type,
        h.actor_id,
        h.entity_type,
        h.entity_id,
        h.description,
        h.metadata,
        h.created_at,
        NULL::text as actor_name,
        NULL::text as entity_name,
        NULL::text as entity_email,
        NULL::numeric as entity_amount,
        NULL::text as entity_tracking_code
      FROM history h
      WHERE (h.entity_type IS NULL OR h.entity_type NOT IN ('agent', 'transaction', 'rate'))
        AND h.actor_type NOT IN ('admin')
        ${commonWhere.replace(/h\./g, 'h.')}
    )
    ORDER BY created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;

  // Validation et limites de pagination
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);
  
  params.push(parsedLimit);
  params.push(parsedOffset);

  try {
    const { rows } = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error('Erreur dans getHistory:', error);
    throw new Error(`Erreur lors de la récupération de l'historique: ${error.message}`);
  }
};

/**
 * Récupère une entrée d'historique par ID
 * Optimisé avec jointures conditionnelles
 */
export const getHistoryById = async (id) => {
  const query = `
    SELECT 
      h.*,
      CASE 
        WHEN h.actor_type = 'agent' AND h.actor_id IS NOT NULL THEN a.name
        WHEN h.actor_type = 'admin' AND h.actor_id IS NOT NULL THEN adm.name
        ELSE NULL
      END as actor_name,
      CASE 
        WHEN h.entity_type = 'agent' THEN ae.name
        WHEN h.entity_type = 'transaction' THEN t.tracking_code
        WHEN h.entity_type = 'rate' THEN CONCAT('Taux #', r.id)
        ELSE NULL
      END as entity_name,
      CASE 
        WHEN h.entity_type = 'agent' THEN ae.email
        ELSE NULL
      END as entity_email,
      CASE 
        WHEN h.entity_type = 'transaction' THEN t.send_amount
        ELSE NULL
      END as entity_amount
    FROM history h
    LEFT JOIN agents a ON h.actor_type = 'agent' AND h.actor_id = a.id
    LEFT JOIN admins adm ON h.actor_type = 'admin' AND h.actor_id = adm.id
    LEFT JOIN agents ae ON h.entity_type = 'agent' AND h.entity_id = ae.id
    LEFT JOIN transactions t ON h.entity_type = 'transaction' AND h.entity_id = t.id
    LEFT JOIN rates r ON h.entity_type = 'rate' AND h.entity_id = r.id
    WHERE h.id = $1
    LIMIT 1
  `;
  
  try {
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  } catch (error) {
    console.error(`Erreur dans getHistoryById(${id}):`, error);
    throw new Error(`Erreur lors de la récupération de l'entrée d'historique: ${error.message}`);
  }
};

/**
 * Insertion manuelle (réservée admin) – pratique pour tests/annotations.
 */
export const createHistoryManual = async (payload) => {
  // Validation
  if (!payload.action_type || !payload.actor_type) {
    throw new Error('action_type et actor_type sont requis');
  }
  
  return logHistory(payload);
};

/**
 * Compte le nombre total d'entrées dans l'historique avec filtres
 * Utile pour la pagination côté frontend
 */
export const countHistory = async ({
  action_type,
  actor_type,
  actor_id,
  entity_type,
  entity_id,
  date_from,
  date_to,
} = {}) => {
  const params = [];
  let idx = 1;
  
  let sql = `SELECT COUNT(*) as total FROM history h WHERE 1=1`;
  
  if (action_type) {
    sql += ` AND h.action_type = $${idx++}`;
    params.push(action_type);
  }
  if (actor_type) {
    sql += ` AND h.actor_type = $${idx++}`;
    params.push(actor_type);
  }
  if (actor_id) {
    sql += ` AND h.actor_id = $${idx++}`;
    params.push(actor_id);
  }
  if (entity_type) {
    sql += ` AND h.entity_type = $${idx++}`;
    params.push(entity_type);
  }
  if (entity_id) {
    sql += ` AND h.entity_id = $${idx++}`;
    params.push(entity_id);
  }
  if (date_from) {
    sql += ` AND h.created_at >= $${idx++}`;
    params.push(date_from);
  }
  if (date_to) {
    sql += ` AND h.created_at <= $${idx++}`;
    params.push(date_to);
  }
  
  try {
    const { rows } = await pool.query(sql, params);
    return parseInt(rows[0].total, 10);
  } catch (error) {
    console.error('Erreur dans countHistory:', error);
    throw new Error(`Erreur lors du comptage de l'historique: ${error.message}`);
  }
};

/**
 * Supprime les entrées d'historique plus anciennes qu'une certaine date
 * À utiliser avec précaution (conformité RGPD, purge automatique)
 */
export const purgeOldHistory = async (beforeDate, client = null) => {
  const db = client || pool;
  
  try {
    const { rowCount } = await db.query(
      `DELETE FROM history WHERE created_at < $1`,
      [beforeDate]
    );
    return rowCount;
  } catch (error) {
    console.error('Erreur dans purgeOldHistory:', error);
    throw new Error(`Erreur lors de la purge de l'historique: ${error.message}`);
  }
};

/**
 * Récupère les statistiques de l'historique
 * Utile pour les dashboards admin
 */
export const getHistoryStats = async (days = 30) => {
  const query = `
    SELECT 
      DATE(created_at) as date,
      action_type,
      actor_type,
      COUNT(*) as count
    FROM history
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at), action_type, actor_type
    ORDER BY date DESC, count DESC
  `;
  
  try {
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Erreur dans getHistoryStats:', error);
    throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`);
  }
};

export default {
  logHistory,
  getHistory,
  getHistoryById,
  createHistoryManual,
  countHistory,
  purgeOldHistory,
  getHistoryStats,
};