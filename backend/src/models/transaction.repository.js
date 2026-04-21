// src/models/transaction.repository.js
import { pool, getClientWithTimeout } from '../config/db.js';
import { logHistory } from './history.repository.js';
import { 
  notifyAgentForTransaction, 
  notifyAgentForRedirection, 
  notifyAgentRedirectionStatus 
} from "../services/email.service.js";

// Fonction utilitaire pour gérer l'envoi d'emails sans bloquer
const sendEmailSafely = async (emailFunction, ...args) => {
  try {
    console.log('📧 Tentative d\'envoi d\'email...');
    const result = await emailFunction(...args);
    
    if (!result.success) {
      console.warn('⚠️ Email non envoyé (continuer sans bloquer):', result.error);
    } else {
      console.log('✅ Email envoyé avec succès');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erreur critique email (ignorée pour continuer):', error);
    return { success: false, error: error.message };
  }
};

// Fonction helper pour acquérir une connexion avec timeout
const acquireClient = async () => {
  try {
    return await getClientWithTimeout(8000);
  } catch (error) {
    console.error('❌ Impossible d\'acquérir une connexion DB:', error.message);
    throw new Error('Service temporairement indisponible. Veuillez réessayer.');
  }
};

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
  const client = await acquireClient();
  try {
    await client.query('BEGIN');

    console.log('🔄 Début création transaction:', {
      from_country_id, to_country_id, sender_phone, receiver_phone,
      sender_method_id, receiver_method_id, send_amount
    });

    // 1. RÉCUPÉRER LE TAUX DE CHANGE
    let rate_applied = 0.85;

    try {
      console.log('🔍 Recherche du taux de change...');
      
      const currenciesRes = await client.query(
        `SELECT 
            fc.currency_id as from_currency_id,
            tc.currency_id as to_currency_id
        FROM countries fc, countries tc
        WHERE fc.id = $1 AND tc.id = $2`,
        [from_country_id, to_country_id]
      );
      
      if (currenciesRes.rows.length > 0) {
        const { from_currency_id, to_currency_id } = currenciesRes.rows[0];
        
        const rateRes = await client.query(
          `SELECT rate FROM rates 
          WHERE from_currency_id = $1 
            AND to_currency_id = $2 
            AND is_active = true
          ORDER BY created_at DESC LIMIT 1`,
          [from_currency_id, to_currency_id]
        );
        
        if (rateRes.rows.length > 0) {
          rate_applied = parseFloat(rateRes.rows[0].rate);
          console.log('✅ Taux trouvé:', rate_applied);
        }
      }
    } catch (rateError) {
      console.warn('⚠️ Erreur récupération taux, utilisation défaut:', rateError.message);
    }

    // 2. Calcul du montant reçu
    const receive_amount = send_amount * rate_applied;
    console.log('💰 Calcul montant:', `${send_amount} × ${rate_applied} = ${receive_amount}`);

    // 3. Choisir un agent + numéro autorisé
    const numRes = await client.query(
      `SELECT an.id, an.agent_id, an.number, a.name as agent_name, a.email as agent_email
       FROM authorized_numbers an
       JOIN agents a ON an.agent_id = a.id
       WHERE (an.country_id = $1 AND an.payment_method_id = $2 AND an.is_active = true AND a.is_active = true)
          OR (an.country_id = $1 AND an.is_active = true AND a.is_active = true)
          OR (an.is_active = true AND a.is_active = true)
       ORDER BY 
         CASE 
           WHEN an.country_id = $1 AND an.payment_method_id = $2 THEN 1
           WHEN an.country_id = $1 THEN 2
           ELSE 3
         END,
         RANDOM()
       LIMIT 1`,
      [from_country_id, sender_method_id]
    );

    if (numRes.rows.length === 0) {
      throw new Error('Aucun agent disponible dans le système. Veuillez contacter l\'administrateur.');
    }
    
    const { 
      id: authorized_number_id, 
      agent_id: assigned_agent_id, 
      number: authorized_number,
      agent_name,
      agent_email 
    } = numRes.rows[0];
    
    console.log('✅ Agent trouvé:', { agent_id: assigned_agent_id, agent_name });

    // 4. Générer un tracking code
    const tracking_code = 'TRX' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 5).toUpperCase();

    // 5. Commission fixe (0.75%)
    const commission_applied = 0.75;

    // 6. Insertion transaction
    const insertRes = await client.query(
      `INSERT INTO transactions (
        tracking_code,
        from_country_id, to_country_id,
        sender_phone, receiver_phone,
        sender_method_id, receiver_method_id,
        send_amount, receive_amount,
        rate_applied, commission_applied,
        status, assigned_agent_id, authorized_number_id,
        expires_at,
        client_validated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, (NOW() AT TIME ZONE 'UTC') + INTERVAL '3 minutes', $15)
      RETURNING *`,
      [
        tracking_code,
        from_country_id, to_country_id,
        sender_phone, receiver_phone,
        sender_method_id, receiver_method_id,
        send_amount, receive_amount,
        rate_applied, commission_applied,
        'en_attente',
        assigned_agent_id, authorized_number_id,
        false
      ]
    );

    const transaction = insertRes.rows[0];
    console.log('✅ Transaction créée avec ID:', transaction.id);

    // 🔎 Log de création de transaction
    await logHistory({
      action_type: 'transaction_created',
      actor_type: 'client',
      actor_id: null,
      entity_type: 'transaction',
      entity_id: transaction.id,
      description: `Transaction créée - Montant: ${send_amount}, Code: ${tracking_code}`,
      metadata: { 
        from_country_id, 
        to_country_id, 
        send_amount, 
        receive_amount,
        rate_applied,
        tracking_code,
        agent_id: assigned_agent_id
      }
    }, client);

    // 7. Notifier l'agent par email (asynchrone)
    if (agent_email) {
      const [countriesRes, methodsRes] = await Promise.all([
        client.query(
          `SELECT 
              c.id, 
              c.name AS country_name,
              curr.code AS currency_code,
              curr.symbol AS currency_symbol
          FROM countries c
          INNER JOIN currencies curr ON c.currency_id = curr.id
          WHERE c.id IN ($1, $2)`,
          [from_country_id, to_country_id]
        ),
        client.query(
          `SELECT id, method FROM payment_methods WHERE id IN ($1, $2)`,
          [sender_method_id, receiver_method_id]
        )
      ]);

      const countries = {};
      countriesRes.rows.forEach(country => {
        countries[country.id] = {
          name: country.country_name,
          currency_code: country.currency_code,
          currency_symbol: country.currency_symbol
        };
      });

      const methods = {};
      methodsRes.rows.forEach(method => {
        methods[method.id] = method.method;
      });

      const transactionWithDetails = {
        ...transaction,
        from_country_name: countries[from_country_id]?.name || 'Inconnu',
        to_country_name: countries[to_country_id]?.name || 'Inconnu',
        from_currency_code: countries[from_country_id]?.currency_code || 'EUR',
        to_currency_code: countries[to_country_id]?.currency_code || 'EUR',
        from_currency_symbol: countries[from_country_id]?.currency_symbol || '€',
        to_currency_symbol: countries[to_country_id]?.currency_symbol || '€',
        sender_method_name: methods[sender_method_id] || 'Inconnu',
        receiver_method_name: methods[receiver_method_id] || 'Inconnu',
        authorized_number: authorized_number,
        agent_name: agent_name
      };

      sendEmailSafely(notifyAgentForTransaction, agent_email, transactionWithDetails)
        .then(result => {
          if (result.success) {
            console.log('✅ Notification agent envoyée avec succès');
          }
        })
        .catch(emailError => {
          console.warn('⚠️ Erreur email ignorée:', emailError.message);
        });
    }

    await client.query('COMMIT');
    console.log('🎉 Transaction finalisée avec succès');
    return transaction;
  } catch (err) {
    await client.query('ROLLBACK').catch(rollbackError => {
      console.error('❌ Erreur lors du rollback:', rollbackError);
    });
    console.error('💥 Erreur création transaction:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Validation par le client
// =========================
export const clientValidateTransaction = async (transaction_id) => {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');

    console.log('🔄 Validation client transaction:', transaction_id);

    const trxRes = await client.query(
      `SELECT * FROM transactions WHERE id = $1 FOR UPDATE SKIP LOCKED`,
      [transaction_id]
    );
    
    if (trxRes.rows.length === 0) {
      throw new Error('Transaction introuvable');
    }
    
    const trx = trxRes.rows[0];

    if (trx.status !== 'en_attente') {
      throw new Error(`Transaction déjà traitée ou ${trx.status}`);
    }

    await client.query(
      `UPDATE transactions 
       SET client_validated = true, client_validated_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [transaction_id]
    );

    await logHistory({
      action_type: 'client_validation',
      actor_type: 'client',
      actor_id: null,
      entity_type: 'transaction',
      entity_id: transaction_id,
      description: `Transaction validée par le client - Code: ${trx.tracking_code}`,
      metadata: { 
        tracking_code: trx.tracking_code,
        send_amount: trx.send_amount
      }
    }, client);

    await client.query('COMMIT');
    console.log('✅ Validation client réussie:', transaction_id);
    return { message: 'Transaction validée par le client avec succès' };
  } catch (err) {
    await client.query('ROLLBACK').catch(rollbackError => {
      console.error('❌ Erreur lors du rollback:', rollbackError);
    });
    console.error('❌ Erreur validation client:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Valider une transaction agent ou admin
// =========================
// Modifier la fonction validateTransaction pour vérifier l'autorisation
export const validateTransaction = async (transaction_id, actor) => {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');

    console.log('🔄 Validation transaction par', actor.role, ':', transaction_id);

    const trxRes = await client.query(
      `SELECT * FROM transactions WHERE id = $1 FOR UPDATE SKIP LOCKED`,
      [transaction_id]
    );
    
    if (trxRes.rows.length === 0) {
      throw new Error('Transaction introuvable');
    }
    
    const trx = trxRes.rows[0];

    // Vérifier l'expiration
    if (!trx.client_validated) {
      const now = new Date();
      const expiresAt = new Date(trx.expires_at);
      
      if (trx.status === 'en_attente' && now > expiresAt && !trx.client_validated) {
        await client.query(
          `UPDATE transactions 
           SET status = 'expiree', updated_at = NOW()
           WHERE id = $1 AND status = 'en_attente'
           RETURNING *`,
          [trx.id]
        );
        throw new Error('Transaction expirée');
      }
    }
    
    if (trx.status !== 'en_attente') {
      throw new Error(`Transaction déjà traitée ou ${trx.status}`);
    }

    // NOUVEAU: Vérification des droits selon le type d'acteur
    if (actor.role === 'agent') {
      // Vérifier si l'agent est autorisé à valider
      const agentAuthRes = await client.query(
        `SELECT can_validate FROM agents WHERE id = $1 AND is_active = true`,
        [actor.id]
      );
      
      if (agentAuthRes.rows.length === 0 || !agentAuthRes.rows[0].can_validate) {
        throw new Error('Vous n\'êtes pas autorisé à valider des transactions. Veuillez contacter l\'administrateur.');
      }
      
      // Vérifier que l'agent est bien assigné à cette transaction
      if (trx.assigned_agent_id !== actor.id) {
        throw new Error('Vous n\'êtes pas assigné à cette transaction');
      }
    }

    // Marquer comme validée avec qui a traité
    await client.query(
      `UPDATE transactions 
       SET status = 'effectuee', 
           completed_at = NOW(), 
           updated_at = NOW(),
           processed_by_type = $2,
           processed_by_id = $3
       WHERE id = $1`,
      [transaction_id, actor.role, actor.id]
    );

    // Récupérer les devises
    const currenciesRes = await client.query(
      `SELECT 
          fc.currency_id as from_currency_id,
          tc.currency_id as to_currency_id,
          from_curr.code as from_currency_code,
          from_curr.symbol as from_currency_symbol,
          to_curr.code as to_currency_code,
          to_curr.symbol as to_currency_symbol
       FROM transactions t
       JOIN countries fc ON t.from_country_id = fc.id
       JOIN countries tc ON t.to_country_id = tc.id
       JOIN currencies from_curr ON fc.currency_id = from_curr.id
       JOIN currencies to_curr ON tc.currency_id = to_curr.id
       WHERE t.id = $1`,
      [transaction_id]
    );
    
    if (currenciesRes.rows.length === 0) {
      throw new Error('Devises introuvables');
    }
    
    const { 
      from_currency_id, 
      to_currency_id, 
      from_currency_code, 
      to_currency_code,
      from_currency_symbol,
      to_currency_symbol
    } = currenciesRes.rows[0];

    // Calcul du gain
    const gain_amount = (trx.send_amount * trx.commission_applied) / 100;

    // Gestion des gains cumulatifs
    const existingGainRes = await client.query(
      `SELECT id, gain_amount FROM gains 
       WHERE agent_id = $1 AND currency_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [trx.assigned_agent_id, from_currency_id]
    );

    let total_gain_amount = gain_amount;
    let is_new_gain = true;

    if (existingGainRes.rows.length > 0) {
      const existingGain = existingGainRes.rows[0];
      total_gain_amount = parseFloat(existingGain.gain_amount) + gain_amount;
      
      await client.query(
        `UPDATE gains 
         SET gain_amount = $1, updated_at = NOW()
         WHERE id = $2`,
        [total_gain_amount, existingGain.id]
      );
      
      is_new_gain = false;
    } else {
      await client.query(
        `INSERT INTO gains (transaction_id, agent_id, currency_id, gain_amount, commission_percent_applied)
         VALUES ($1, $2, $3, $4, $5)`,
        [transaction_id, trx.assigned_agent_id, from_currency_id, gain_amount, trx.commission_applied]
      );
    }

    // Double mouvement de balance
    await client.query(
      `INSERT INTO balances (agent_id, currency_id, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (agent_id, currency_id)
       DO UPDATE SET amount = balances.amount + $3, last_updated = NOW()`,
      [trx.assigned_agent_id, from_currency_id, trx.send_amount]
    );

    await client.query(
      `INSERT INTO balances (agent_id, currency_id, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (agent_id, currency_id)
       DO UPDATE SET amount = balances.amount - $3, last_updated = NOW()`,
      [trx.assigned_agent_id, to_currency_id, trx.receive_amount]
    );

    // 🔎 Log de validation
    await logHistory({
      action_type: 'transaction_validated',
      actor_type: actor.role,
      actor_id: actor.id,
      entity_type: 'transaction',
      entity_id: transaction_id,
      description: `Transaction validée - Envoi: ${trx.send_amount} ${from_currency_code}, Réception: ${trx.receive_amount} ${to_currency_code}`,
      metadata: { 
        agent_id: trx.assigned_agent_id,
        validated_by_role: actor.role,
        validated_by_id: actor.id,
        transaction_amount_send: trx.send_amount,
        transaction_amount_receive: trx.receive_amount,
        gain_amount: gain_amount,
        total_gain_amount: total_gain_amount,
        from_currency: from_currency_code,
        to_currency: to_currency_code,
        validated_by: actor.id,
        gain_accumulated: !is_new_gain
      }
    }, client);

    await client.query('COMMIT');
    console.log('✅ Transaction validée avec succès:', transaction_id);
    return { 
      message: 'Transaction validée avec succès',
      validated_by: actor.role,
      transaction_amount_send: trx.send_amount,
      transaction_amount_receive: trx.receive_amount,
      gain_amount: gain_amount,
      total_gain_amount: total_gain_amount,
      from_currency: from_currency_code,
      to_currency: to_currency_code,
      gain_accumulated: !is_new_gain
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur validation transaction:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Annuler une transaction
// =========================
export const cancelTransaction = async (transaction_id, actor) => {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');

    // Vérifier les droits pour l'agent
    if (actor.role === 'agent') {
      const agentAuthRes = await client.query(
        `SELECT can_validate FROM agents WHERE id = $1 AND is_active = true`,
        [actor.id]
      );
      
      if (agentAuthRes.rows.length === 0 || !agentAuthRes.rows[0].can_validate) {
        throw new Error('Vous n\'êtes pas autorisé à annuler des transactions.');
      }
    }

    const { rows } = await client.query(
      `UPDATE transactions 
       SET status = 'echouee', 
           cancelled_at = NOW(), 
           updated_at = NOW(),
           processed_by_type = $2,
           processed_by_id = $3
       WHERE id = $1 AND status = 'en_attente'
       RETURNING *`,
      [transaction_id, actor.role, actor.id]
    );
    
    if (rows.length === 0) {
      throw new Error('Transaction introuvable ou déjà traitée');
    }
    
    const transaction = rows[0];

    await logHistory({
      action_type: 'transaction_cancelled',
      actor_type: actor.role,
      actor_id: actor.id,
      entity_type: 'transaction',
      entity_id: transaction_id,
      description: `Transaction annulée - Code: ${transaction.tracking_code}`,
      metadata: { 
        original_status: 'en_attente',
        cancelled_by: actor.id
      }
    }, client);

    await client.query('COMMIT');
    console.log('✅ Transaction annulée:', transaction_id);
    return { message: 'Transaction annulée avec succès' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Récupération transaction par ID
// =========================
export const findTransactionById = async (transaction_id) => {
  const client = await acquireClient();
  try {
    const { rows } = await client.query(
      `SELECT 
        t.*,
        a.name as agent_name,
        an.number as authorized_number,
        fc.name as from_country_name,
        tc.name as to_country_name,
        sm.method as sender_method_name,
        rm.method as receiver_method_name,
        from_curr.code as from_currency_code,
        to_curr.code as to_currency_code
       FROM transactions t
       LEFT JOIN agents a ON t.assigned_agent_id = a.id
       LEFT JOIN authorized_numbers an ON t.authorized_number_id = an.id
       LEFT JOIN countries fc ON t.from_country_id = fc.id
       LEFT JOIN countries tc ON t.to_country_id = tc.id
       LEFT JOIN payment_methods sm ON t.sender_method_id = sm.id
       LEFT JOIN payment_methods rm ON t.receiver_method_id = rm.id
       LEFT JOIN currencies from_curr ON fc.currency_id = from_curr.id
       LEFT JOIN currencies to_curr ON tc.currency_id = to_curr.id
       WHERE t.id = $1`,
      [transaction_id]
    );
    
    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  } catch (err) {
    console.error('❌ Erreur recherche transaction:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Récupération transaction par tracking code
// =========================
export const findTransactionByTrackingCode = async (tracking_code) => {
  const client = await acquireClient();
  try {
    const { rows } = await client.query(
      `SELECT 
        t.*,
        a.name as agent_name,
        an.number as authorized_number,
        fc.name as from_country_name,
        tc.name as to_country_name,
        sm.method as sender_method_name,
        rm.method as receiver_method_name,
        from_curr.code as from_currency_code,
        to_curr.code as to_currency_code
       FROM transactions t
       LEFT JOIN agents a ON t.assigned_agent_id = a.id
       LEFT JOIN authorized_numbers an ON t.authorized_number_id = an.id
       LEFT JOIN countries fc ON t.from_country_id = fc.id
       LEFT JOIN countries tc ON t.to_country_id = tc.id
       LEFT JOIN payment_methods sm ON t.sender_method_id = sm.id
       LEFT JOIN payment_methods rm ON t.receiver_method_id = rm.id
       LEFT JOIN currencies from_curr ON fc.currency_id = from_curr.id
       LEFT JOIN currencies to_curr ON tc.currency_id = to_curr.id
       WHERE t.tracking_code = $1`,
      [tracking_code]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  } catch (err) {
    console.error('❌ Erreur recherche transaction par tracking:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Récupérer toutes les transactions (avec pagination et filtres)
// =========================
export const findAllTransactions = async ({
  page = 1,
  limit = 10,
  status = null,
  agent_id = null,
  from_country_id = null,
  to_country_id = null,
  start_date = null,
  end_date = null,
  tracking_code = null
} = {}) => {
  const client = await acquireClient();
  try {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;
    
    let query = `
      SELECT 
        t.*,
        fc.name as from_country_name,
        tc.name as to_country_name,
        sm.method as sender_method_name,
        rm.method as receiver_method_name,
        a.name as agent_name,
        from_curr.code as from_currency_code,
        to_curr.code as to_currency_code,
        an.number as authorized_number
      FROM transactions t
      LEFT JOIN countries fc ON t.from_country_id = fc.id
      LEFT JOIN countries tc ON t.to_country_id = tc.id
      LEFT JOIN payment_methods sm ON t.sender_method_id = sm.id
      LEFT JOIN payment_methods rm ON t.receiver_method_id = rm.id
      LEFT JOIN agents a ON t.assigned_agent_id = a.id
      LEFT JOIN currencies from_curr ON fc.currency_id = from_curr.id
      LEFT JOIN currencies to_curr ON tc.currency_id = to_curr.id
      LEFT JOIN authorized_numbers an ON t.authorized_number_id = an.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    const isValidParam = (value) => {
      return value !== null && value !== undefined && value !== '' && value !== 'null' && value !== 'undefined';
    };

    if (isValidParam(status)) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (isValidParam(agent_id)) {
      const agentIdNum = parseInt(agent_id);
      if (!isNaN(agentIdNum)) {
        paramCount++;
        query += ` AND t.assigned_agent_id = $${paramCount}`;
        params.push(agentIdNum);
      }
    }

    if (isValidParam(from_country_id)) {
      const fromCountryIdNum = parseInt(from_country_id);
      if (!isNaN(fromCountryIdNum)) {
        paramCount++;
        query += ` AND t.from_country_id = $${paramCount}`;
        params.push(fromCountryIdNum);
      }
    }

    if (isValidParam(to_country_id)) {
      const toCountryIdNum = parseInt(to_country_id);
      if (!isNaN(toCountryIdNum)) {
        paramCount++;
        query += ` AND t.to_country_id = $${paramCount}`;
        params.push(toCountryIdNum);
      }
    }

    if (isValidParam(start_date)) {
      paramCount++;
      query += ` AND DATE(t.created_at) >= $${paramCount}`;
      params.push(start_date);
    }

    if (isValidParam(end_date)) {
      paramCount++;
      query += ` AND DATE(t.created_at) <= $${paramCount}`;
      params.push(end_date);
    }

    if (isValidParam(tracking_code)) {
      paramCount++;
      query += ` AND t.tracking_code ILIKE $${paramCount}`;
      params.push(`%${tracking_code}%`);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limitNum, offset);

    const { rows } = await client.query(query, params);

    // Compter le total
    let countQuery = `SELECT COUNT(*) FROM transactions t WHERE 1=1`;
    const countParams = [];
    let countParamCount = 0;

    if (isValidParam(status)) {
      countParamCount++;
      countQuery += ` AND t.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (isValidParam(agent_id)) {
      const agentIdNum = parseInt(agent_id);
      if (!isNaN(agentIdNum)) {
        countParamCount++;
        countQuery += ` AND t.assigned_agent_id = $${countParamCount}`;
        countParams.push(agentIdNum);
      }
    }

    if (isValidParam(from_country_id)) {
      const fromCountryIdNum = parseInt(from_country_id);
      if (!isNaN(fromCountryIdNum)) {
        countParamCount++;
        countQuery += ` AND t.from_country_id = $${countParamCount}`;
        countParams.push(fromCountryIdNum);
      }
    }

    if (isValidParam(to_country_id)) {
      const toCountryIdNum = parseInt(to_country_id);
      if (!isNaN(toCountryIdNum)) {
        countParamCount++;
        countQuery += ` AND t.to_country_id = $${countParamCount}`;
        countParams.push(toCountryIdNum);
      }
    }

    if (isValidParam(start_date)) {
      countParamCount++;
      countQuery += ` AND DATE(t.created_at) >= $${countParamCount}`;
      countParams.push(start_date);
    }

    if (isValidParam(end_date)) {
      countParamCount++;
      countQuery += ` AND DATE(t.created_at) <= $${countParamCount}`;
      countParams.push(end_date);
    }

    if (isValidParam(tracking_code)) {
      countParamCount++;
      countQuery += ` AND t.tracking_code ILIKE $${countParamCount}`;
      countParams.push(`%${tracking_code}%`);
    }

    const countResult = await client.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      transactions: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  } catch (err) {
    console.error('❌ Erreur récupération transactions:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Récupérer les transactions d'un agent spécifique
// =========================
export const findTransactionsByAgent = async (agent_id, {
  page = 1,
  limit = 10,
  status = null,
  start_date = null,
  end_date = null
} = {}) => {
  const client = await acquireClient();
  try {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        t.*,
        fc.name as from_country_name,
        tc.name as to_country_name,
        from_curr.code as from_currency_code,          
        to_curr.code as to_currency_code,              
        sm.method as sender_method_name,
        rm.method as receiver_method_name,
        an.number as authorized_number
      FROM transactions t
      LEFT JOIN countries fc ON t.from_country_id = fc.id
      LEFT JOIN countries tc ON t.to_country_id = tc.id
      LEFT JOIN currencies from_curr ON fc.currency_id = from_curr.id  
      LEFT JOIN currencies to_curr ON tc.currency_id = to_curr.id      
      LEFT JOIN payment_methods sm ON t.sender_method_id = sm.id
      LEFT JOIN payment_methods rm ON t.receiver_method_id = rm.id
      LEFT JOIN authorized_numbers an ON t.authorized_number_id = an.id
      WHERE t.assigned_agent_id = $1
    `;
    
    const params = [agent_id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (start_date) {
      paramCount++;
      query += ` AND t.created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND t.created_at <= $${paramCount}`;
      params.push(end_date);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const { rows } = await client.query(query, params);

    // Compter le total
    let countQuery = `SELECT COUNT(*) FROM transactions WHERE assigned_agent_id = $1`;
    const countParams = [agent_id];
    let countParamCount = 1;

    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }

    if (start_date) {
      countParamCount++;
      countQuery += ` AND created_at >= $${countParamCount}`;
      countParams.push(start_date);
    }

    if (end_date) {
      countParamCount++;
      countQuery += ` AND created_at <= $${countParamCount}`;
      countParams.push(end_date);
    }

    const countResult = await client.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      transactions: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (err) {
    console.error('❌ Erreur transactions agent:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Récupérer les statistiques d'un agent
// =========================
export const getAgentStats = async (agent_id, filters = {}) => {
  const client = await acquireClient();
  try {
    const {
      start_date = null,
      end_date = null,
      status = null
    } = filters;

    // Statistiques par statut
    let statsQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(send_amount), 0) as total_send_amount,
        COALESCE(SUM(receive_amount), 0) as total_receive_amount
      FROM transactions
      WHERE assigned_agent_id = $1
    `;
    
    const statsParams = [agent_id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      statsQuery += ` AND status = $${paramCount}`;
      statsParams.push(status);
    }

    if (start_date) {
      paramCount++;
      statsQuery += ` AND created_at >= $${paramCount}`;
      statsParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      statsQuery += ` AND created_at <= $${paramCount}`;
      statsParams.push(end_date);
    }

    statsQuery += ` GROUP BY status`;

    const { rows: statsRows } = await client.query(statsQuery, statsParams);

    // Récupérer les soldes par devise
    const balanceQuery = `
      SELECT 
        c.id as currency_id,
        c.code as currency_code,
        c.name as currency_name,
        c.symbol as currency_symbol,
        COALESCE(b.amount, 0) as balance
      FROM currencies c
      LEFT JOIN balances b ON c.id = b.currency_id AND b.agent_id = $1
      WHERE c.is_active = true
      ORDER BY c.code
    `;

    const { rows: balanceRows } = await client.query(balanceQuery, [agent_id]);

    // Calculer les totaux
    const totals = {
      total_transactions: 0,
      total_send_amount: 0,
      total_receive_amount: 0
    };

    const statsByStatus = {};
    
    statsRows.forEach(row => {
      statsByStatus[row.status] = {
        count: parseInt(row.count),
        total_send_amount: parseFloat(row.total_send_amount),
        total_receive_amount: parseFloat(row.total_receive_amount)
      };
      
      totals.total_transactions += parseInt(row.count);
      totals.total_send_amount += parseFloat(row.total_send_amount);
      totals.total_receive_amount += parseFloat(row.total_receive_amount);
    });

    // Performance (taux de réussite)
    const successRate = totals.total_transactions > 0 
      ? ((statsByStatus['effectuee']?.count || 0) / totals.total_transactions * 100).toFixed(1)
      : 0;

    return {
      agent_id,
      by_status: statsByStatus,
      totals,
      performance: {
        success_rate: parseFloat(successRate)
      },
      current_balance: balanceRows
    };
  } catch (err) {
    console.error('❌ Erreur statistiques agent:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Récupérer l'historique des gains d'un agent
// =========================
export const getAgentGainsHistory = async (agent_id, {
  page = 1,
  limit = 10,
  start_date = null,
  end_date = null
} = {}) => {
  const client = await acquireClient();
  try {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        g.*,
        t.tracking_code,
        t.send_amount,
        t.receive_amount,
        t.created_at as transaction_date,
        c.code as currency_code,
        c.symbol as currency_symbol,
        fc.name as from_country_name,
        tc.name as to_country_name
      FROM gains g
      JOIN transactions t ON g.transaction_id = t.id
      JOIN currencies c ON g.currency_id = c.id
      JOIN countries fc ON t.from_country_id = fc.id
      JOIN countries tc ON t.to_country_id = tc.id
      WHERE g.agent_id = $1
    `;
    
    const params = [agent_id];
    let paramCount = 1;

    if (start_date) {
      paramCount++;
      query += ` AND g.created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND g.created_at <= $${paramCount}`;
      params.push(end_date);
    }

    query += ` ORDER BY g.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const { rows } = await client.query(query, params);

    // Compter le total
    let countQuery = `SELECT COUNT(*) FROM gains WHERE agent_id = $1`;
    const countParams = [agent_id];
    let countParamCount = 1;

    if (start_date) {
      countParamCount++;
      countQuery += ` AND created_at >= $${countParamCount}`;
      countParams.push(start_date);
    }

    if (end_date) {
      countParamCount++;
      countQuery += ` AND created_at <= $${countParamCount}`;
      countParams.push(end_date);
    }

    const countResult = await client.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Calculer le total des gains
    let totalQuery = `SELECT COALESCE(SUM(gain_amount), 0) as total FROM gains WHERE agent_id = $1`;
    const totalParams = [agent_id];
    let totalParamCount = 1;

    if (start_date) {
      totalParamCount++;
      totalQuery += ` AND created_at >= $${totalParamCount}`;
      totalParams.push(start_date);
    }

    if (end_date) {
      totalParamCount++;
      totalQuery += ` AND created_at <= $${totalParamCount}`;
      totalParams.push(end_date);
    }

    const totalResult = await client.query(totalQuery, totalParams);
    const total_gains = parseFloat(totalResult.rows[0].total);

    return {
      gains: rows.map(gain => ({
        ...gain,
        gain_amount: parseFloat(gain.gain_amount),
        send_amount: parseFloat(gain.send_amount),
        receive_amount: parseFloat(gain.receive_amount)
      })),
      summary: {
        total_gains,
        total_count: total
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (err) {
    console.error('❌ Erreur historique gains:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Redirection de transaction
// =========================
export const redirectTransaction = async ({
  transaction_id,
  from_agent_id,
  to_agent_id,
  redirected_amount,
  reason,
  actor
}) => {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');

    // Vérifier si transaction existe
    const { rows: trxRows } = await client.query(
      `SELECT * FROM transactions WHERE id = $1 FOR UPDATE SKIP LOCKED`,
      [transaction_id]
    );
    
    if (!trxRows.length) {
      throw new Error('Transaction introuvable');
    }
    
    const trx = trxRows[0];

    if (!['en_attente', 'effectuee'].includes(trx.status)) {
      throw new Error(`Impossible de rediriger une transaction avec le statut: ${trx.status}`);
    }

    if (trx.assigned_agent_id !== from_agent_id) {
      throw new Error("Cet agent n'est pas assigné à la transaction");
    }

    // Vérifier que l'agent destinataire existe
    const toAgentCheck = await client.query(
      `SELECT id, name, email FROM agents WHERE id = $1 AND is_active = true`,
      [to_agent_id]
    );
    
    if (toAgentCheck.rows.length === 0) {
      throw new Error("L'agent destinataire n'existe pas ou est inactif");
    }

    if (redirected_amount <= 0 || redirected_amount > trx.send_amount) {
      throw new Error("Montant redirigé invalide");
    }

    // Insérer la redirection
    const { rows: redirRows } = await client.query(
      `INSERT INTO redirections (
        transaction_id, 
        from_agent_id, 
        to_agent_id, 
        redirected_amount, 
        reason, 
        status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *`,
      [transaction_id, from_agent_id, to_agent_id, redirected_amount, reason]
    );

    const redirection = redirRows[0];

    // 🔎 Log de redirection
    await logHistory({
      action_type: 'transaction_redirected',
      actor_type: actor.role,
      actor_id: actor.id,
      entity_type: 'transaction',
      entity_id: transaction_id,
      description: `Transaction redirigée de l'agent ${from_agent_id} vers l'agent ${to_agent_id}`,
      metadata: { 
        redirection_id: redirection.id,
        redirected_amount,
        reason,
        from_agent_id,
        to_agent_id
      }
    }, client);

    // Email en arrière-plan
    if (toAgentCheck.rows[0].email) {
      sendEmailSafely(
        notifyAgentForRedirection,
        toAgentCheck.rows[0].email, 
        redirection, 
        trx
      ).then(result => {
        if (result.success) {
          console.log('✅ Notification redirection envoyée avec succès');
        }
      });
    }

    await client.query('COMMIT');
    return redirection;
  } catch (err) {
    await client.query('ROLLBACK').catch(rollbackError => {
      console.error('❌ Erreur lors du rollback:', rollbackError);
    });
    console.error('❌ Erreur redirection:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Accepter une redirection - VERSION OPTIMISÉE
// =========================
export const acceptRedirection = async (redirection_id, agent_id, actor) => {
  const client = await acquireClient();
  
  try {
    await client.query('BEGIN');

    console.log('🔄 [REDIRECT] Acceptation redirection:', { redirection_id, agent_id, actor: actor.role });

    // Vérifier la redirection avec verrouillage optimisé
    const { rows: redirRows } = await client.query(
      `SELECT * FROM redirections WHERE id = $1 FOR UPDATE SKIP LOCKED`,
      [redirection_id]
    );
    
    if (!redirRows.length) {
      throw new Error('Redirection introuvable');
    }
    
    const redir = redirRows[0];
    
    if (redir.status !== 'pending') {
      throw new Error('Redirection déjà traitée');
    }

    if (redir.to_agent_id !== agent_id) {
      throw new Error("Cet agent n'est pas autorisé à accepter cette redirection");
    }

    // Récupérer transaction avec verrouillage optimisé
    const { rows: trxRows } = await client.query(
      `SELECT * FROM transactions WHERE id = $1 FOR UPDATE SKIP LOCKED`,
      [redir.transaction_id]
    );
    
    if (!trxRows.length) {
      throw new Error('Transaction introuvable');
    }
    
    const trx = trxRows[0];

    // Récupérer la devise en une seule requête
    const currencyRes = await client.query(
      `SELECT fc.currency_id, c.code as currency_code 
       FROM transactions t
       JOIN countries fc ON t.from_country_id = fc.id
       JOIN currencies c ON fc.currency_id = c.id
       WHERE t.id = $1`,
      [redir.transaction_id]
    );
    
    if (!currencyRes.rows.length) {
      throw new Error('Devise introuvable pour la transaction');
    }
    
    const { currency_id, currency_code } = currencyRes.rows[0];

    // Si la transaction est déjà effectuée, transférer les fonds
    if (trx.status === 'effectuee') {
      // Vérifier les fonds et transférer en une seule opération
      const transferResult = await client.query(
        `WITH source_check AS (
           SELECT amount FROM balances WHERE agent_id = $1 AND currency_id = $2
         ),
         update_source AS (
           UPDATE balances 
           SET amount = amount - $3, last_updated = NOW()
           WHERE agent_id = $1 AND currency_id = $2 AND amount >= $3
           RETURNING 1
         ),
         update_dest AS (
           INSERT INTO balances (agent_id, currency_id, amount)
           VALUES ($4, $2, $3)
           ON CONFLICT (agent_id, currency_id)
           DO UPDATE SET amount = balances.amount + $3, last_updated = NOW()
           RETURNING 1
         )
         SELECT 
           (SELECT amount FROM source_check) as source_balance,
           (SELECT COUNT(*) FROM update_source) as source_updated,
           (SELECT COUNT(*) FROM update_dest) as dest_updated`,
        [redir.from_agent_id, currency_id, redir.redirected_amount, redir.to_agent_id]
      );

      const { source_balance, source_updated, dest_updated } = transferResult.rows[0];
      
      if (source_updated === 0) {
        throw new Error(`Fonds insuffisants chez l'agent source: ${source_balance} ${currency_code} disponible, ${redir.redirected_amount} ${currency_code} requis`);
      }

      // Mettre à jour le gain
      const gain_amount = (trx.send_amount * trx.commission_applied) / 100;
      await client.query(
        `UPDATE gains
         SET agent_id = $1, updated_at = NOW()
         WHERE transaction_id = $2 AND agent_id = $3`,
        [redir.to_agent_id, trx.id, redir.from_agent_id]
      );
    }

    // Mettre à jour la transaction
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

    const acceptedRedirection = updated[0];

    // 🔎 Log d'acceptation de redirection
    await logHistory({
      action_type: 'redirection_accepted',
      actor_type: actor.role,
      actor_id: actor.id,
      entity_type: 'redirection',
      entity_id: redirection_id,
      description: `Redirection acceptée par l'agent ${agent_id}`,
      metadata: { 
        transaction_id: trx.id,
        from_agent_id: redir.from_agent_id,
        to_agent_id: redir.to_agent_id,
        redirected_amount: redir.redirected_amount,
        currency: currency_code
      }
    }, client);

    // Email en arrière-plan sans bloquer
    const fromAgentRes = await client.query(
      `SELECT email, name FROM agents WHERE id = $1`,
      [redir.from_agent_id]
    );
    
    const fromAgent = fromAgentRes.rows[0];

    if (fromAgent && fromAgent.email) {
      sendEmailSafely(
        notifyAgentRedirectionStatus,
        fromAgent.email, 
        acceptedRedirection, 
        trx, 
        'accepted'
      ).then(result => {
        if (result.success) {
          console.log('✅ Notification acceptation envoyée avec succès');
        }
      });
    }

    await client.query('COMMIT');
    console.log('✅ [REDIRECT] Redirection acceptée avec succès:', redirection_id);
    
    return {
      ...acceptedRedirection,
      message: 'Redirection acceptée avec succès',
      transaction_updated: true,
      funds_transferred: trx.status === 'effectuee'
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(rollbackError => {
      console.error('❌ Erreur lors du rollback:', rollbackError);
    });
    console.error('❌ [REDIRECT] Erreur acceptation redirection:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Rejeter une redirection
// =========================
export const rejectRedirection = async (redirection_id, agent_id, actor) => {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE redirections
       SET status = 'rejected', processed_at = NOW()
       WHERE id = $1 AND to_agent_id = $2 AND status = 'pending'
       RETURNING *`,
      [redirection_id, agent_id]
    );
    
    if (!rows.length) {
      throw new Error('Redirection introuvable ou déjà traitée');
    }
    
    const rejectedRedirection = rows[0];

    // 🔎 Log de rejet de redirection
    await logHistory({
      action_type: 'redirection_rejected',
      actor_type: actor.role,
      actor_id: actor.id,
      entity_type: 'redirection',
      entity_id: redirection_id,
      description: `Redirection rejetée par l'agent ${agent_id}`,
      metadata: { 
        transaction_id: rejectedRedirection.transaction_id
      }
    }, client);

    // Email en arrière-plan
    const fromAgentRes = await client.query(
      `SELECT email FROM agents WHERE id = $1`,
      [rejectedRedirection.from_agent_id]
    );
    
    const fromAgent = fromAgentRes.rows[0];

    if (fromAgent) {
      const trxRes = await client.query(
        `SELECT * FROM transactions WHERE id = $1`,
        [rejectedRedirection.transaction_id]
      );
      
      const transaction = trxRes.rows[0];

      sendEmailSafely(
        notifyAgentRedirectionStatus,
        fromAgent.email, 
        rejectedRedirection, 
        transaction, 
        'rejected'
      ).then(result => {
        if (result.success) {
          console.log('✅ Notification rejet envoyée avec succès');
        }
      });
    }

    await client.query('COMMIT');
    return rejectedRedirection;
  } catch (err) {
    await client.query('ROLLBACK').catch(rollbackError => {
      console.error('❌ Erreur lors du rollback:', rollbackError);
    });
    console.error('❌ [REDIRECT] Erreur rejet redirection:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Récupérer les transactions redirigées
// =========================
export const getAgentRedirectedTransactions = async (agent_id, {
  page = 1,
  limit = 10,
  status = null,
  start_date = null,
  end_date = null
} = {}) => {
  const client = await acquireClient();
  try {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        r.id as redirection_id,
        r.transaction_id,
        r.from_agent_id,
        r.to_agent_id,
        r.redirected_amount,
        r.reason as redirection_reason,
        r.status as redirection_status,
        r.created_at as redirection_created_at,
        r.processed_at as redirection_processed_at,
        t.*,
        fc.name as from_country_name,
        tc.name as to_country_name,
        from_curr.code as from_currency_code,
        to_curr.code as to_currency_code,
        sm.method as sender_method_name,
        rm.method as receiver_method_name,
        from_agent.name as from_agent_name
      FROM redirections r
      JOIN transactions t ON r.transaction_id = t.id
      LEFT JOIN countries fc ON t.from_country_id = fc.id
      LEFT JOIN countries tc ON t.to_country_id = tc.id
      LEFT JOIN currencies from_curr ON fc.currency_id = from_curr.id
      LEFT JOIN currencies to_curr ON tc.currency_id = to_curr.id
      LEFT JOIN payment_methods sm ON t.sender_method_id = sm.id
      LEFT JOIN payment_methods rm ON t.receiver_method_id = rm.id
      LEFT JOIN agents from_agent ON r.from_agent_id = from_agent.id
      WHERE r.to_agent_id = $1
    `;
    
    let countQuery = `SELECT COUNT(*) FROM redirections WHERE to_agent_id = $1`;
    const params = [agent_id];
    const countParams = [agent_id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
      countQuery += ` AND status = $${paramCount}`;
      countParams.push(status);
    }

    if (start_date) {
      paramCount++;
      query += ` AND r.created_at >= $${paramCount}`;
      params.push(start_date);
      countQuery += ` AND created_at >= $${paramCount}`;
      countParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND r.created_at <= $${paramCount}`;
      params.push(end_date);
      countQuery += ` AND created_at <= $${paramCount}`;
      countParams.push(end_date);
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    // Exécuter les requêtes en parallèle
    const [transactionsResult, countResult] = await Promise.all([
      client.query(query, params),
      client.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);

    return {
      transactions: transactionsResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (err) {
    console.error('❌ [REDIRECT] Erreur récupération transactions:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Statistiques transactions (admin)
// =========================
export const getTransactionStats = async (filters = {}) => {
  const client = await acquireClient();
  try {
    const {
      agent_id = null,
      from_country_id = null,
      to_country_id = null,
      start_date = null,
      end_date = null
    } = filters;

    let query = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(send_amount), 0) as total_send_amount,
        COALESCE(SUM(receive_amount), 0) as total_receive_amount
      FROM transactions
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (agent_id) {
      paramCount++;
      query += ` AND assigned_agent_id = $${paramCount}`;
      params.push(agent_id);
    }

    if (from_country_id) {
      paramCount++;
      query += ` AND from_country_id = $${paramCount}`;
      params.push(from_country_id);
    }

    if (to_country_id) {
      paramCount++;
      query += ` AND to_country_id = $${paramCount}`;
      params.push(to_country_id);
    }

    if (start_date) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      params.push(end_date);
    }

    query += ` GROUP BY status`;

    const { rows } = await client.query(query, params);

    const totals = {
      total_transactions: 0,
      total_send_amount: 0,
      total_receive_amount: 0
    };

    const statsByStatus = {};
    
    rows.forEach(row => {
      statsByStatus[row.status] = {
        count: parseInt(row.count),
        total_send_amount: parseFloat(row.total_send_amount),
        total_receive_amount: parseFloat(row.total_receive_amount)
      };
      
      totals.total_transactions += parseInt(row.count);
      totals.total_send_amount += parseFloat(row.total_send_amount);
      totals.total_receive_amount += parseFloat(row.total_receive_amount);
    });

    return {
      by_status: statsByStatus,
      totals
    };
  } catch (err) {
    console.error('❌ Erreur statistiques transactions:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Service de nettoyage des transactions expirées
// =========================
export const expireOldTransactions = async () => {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');
    
    const { rows } = await client.query(
      `UPDATE transactions 
       SET status = 'expiree', updated_at = NOW()
       WHERE status = 'en_attente' 
         AND expires_at < (NOW() AT TIME ZONE 'UTC')
         AND client_validated = false
       RETURNING *`
    );
    
    // Logger chaque transaction expirée
    for (const trx of rows) {
      await logHistory({
        action_type: 'transaction_expired',
        actor_type: 'system',
        actor_id: null,
        entity_type: 'transaction',
        entity_id: trx.id,
        description: `Transaction expirée par le service de nettoyage - Code: ${trx.tracking_code}`,
        metadata: { 
          expires_at: trx.expires_at
        }
      }, client);
    }
    
    await client.query('COMMIT');
    console.log(`✅ ${rows.length} transactions expirées nettoyées`);
    return { expiredCount: rows.length };
  } catch (err) {
    await client.query('ROLLBACK').catch(rollbackError => {
      console.error('❌ Erreur lors du rollback:', rollbackError);
    });
    console.error('❌ Erreur nettoyage transactions:', err);
    throw err;
  } finally {
    client.release();
  }
};