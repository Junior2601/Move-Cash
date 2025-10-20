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

//  Récupérer les gains d'un agent groupés par devise et par mois
export const findGainsByAgentGroupedByCurrencyAndMonth = async (agent_id, year = null, month = null) => {
  let whereClause = "WHERE g.agent_id = $1";
  let params = [agent_id];
  let paramCount = 1;

  if (year) {
    paramCount++;
    whereClause += ` AND EXTRACT(YEAR FROM g.created_at) = $${paramCount}`;
    params.push(year);
  }

  if (month) {
    paramCount++;
    whereClause += ` AND EXTRACT(MONTH FROM g.created_at) = $${paramCount}`;
    params.push(month);
  }

  const result = await pool.query(
    `SELECT 
       c.id AS currency_id,
       c.code AS currency_code,
       c.name AS currency_name,
       EXTRACT(YEAR FROM g.created_at) AS year,
       EXTRACT(MONTH FROM g.created_at) AS month,
       TO_CHAR(g.created_at, 'YYYY-MM') AS period,
       SUM(g.gain_amount) AS total_gains,
       COUNT(g.id) AS number_of_gains,
       AVG(g.commission_percent_applied) AS average_commission_percent
     FROM gains g
     LEFT JOIN currencies c ON g.currency_id = c.id
     ${whereClause}
     GROUP BY c.id, c.code, c.name, year, month, period
     ORDER BY year DESC, month DESC, total_gains DESC`,
    params
  );
  return result.rows;
};

//  Récupérer les gains mensuels d'un agent par devise
export const findMonthlyGainsByAgentAndCurrency = async (agent_id, currency_id = null) => {
  let whereClause = "WHERE g.agent_id = $1";
  let params = [agent_id];
  let paramCount = 1;

  if (currency_id) {
    paramCount++;
    whereClause += ` AND g.currency_id = $${paramCount}`;
    params.push(currency_id);
  }

  const result = await pool.query(
    `SELECT 
       c.id AS currency_id,
       c.code AS currency_code,
       c.name AS currency_name,
       EXTRACT(YEAR FROM g.created_at) AS year,
       EXTRACT(MONTH FROM g.created_at) AS month,
       TO_CHAR(g.created_at, 'YYYY-MM') AS period,
       TO_CHAR(g.created_at, 'Month YYYY') AS period_display,
       SUM(g.gain_amount) AS total_gains,
       COUNT(g.id) AS number_of_gains,
       AVG(g.commission_percent_applied) AS average_commission_percent
     FROM gains g
     LEFT JOIN currencies c ON g.currency_id = c.id
     ${whereClause}
     GROUP BY c.id, c.code, c.name, year, month, period, period_display
     ORDER BY year DESC, month DESC, c.code ASC`,
    params
  );
  return result.rows;
};

//  Récupérer le résumé des gains du mois en cours par agent
export const findCurrentMonthGainsSummary = async (agent_id = null) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed

  let whereClause = `WHERE EXTRACT(YEAR FROM g.created_at) = $1 AND EXTRACT(MONTH FROM g.created_at) = $2`;
  let params = [currentYear, currentMonth];
  let paramCount = 2;

  if (agent_id) {
    paramCount++;
    whereClause += ` AND g.agent_id = $${paramCount}`;
    params.push(agent_id);
  }

  const result = await pool.query(
    `SELECT 
       a.id AS agent_id,
       a.name AS agent_name,
       c.id AS currency_id,
       c.code AS currency_code,
       c.name AS currency_name,
       SUM(g.gain_amount) AS current_month_gains,
       COUNT(g.id) AS number_of_gains,
       AVG(g.commission_percent_applied) AS average_commission_percent
     FROM gains g
     LEFT JOIN agents a ON g.agent_id = a.id
     LEFT JOIN currencies c ON g.currency_id = c.id
     ${whereClause}
     GROUP BY a.id, a.name, c.id, c.code, c.name
     ORDER BY current_month_gains DESC`,
    params
  );
  return result.rows;
};

//  Récupérer l'historique des gains sur les 12 derniers mois
export const findLast12MonthsGains = async (agent_id = null) => {
  let whereClause = "WHERE g.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')";
  let params = [];
  let paramCount = 0;

  if (agent_id) {
    paramCount++;
    whereClause += ` AND g.agent_id = $${paramCount}`;
    params.push(agent_id);
  }

  const result = await pool.query(
    `SELECT 
       EXTRACT(YEAR FROM g.created_at) AS year,
       EXTRACT(MONTH FROM g.created_at) AS month,
       TO_CHAR(g.created_at, 'YYYY-MM') AS period,
       TO_CHAR(g.created_at, 'Mon YYYY') AS period_display,
       c.id AS currency_id,
       c.code AS currency_code,
       SUM(g.gain_amount) AS monthly_gains,
       COUNT(g.id) AS number_of_gains
     FROM gains g
     LEFT JOIN currencies c ON g.currency_id = c.id
     ${whereClause}
     GROUP BY year, month, period, period_display, c.id, c.code
     ORDER BY year DESC, month DESC, c.code ASC`,
    params
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

//  Créer un gain (version améliorée avec vérification de période)
export const createGain = async ({ transaction_id, agent_id, currency_id, gain_amount, commission_percent_applied }) => {
  const result = await pool.query(
    `INSERT INTO gains (transaction_id, agent_id, currency_id, gain_amount, commission_percent_applied)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [transaction_id, agent_id, currency_id, gain_amount, commission_percent_applied]
  );
  return result.rows[0];
};

//  Obtenir le total des gains du mois en cours pour un agent et une devise
export const getCurrentMonthTotalByAgentAndCurrency = async (agent_id, currency_id) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const result = await pool.query(
    `SELECT COALESCE(SUM(gain_amount), 0) AS current_month_total
     FROM gains
     WHERE agent_id = $1 
       AND currency_id = $2
       AND EXTRACT(YEAR FROM created_at) = $3
       AND EXTRACT(MONTH FROM created_at) = $4`,
    [agent_id, currency_id, currentYear, currentMonth]
  );
  return parseFloat(result.rows[0].current_month_total);
};

//  Supprimer un gain
export const deleteGain = async (id) => {
  const result = await pool.query(`DELETE FROM gains WHERE id = $1 RETURNING *`, [id]);
  return result.rows[0];
};