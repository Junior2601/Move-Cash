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
 * Récupère l'historique avec filtres + pagination.
 * Filtres possibles: action_type, actor_type, actor_id, entity_type, entity_id, date_from, date_to
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

  let sql = `SELECT * FROM history WHERE 1=1`;

  if (action_type) { sql += ` AND action_type = $${idx++}`; params.push(action_type); }
  if (actor_type)  { sql += ` AND actor_type = $${idx++}`;  params.push(actor_type); }
  if (actor_id)    { sql += ` AND actor_id = $${idx++}`;    params.push(actor_id); }
  if (entity_type) { sql += ` AND entity_type = $${idx++}`; params.push(entity_type); }
  if (entity_id)   { sql += ` AND entity_id = $${idx++}`;   params.push(entity_id); }
  if (date_from)   { sql += ` AND created_at >= $${idx++}`; params.push(date_from); }
  if (date_to)     { sql += ` AND created_at <= $${idx++}`; params.push(date_to); }

  sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200)); // borne 1..200
  params.push(Math.max(parseInt(offset, 10) || 0, 0));

  const { rows } = await pool.query(sql, params);
  return rows;
};

export const getHistoryById = async (id) => {
  const { rows } = await pool.query(`SELECT * FROM history WHERE id = $1`, [id]);
  return rows[0] || null;
};

/**
 * Insertion manuelle (réservée admin) – pratique pour tests/annotations.
 */
export const createHistoryManual = async (payload) => {
  return logHistory(payload);
};
