import { pool } from '../config/db.js';

// =========================
// Création transaction (publique, client)
// =========================
export const createTransaction = async ({
  from_country_id,
  to_country_id,
  sender_phone,
  receiver_phone,
  sender_method_id,
  receiver_method_id,
  send_amount,
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Récupérer le taux de change
    const rateRes = await client.query(
      `SELECT rate FROM rates 
       WHERE from_currency_id = (
         SELECT country_id FROM payment_methods WHERE id = $1
       ) AND to_currency_id = (
         SELECT country_id FROM payment_methods WHERE id = $2
       )
       ORDER BY created_at DESC LIMIT 1`,
      [sender_method_id, receiver_method_id]
    );
    if (rateRes.rows.length === 0) throw new Error('Taux indisponible');
    const rate_applied = parseFloat(rateRes.rows[0].rate);

    // 2. Calcul du montant reçu
    const receive_amount = send_amount * rate_applied;

    // 3. Choisir un agent + numéro autorisé
    const numRes = await client.query(
      `SELECT an.id, an.agent_id
       FROM authorized_numbers an
       JOIN agents a ON an.agent_id = a.id
       WHERE an.country_id = $1
         AND an.payment_method_id = $2
         AND an.is_active = true
         AND a.is_active = true
       LIMIT 1`,
      [from_country_id, sender_method_id]
    );
    if (numRes.rows.length === 0) throw new Error('Aucun agent disponible');
    const { id: authorized_number_id, agent_id: assigned_agent_id } = numRes.rows[0];

    // 4. Générer un tracking code aléatoire
    const tracking_code = 'TRX' + Date.now().toString().slice(-8);

    // 5. Commission fixe (5%)
    const commission_applied = 5;

    // 6. Expiration après 10 minutes
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);

    // 7. Insérer transaction
    const insertRes = await client.query(
      `INSERT INTO transactions (
        tracking_code,
        from_country_id, to_country_id,
        sender_phone, receiver_phone,
        sender_method_id, receiver_method_id,
        send_amount, receive_amount,
        rate_applied, commission_applied,
        status, assigned_agent_id, authorized_number_id,
        expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'en_attente',$12,$13,$14)
      RETURNING *`,
      [
        tracking_code,
        from_country_id, to_country_id,
        sender_phone, receiver_phone,
        sender_method_id, receiver_method_id,
        send_amount, receive_amount,
        rate_applied, commission_applied,
        assigned_agent_id, authorized_number_id,
        expires_at
      ]
    );

    await client.query('COMMIT');
    return insertRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Valider une transaction
// =========================
export const validateTransaction = async (transaction_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer la transaction
    const trxRes = await client.query(
      `SELECT * FROM transactions WHERE id = $1 FOR UPDATE`,
      [transaction_id]
    );
    if (trxRes.rows.length === 0) throw new Error('Transaction introuvable');
    const trx = trxRes.rows[0];
    if (trx.status !== 'en_attente') throw new Error('Transaction déjà traitée');

    // Marquer comme validée
    await client.query(
      `UPDATE transactions SET status = 'effectuee', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [transaction_id]
    );

    // Récupérer la devise de réception (pour les gains/solde)
    const currencyRes = await client.query(
      `SELECT currency_id FROM payment_methods WHERE id = $1`,
      [trx.receiver_method_id]
    );
    if (currencyRes.rows.length === 0) throw new Error('Devise introuvable');
    const currency_id = currencyRes.rows[0].currency_id;

    // Calcul du gain
    const gain_amount = (trx.send_amount * trx.commission_applied) / 100;

    // Insérer dans la table gains
    await client.query(
      `INSERT INTO gains (transaction_id, agent_id, currency_id, gain_amount, commission_percent_applied)
       VALUES ($1, $2, $3, $4, $5)`,
      [transaction_id, trx.assigned_agent_id, currency_id, gain_amount, trx.commission_applied]
    );

    // Créditer la balance de l’agent
    await client.query(
      `INSERT INTO balances (agent_id, currency_id, balance_amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (agent_id, currency_id)
       DO UPDATE SET balance_amount = balances.balance_amount + $3`,
      [trx.assigned_agent_id, currency_id, trx.receive_amount]
    );

    await client.query('COMMIT');
    return { message: 'Transaction validée avec succès' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Annuler une transaction
// =========================
export const cancelTransaction = async (transaction_id) => {
  const { rowCount } = await pool.query(
    `UPDATE transactions SET status = 'echouee', cancelled_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'en_attente'`,
    [transaction_id]
  );
  if (rowCount === 0) throw new Error('Transaction introuvable ou déjà traitée');
  return { message: 'Transaction annulée avec succès' };
};

// =========================
// Récupération
// =========================
export const findTransactionById = async (id) => {
  const { rows } = await pool.query(`SELECT * FROM transactions WHERE id = $1`, [id]);
  return rows[0];
};

export const findTransactionByTrackingCode = async (code) => {
  const { rows } = await pool.query(`SELECT * FROM transactions WHERE tracking_code = $1`, [code]);
  return rows[0];
};
