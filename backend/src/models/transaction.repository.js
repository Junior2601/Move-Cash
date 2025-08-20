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
// Vérifier expiration transaction
// =========================
const checkAndExpireTransaction = async (trx) => {
  if (trx.status === 'en_attente' && new Date() > new Date(trx.expires_at)) {
    await pool.query(
      `UPDATE transactions 
       SET status = 'expiree', updated_at = NOW()
       WHERE id = $1`,
      [trx.id]
    );
    return { ...trx, status: 'expiree' };
  }
  return trx;
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
    let trx = trxRes.rows[0];

    // Vérifier si expirée
    trx = await checkAndExpireTransaction(trx);
    if (trx.status !== 'en_attente') throw new Error(`Transaction déjà traitée ou ${trx.status}`);

    // Marquer comme validée
    await client.query(
      `UPDATE transactions SET status = 'effectuee', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [transaction_id]
    );

    // Récupérer la devise de réception
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
      `INSERT INTO balances (agent_id, currency_id, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (agent_id, currency_id)
       DO UPDATE SET amount = balances.amount + $3`,
      [trx.assigned_agent_id, currency_id, trx.send_amount]
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
// Récupération avec expiration automatique
// =========================
export const findTransactionById = async (id) => {
  const { rows } = await pool.query(`SELECT * FROM transactions WHERE id = $1`, [id]);
  if (rows.length === 0) return null;
  return checkAndExpireTransaction(rows[0]);
};

export const findTransactionByTrackingCode = async (code) => {
  const { rows } = await pool.query(`SELECT * FROM transactions WHERE tracking_code = $1`, [code]);
  if (rows.length === 0) return null;
  return checkAndExpireTransaction(rows[0]);
};

// Un agent initie une redirection
export const redirectTransaction = async ({
  transaction_id,
  from_agent_id,
  to_agent_id,
  redirected_amount,
  reason,
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Vérifier si transaction existe et appartient bien à from_agent
    const { rows: trxRows } = await client.query(
      `SELECT * FROM transactions WHERE id = $1 FOR UPDATE`,
      [transaction_id]
    );
    if (!trxRows.length) throw new Error('Transaction introuvable');
    const trx = trxRows[0];

    if (trx.status === 'annulee') throw new Error('Impossible de rediriger une transaction annulée');
    if (trx.assigned_agent_id !== from_agent_id) throw new Error("Cet agent n'est pas assigné à la transaction");

    // Vérifier la devise
    const { rows: cr } = await client.query(
      `SELECT currency_id FROM payment_methods WHERE id = $1`,
      [trx.receiver_method_id]
    );
    if (!cr.length) throw new Error('Devise introuvable');
    const currency_id = cr[0].currency_id;

    // Insérer la redirection (statut pending)
    const { rows: redirRows } = await client.query(
      `INSERT INTO redirections (transaction_id, from_agent_id, to_agent_id, redirected_amount, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [transaction_id, from_agent_id, to_agent_id, redirected_amount, reason]
    );

    await client.query('COMMIT');
    return redirRows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// L’agent destinataire accepte la redirection
export const acceptRedirection = async (redirection_id, agent_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: redirRows } = await client.query(
      `SELECT * FROM redirections WHERE id = $1 FOR UPDATE`,
      [redirection_id]
    );
    if (!redirRows.length) throw new Error('Redirection introuvable');
    const redir = redirRows[0];
    if (redir.status !== 'pending') throw new Error('Redirection déjà traitée');

    if (redir.to_agent_id !== agent_id) throw new Error("Cet agent n'est pas autorisé à accepter");

    // Récupérer transaction
    const { rows: trxRows } = await client.query(
      `SELECT * FROM transactions WHERE id = $1 FOR UPDATE`,
      [redir.transaction_id]
    );
    const trx = trxRows[0];

    // Vérifier la devise
    const { rows: cr } = await client.query(
      `SELECT currency_id FROM payment_methods WHERE id = $1`,
      [trx.receiver_method_id]
    );
    const currency_id = cr[0].currency_id;

    const gain_amount = (trx.receive_amount * trx.commission_applied) / 100;

    if (trx.status === 'effectuee') {
      // Retirer de l'ancien agent
      await client.query(
        `UPDATE balances
         SET amount = amount - $1, last_updated = NOW()
         WHERE agent_id = $2 AND currency_id = $3`,
        [redir.redirected_amount, redir.from_agent_id, currency_id]
      );

      // Ajouter au nouvel agent
      await client.query(
        `INSERT INTO balances (agent_id, currency_id, amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (agent_id, currency_id)
         DO UPDATE SET amount = balances.amount + EXCLUDED.amount, last_updated = NOW()`,
        [redir.to_agent_id, currency_id, redir.redirected_amount]
      );

      // Mettre à jour le gain (transféré au nouvel agent)
      await client.query(
        `UPDATE gains
         SET agent_id = $1, gain_amount = $2
         WHERE transaction_id = $3`,
        [redir.to_agent_id, gain_amount, trx.id]
      );
    }

    // Mettre à jour la transaction (agent assigné change)
    await client.query(
      `UPDATE transactions
       SET assigned_agent_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [redir.to_agent_id, trx.id]
    );

    // Mettre à jour redirection comme acceptée
    const { rows: updated } = await client.query(
      `UPDATE redirections
       SET status = 'accepted', processed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [redirection_id]
    );

    await client.query('COMMIT');
    return updated[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// L’agent destinataire rejette la redirection
export const rejectRedirection = async (redirection_id, agent_id) => {
  const { rows } = await pool.query(
    `UPDATE redirections
     SET status = 'rejected', processed_at = NOW()
     WHERE id = $1 AND to_agent_id = $2 AND status = 'pending'
     RETURNING *`,
    [redirection_id, agent_id]
  );
  if (!rows.length) throw new Error('Redirection introuvable ou déjà traitée');
  return rows[0];
};