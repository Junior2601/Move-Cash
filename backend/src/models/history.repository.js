import { pool } from '../config/db.js';

/**
 * Insère une ligne dans l'historique.
 * - Utilisable avec ou sans client de transaction (BEGIN...COMMIT).
 * - Retourne la ligne insérée.
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

  let sql = `
    SELECT 
      h.*,
      -- Récupérer le nom de l'agent si actor_type = 'agent'
      CASE 
        WHEN h.actor_type = 'agent' AND h.actor_id IS NOT NULL THEN a.name
        WHEN h.actor_type = 'admin' AND h.actor_id IS NOT NULL THEN adm.name
        ELSE NULL
      END as actor_name,
      
      -- Récupérer le nom de l'entité si applicable
      CASE 
        WHEN h.entity_type = 'agent' THEN ae.name
        WHEN h.entity_type = 'transaction' THEN t.tracking_code
        WHEN h.entity_type = 'rate' THEN CONCAT('Taux ', r.id)
        ELSE NULL
      END as entity_name,

      -- Récupérer les métadonnées supplémentaires pour les agents
      CASE 
        WHEN h.entity_type = 'agent' THEN ae.email
        ELSE NULL
      END as entity_email,

      -- Récupérer les métadonnées supplémentaires pour les transactions
      CASE 
        WHEN h.entity_type = 'transaction' THEN t.send_amount
        ELSE NULL
      END as entity_amount

    FROM history h
    
    -- Jointures pour les acteurs
    LEFT JOIN agents a ON h.actor_type = 'agent' AND h.actor_id = a.id
    LEFT JOIN admins adm ON h.actor_type = 'admin' AND h.actor_id = adm.id
    
    -- Jointures pour les entités
    LEFT JOIN agents ae ON h.entity_type = 'agent' AND h.entity_id = ae.id
    LEFT JOIN transactions t ON h.entity_type = 'transaction' AND h.entity_id = t.id
    LEFT JOIN rates r ON h.entity_type = 'rate' AND h.entity_id = r.id
    
    WHERE 1=1
  `;

  if (action_type) { sql += ` AND h.action_type = $${idx++}`; params.push(action_type); }
  if (actor_type)  { sql += ` AND h.actor_type = $${idx++}`;  params.push(actor_type); }
  if (actor_id)    { sql += ` AND h.actor_id = $${idx++}`;    params.push(actor_id); }
  if (entity_type) { sql += ` AND h.entity_type = $${idx++}`; params.push(entity_type); }
  if (entity_id)   { sql += ` AND h.entity_id = $${idx++}`;   params.push(entity_id); }
  if (date_from)   { sql += ` AND h.created_at >= $${idx++}`; params.push(date_from); }
  if (date_to)     { sql += ` AND h.created_at <= $${idx++}`; params.push(date_to); }

  sql += ` ORDER BY h.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200));
  params.push(Math.max(parseInt(offset, 10) || 0, 0));

  const { rows } = await pool.query(sql, params);
  return rows;
};

export const getHistoryById = async (id) => {
  const { rows } = await pool.query(
    `SELECT 
      h.*,
      CASE 
        WHEN h.actor_type = 'agent' AND h.actor_id IS NOT NULL THEN a.name
        WHEN h.actor_type = 'admin' AND h.actor_id IS NOT NULL THEN adm.name
        ELSE NULL
      END as actor_name,
      CASE 
        WHEN h.entity_type = 'agent' THEN ae.name
        WHEN h.entity_type = 'transaction' THEN t.tracking_code
        WHEN h.entity_type = 'rate' THEN CONCAT('Taux ', r.id)
        ELSE NULL
      END as entity_name
    FROM history h
    LEFT JOIN agents a ON h.actor_type = 'agent' AND h.actor_id = a.id
    LEFT JOIN admins adm ON h.actor_type = 'admin' AND h.actor_id = adm.id
    LEFT JOIN agents ae ON h.entity_type = 'agent' AND h.entity_id = ae.id
    LEFT JOIN transactions t ON h.entity_type = 'transaction' AND h.entity_id = t.id
    LEFT JOIN rates r ON h.entity_type = 'rate' AND h.entity_id = r.id
    WHERE h.id = $1`, 
    [id]
  );
  return rows[0] || null;
};

/**
 * Insertion manuelle (réservée admin) – pratique pour tests/annotations.
 */
export const createHistoryManual = async (payload) => {
  return logHistory(payload);
};