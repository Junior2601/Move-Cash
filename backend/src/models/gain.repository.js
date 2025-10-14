import {pool} from '../config/db.js';

//  Récupérer tous les gains
export const findAllGains = async () => {
  const result = await pool.query(
    `SELECT g.*, a.name AS agent_name, c.code AS currency_code, t.id AS transaction_ref
     FROM gains g
     LEFT JOIN agents a ON g.agent_id = a.id
     LEFT JOIN currencies c ON g.currency_id = c.id
     LEFT JOIN transactions t ON g.transaction_id = t.id
     ORDER BY g.created_at DESC`
  );
  return result.rows;
};

//  Récupérer les gains d'un agent
export const findGainsByAgent = async (agent_id) => {
  const result = await pool.query(
    `SELECT g.*, c.code AS currency_code, t.id AS transaction_ref
     FROM gains g
     LEFT JOIN currencies c ON g.currency_id = c.id
     LEFT JOIN transactions t ON g.transaction_id = t.id
     WHERE g.agent_id = $1
     ORDER BY g.created_at DESC`,
    [agent_id]
  );
  return result.rows;
};

//  Récupérer les gains d'un agent groupés par devise
export const findGainsByAgentGroupedByCurrency = async (agent_id) => {
  const result = await pool.query(
    `SELECT 
       c.id AS currency_id,
       c.code AS currency_code,
       c.name AS currency_name,
       SUM(g.gain_amount) AS total_gains,
       COUNT(g.id) AS number_of_gains,
       AVG(g.commission_percent_applied) AS average_commission_percent
     FROM gains g
     LEFT JOIN currencies c ON g.currency_id = c.id
     WHERE g.agent_id = $1
     GROUP BY c.id, c.code, c.name
     ORDER BY total_gains DESC`,
    [agent_id]
  );
  return result.rows;
};

//  Récupérer les gains d'un agent avec regroupement par devise et détails
export const findGainsByAgentWithCurrencyDetails = async (agent_id) => {
  const result = await pool.query(
    `SELECT 
       c.id AS currency_id,
       c.code AS currency_code,
       c.name AS currency_name,
       SUM(g.gain_amount) AS total_gains,
       COUNT(g.id) AS number_of_gains,
       AVG(g.commission_percent_applied) AS average_commission_percent,
       JSON_AGG(
         JSON_BUILD_OBJECT(
           'gain_id', g.id,
           'gain_amount', g.gain_amount,
           'commission_percent', g.commission_percent_applied,
           'transaction_ref', t.id,
           'created_at', g.created_at
         ) ORDER BY g.created_at DESC
       ) AS gains_details
     FROM gains g
     LEFT JOIN currencies c ON g.currency_id = c.id
     LEFT JOIN transactions t ON g.transaction_id = t.id
     WHERE g.agent_id = $1
     GROUP BY c.id, c.code, c.name
     ORDER BY total_gains DESC`,
    [agent_id]
  );
  return result.rows;
};

//  Créer un gain
export const createGain = async ({ transaction_id, agent_id, currency_id, gain_amount, commission_percent_applied }) => {
  const result = await pool.query(
    `INSERT INTO gains (transaction_id, agent_id, currency_id, gain_amount, commission_percent_applied)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [transaction_id, agent_id, currency_id, gain_amount, commission_percent_applied]
  );
  return result.rows[0];
};

//  Supprimer un gain
export const deleteGain = async (id) => {
  const result = await pool.query(`DELETE FROM gains WHERE id = $1 RETURNING *`, [id]);
  return result.rows[0];
};