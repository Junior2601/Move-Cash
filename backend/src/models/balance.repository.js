import {pool} from '../config/db.js';

// Obtenir toutes les balances d'un agent
export const findBalancesByAgent = async (agent_id) => {
  const result = await pool.query(
    `SELECT b.*, c.code AS currency_code, c.symbol
     FROM balances b
     JOIN currencies c ON b.currency_id = c.id
     WHERE b.agent_id = $1
     ORDER BY c.code ASC`,
    [agent_id]
  );
  return result.rows;
};

// Obtenir une balance spécifique (agent_id + currency_id)
export const findBalanceByCurrency = async (agent_id, currency_id) => {
  const result = await pool.query(
    `SELECT * FROM balances
     WHERE agent_id = $1 AND currency_id = $2`,
    [agent_id, currency_id]
  );
  return result.rows[0];
};

// Créer une nouvelle balance (0 par défaut)
export const createBalance = async (agent_id, currency_id) => {
  const result = await pool.query(
    `INSERT INTO balances (agent_id, currency_id)
     VALUES ($1, $2)
     ON CONFLICT (agent_id, currency_id) DO NOTHING
     RETURNING *`,
    [agent_id, currency_id]
  );
  return result.rows[0];
};

// Créditer un compte
export const creditBalance = async (agent_id, currency_id, amount) => {
  const result = await pool.query(
    `UPDATE balances
     SET amount = amount + $3,
         last_updated = CURRENT_TIMESTAMP
     WHERE agent_id = $1 AND currency_id = $2
     RETURNING *`,
    [agent_id, currency_id, amount]
  );
  return result.rows[0];
};

// Débiter un compte
export const debitBalance = async (agent_id, currency_id, amount) => {
  const result = await pool.query(
    `UPDATE balances
     SET amount = amount - $3,
         last_updated = CURRENT_TIMESTAMP
     WHERE agent_id = $1 AND currency_id = $2
       AND amount >= $3
     RETURNING *`,
    [agent_id, currency_id, amount]
  );
  return result.rows[0];
};
