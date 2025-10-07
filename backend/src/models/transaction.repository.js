import { pool } from '../config/db.js';
import { logHistory } from './history.repository.js';
import { 
  notifyAgentForTransaction, 
  notifyAgentForRedirection, 
  notifyAgentRedirectionStatus 
} from "../services/email.service.js";

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

    console.log('🔄 Début création transaction:', {
      from_country_id, to_country_id, sender_phone, receiver_phone,
      sender_method_id, receiver_method_id, send_amount
    });

    // 1. RÉCUPÉRER LE TAUX DE CHANGE - VERSION CORRIGÉE ET ROBUSTE
    let rate_applied = 0.85; // Taux par défaut

    try {
      console.log('🔍 Recherche du taux de change...');
      
      // Essayer d'abord avec les sous-requêtes (plus fiable)
      const rateRes = await client.query(
        `SELECT rate FROM rates 
         WHERE from_currency_id = (SELECT currency_id FROM countries WHERE id = $1)
         AND to_currency_id = (SELECT currency_id FROM countries WHERE id = $2)
         AND is_active = true
         ORDER BY created_at DESC LIMIT 1`,
        [from_country_id, to_country_id]
      );
      
      if (rateRes.rows.length > 0) {
        rate_applied = parseFloat(rateRes.rows[0].rate);
        console.log('✅ Taux trouvé via sous-requêtes:', rate_applied);
      } else {
        // Essayer avec la jointure directe
        const rateRes2 = await client.query(
          `SELECT r.rate 
           FROM rates r
           JOIN countries fc ON r.from_currency_id = fc.currency_id
           JOIN countries tc ON r.to_currency_id = tc.currency_id
           WHERE fc.id = $1 AND tc.id = $2
           AND r.is_active = true
           ORDER BY r.created_at DESC LIMIT 1`,
          [from_country_id, to_country_id]
        );
        
        if (rateRes2.rows.length > 0) {
          rate_applied = parseFloat(rateRes2.rows[0].rate);
          console.log('✅ Taux trouvé via jointure:', rate_applied);
        } else {
          console.log('⚠️ Aucun taux trouvé, utilisation taux par défaut 0.85');
          
          // Log pour debug - vérifier les devises des pays
          const currenciesCheck = await client.query(
            `SELECT 
              fc.id as from_country_id, fc.name as from_country, fc.currency_id as from_currency,
              tc.id as to_country_id, tc.name as to_country, tc.currency_id as to_currency
             FROM countries fc, countries tc
             WHERE fc.id = $1 AND tc.id = $2`,
            [from_country_id, to_country_id]
          );
          
          if (currenciesCheck.rows.length > 0) {
            console.log('💱 Paires de devises:', currenciesCheck.rows[0]);
          }
        }
      }
    } catch (rateError) {
      console.warn('⚠️ Erreur récupération taux, utilisation défaut:', rateError.message);
      rate_applied = 0.85;
    }

    // 2. Calcul du montant reçu
    const receive_amount = send_amount * rate_applied;
    console.log('💰 Calcul montant:', `${send_amount} × ${rate_applied} = ${receive_amount}`);

    // 3. Choisir un agent + numéro autorisé
    console.log('🔍 Recherche agent disponible...');
    const numRes = await client.query(
      `SELECT an.id, an.agent_id, an.number, a.name as agent_name, a.email as agent_email
       FROM authorized_numbers an
       JOIN agents a ON an.agent_id = a.id
       WHERE an.country_id = $1
         AND an.payment_method_id = $2
         AND an.is_active = true
         AND a.is_active = true
       LIMIT 1`,
      [from_country_id, sender_method_id]
    );
    
    if (numRes.rows.length === 0) {
      throw new Error('Aucun agent disponible pour cette combinaison pays/méthode de paiement');
    }
    
    const { 
      id: authorized_number_id, 
      agent_id: assigned_agent_id, 
      number: authorized_number,
      agent_name,
      agent_email 
    } = numRes.rows[0];
    
    console.log('✅ Agent trouvé:', { agent_id: assigned_agent_id, agent_name, authorized_number });

    // 4. Générer un tracking code aléatoire
    const tracking_code = 'TRX' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 5).toUpperCase();
    console.log('📦 Tracking code généré:', tracking_code);

    // 5. Commission fixe (5%)
    const commission_applied = 5;

    // 6. Insérer transaction
    console.log('💾 Insertion transaction en base...');
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW() + INTERVAL '10 minutes', $15)
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

    // 7. Notifier l'agent par email
    if (agent_email) {
      try {
        console.log('📧 Envoi notification à l\'agent:', agent_email);
        
        // Récupérer les informations détaillées pour l'email
        const countriesRes = await client.query(
          `SELECT 
              c.id, 
              c.name AS country_name,
              curr.code AS currency_code,
              curr.symbol AS currency_symbol
          FROM countries c
          INNER JOIN currencies curr ON c.currency_id = curr.id
          WHERE c.id IN ($1, $2)`,
          [from_country_id, to_country_id]
        );

        const methodsRes = await client.query(
          `SELECT id, method FROM payment_methods WHERE id IN ($1, $2)`,
          [sender_method_id, receiver_method_id]
        );

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

        await notifyAgentForTransaction(agent_email, transactionWithDetails);
        console.log('✅ Notification envoyée à l\'agent');
      } catch (emailError) {
        console.error('❌ Erreur envoi email agent:', emailError);
        // Ne pas bloquer la transaction pour une erreur d'email
      }
    }

    await client.query('COMMIT');
    console.log('🎉 Transaction finalisée avec succès');
    return transaction;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('💥 Erreur création transaction:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Vérifier expiration transaction
// =========================
const checkAndExpireTransaction = async (trx, client = pool) => {
  const now = new Date();
  const expiresAt = new Date(trx.expires_at);
  
  const isClientValidated = trx.client_validated ?? false;
  
  console.log('⏰ Vérification expiration transaction:', {
    id: trx.id,
    status: trx.status,
    client_validated: trx.client_validated,
    expiresAt,
    now,
    shouldExpire: trx.status === 'en_attente' && now > expiresAt && !isClientValidated
  });
  
  if (trx.status === 'en_attente' && now > expiresAt && !isClientValidated) {
    console.log('🔴 Expiration transaction:', trx.id);
    
    const { rows } = await client.query(
      `UPDATE transactions 
       SET status = 'expiree', updated_at = NOW()
       WHERE id = $1 AND status = 'en_attente'
       RETURNING *`,
      [trx.id]
    );
    
    if (rows.length > 0) {
      const expiredTrx = rows[0];
      
      await logHistory({
        action_type: 'transaction_expired',
        actor_type: 'system',
        actor_id: null,
        entity_type: 'transaction',
        entity_id: trx.id,
        description: `Transaction expirée automatiquement - Code: ${trx.tracking_code}`,
        metadata: { 
          original_status: trx.status,
          expires_at: trx.expires_at,
          expired_at: now
        }
      }, client);

      console.log('✅ Transaction expirée:', trx.id);
      return expiredTrx;
    }
  }
  return trx;
};

// =========================
// Validation par le client
// =========================
export const clientValidateTransaction = async (transaction_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Validation client transaction:', transaction_id);

    // Récupérer la transaction
    const trxRes = await client.query(
      `SELECT * FROM transactions WHERE id = $1 FOR UPDATE`,
      [transaction_id]
    );
    
    if (trxRes.rows.length === 0) {
      throw new Error('Transaction introuvable');
    }
    
    let trx = trxRes.rows[0];

    // Vérifier si déjà expirée ou traitée
    if (trx.status !== 'en_attente') {
      throw new Error(`Transaction déjà traitée ou ${trx.status}`);
    }

    // Marquer comme validée par le client
    await client.query(
      `UPDATE transactions 
       SET client_validated = true, client_validated_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [transaction_id]
    );

    // 🔎 Log de validation client
    await logHistory({
      action_type: 'client_validation',
      actor_type: 'client',
      actor_id: null,
      entity_type: 'transaction',
      entity_id: transaction_id,
      description: `Transaction validée par le client - Code: ${trx.tracking_code}`,
      metadata: { 
        tracking_code: trx.tracking_code,
        send_amount: trx.send_amount,
        validated_at: new Date()
      }
    }, client);

    await client.query('COMMIT');
    console.log('✅ Validation client réussie:', transaction_id);
    return { message: 'Transaction validée par le client avec succès' };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur validation client:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Valider une transaction agent ou admin
// =========================
export const validateTransaction = async (transaction_id, actor) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Validation transaction par', actor.role, ':', transaction_id);

    // Récupérer la transaction
    const trxRes = await client.query(
      `SELECT * FROM transactions WHERE id = $1 FOR UPDATE`,
      [transaction_id]
    );
    
    if (trxRes.rows.length === 0) {
      throw new Error('Transaction introuvable');
    }
    
    let trx = trxRes.rows[0];

    // Vérifier si expirée (seulement si pas validée par le client)
    if (!trx.client_validated) {
      trx = await checkAndExpireTransaction(trx, client);
    }
    
    if (trx.status !== 'en_attente') {
      throw new Error(`Transaction déjà traitée ou ${trx.status}`);
    }

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
    
    if (currencyRes.rows.length === 0) {
      throw new Error('Devise introuvable pour la méthode de réception');
    }
    
    const currency_id = currencyRes.rows[0].currency_id;

    // Calcul du gain
    const gain_amount = (trx.send_amount * trx.commission_applied) / 100;
    console.log('💰 Gain calculé:', gain_amount);

    // Insérer dans la table gains
    await client.query(
      `INSERT INTO gains (transaction_id, agent_id, currency_id, gain_amount, commission_percent_applied)
       VALUES ($1, $2, $3, $4, $5)`,
      [transaction_id, trx.assigned_agent_id, currency_id, gain_amount, trx.commission_applied]
    );

    // Créditer la balance de l'agent
    await client.query(
      `INSERT INTO balances (agent_id, currency_id, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (agent_id, currency_id)
       DO UPDATE SET amount = balances.amount + $3, last_updated = NOW()`,
      [trx.assigned_agent_id, currency_id, trx.send_amount]
    );

    // 🔎 Log de validation de transaction
    await logHistory({
      action_type: 'transaction_validated',
      actor_type: actor.role,
      actor_id: actor.id,
      entity_type: 'transaction',
      entity_id: transaction_id,
      description: `Transaction validée - Montant: ${trx.send_amount}, Code: ${trx.tracking_code}`,
      metadata: { 
        agent_id: trx.assigned_agent_id,
        gain_amount,
        commission_percent: trx.commission_applied,
        validated_by: actor.id
      }
    }, client);

    await client.query('COMMIT');
    console.log('✅ Transaction validée avec succès:', transaction_id);
    return { message: 'Transaction validée avec succès' };
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Annulation transaction par', actor.role, ':', transaction_id);

    const { rows } = await client.query(
      `UPDATE transactions SET status = 'echouee', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'en_attente'
       RETURNING *`,
      [transaction_id]
    );
    
    if (rows.length === 0) {
      throw new Error('Transaction introuvable ou déjà traitée');
    }
    
    const transaction = rows[0];

    // 🔎 Log d'annulation de transaction
    await logHistory({
      action_type: 'transaction_cancelled',
      actor_type: actor.role,
      actor_id: actor.id,
      entity_type: 'transaction',
      entity_id: transaction_id,
      description: `Transaction annulée - Code: ${transaction.tracking_code}`,
      metadata: { 
        original_status: 'en_attente',
        cancelled_by: actor.id,
        cancelled_at: new Date()
      }
    }, client);

    await client.query('COMMIT');
    console.log('✅ Transaction annulée:', transaction_id);
    return { message: 'Transaction annulée avec succès' };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur annulation transaction:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Récupération avec expiration automatique
// =========================
export const findTransactionById = async (transaction_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Recherche transaction par ID:', transaction_id);
    
    const { rows } = await client.query(
      `SELECT *, client_validated FROM transactions WHERE id = $1 FOR UPDATE`,
      [transaction_id]
    );
    
    if (rows.length === 0) {
      await client.query('COMMIT');
      console.log('❌ Transaction non trouvée:', transaction_id);
      return null;
    }
    
    const transaction = rows[0];
    const updatedTransaction = await checkAndExpireTransaction(transaction, client);
    
    await client.query('COMMIT');
    console.log('✅ Transaction trouvée:', transaction_id);
    return updatedTransaction;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur recherche transaction:', err);
    throw err;
  } finally {
    client.release();
  }
};

export const findTransactionByTrackingCode = async (tracking_code) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Recherche transaction par tracking code:', tracking_code);
    
    const { rows } = await client.query(
      `SELECT *, client_validated FROM transactions WHERE tracking_code = $1 FOR UPDATE`,
      [tracking_code]
    );
    
    if (rows.length === 0) {
      await client.query('COMMIT');
      console.log('❌ Transaction non trouvée avec tracking:', tracking_code);
      return null;
    }
    
    const transaction = rows[0];
    const updatedTransaction = await checkAndExpireTransaction(transaction, client);
    
    await client.query('COMMIT');
    console.log('✅ Transaction trouvée avec tracking:', tracking_code);
    return updatedTransaction;
  } catch (err) {
    await client.query('ROLLBACK');
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
  tracking_code = null,
  currency_code = null
} = {}) => {
  const client = await pool.connect();
  try {
    console.log('🔍 Filtres transactions reçus:', {
      page, limit, status, agent_id, from_country_id, to_country_id, 
      start_date, end_date, tracking_code, currency_code
    });

    // Conversion et validation des paramètres
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;
    
    // Construire la requête de base avec les jointures
    let query = `
      SELECT 
        t.*,
        fc.name as from_country_name,
        tc.name as to_country_name,
        sm.method as sender_method_name,
        rm.method as receiver_method_name,
        a.name as agent_name,
        a.email as agent_email,
        from_curr.code as from_currency_code,
        from_curr.name as from_currency_name,
        from_curr.symbol as from_currency_symbol,
        to_curr.code as to_currency_code,
        to_curr.name as to_currency_name,
        to_curr.symbol as to_currency_symbol,
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

    // Fonction helper pour vérifier les valeurs
    const isValidParam = (value) => {
      return value !== null && value !== undefined && value !== '' && value !== 'null' && value !== 'undefined';
    };

    // Ajouter les filtres conditionnels
    if (isValidParam(status)) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (isValidParam(agent_id)) {
      const agentIdNum = typeof agent_id === 'string' ? parseInt(agent_id) : agent_id;
      if (!isNaN(agentIdNum)) {
        paramCount++;
        query += ` AND t.assigned_agent_id = $${paramCount}`;
        params.push(agentIdNum);
      }
    }

    if (isValidParam(from_country_id)) {
      const fromCountryIdNum = typeof from_country_id === 'string' ? parseInt(from_country_id) : from_country_id;
      if (!isNaN(fromCountryIdNum)) {
        paramCount++;
        query += ` AND t.from_country_id = $${paramCount}`;
        params.push(fromCountryIdNum);
      }
    }

    if (isValidParam(to_country_id)) {
      const toCountryIdNum = typeof to_country_id === 'string' ? parseInt(to_country_id) : to_country_id;
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

    if (isValidParam(currency_code)) {
      paramCount++;
      query += ` AND (from_curr.code ILIKE $${paramCount} OR to_curr.code ILIKE $${paramCount})`;
      params.push(`%${currency_code}%`);
    }

    // Ajouter l'ordre et la pagination
    query += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limitNum, offset);

    console.log('📋 Requête finale:', query);
    console.log('🔢 Paramètres:', params);

    // Exécuter la requête
    const { rows } = await client.query(query, params);
    console.log(`✅ ${rows.length} transactions trouvées`);

    // Récupérer le nombre total pour la pagination
    let countQuery = `
      SELECT COUNT(*) 
      FROM transactions t
      LEFT JOIN countries fc ON t.from_country_id = fc.id
      LEFT JOIN countries tc ON t.to_country_id = tc.id
      LEFT JOIN currencies from_curr ON fc.currency_id = from_curr.id
      LEFT JOIN currencies to_curr ON tc.currency_id = to_curr.id
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamCount = 0;

    // Mêmes filtres que la requête principale
    if (isValidParam(status)) {
      countParamCount++;
      countQuery += ` AND t.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (isValidParam(agent_id)) {
      const agentIdNum = typeof agent_id === 'string' ? parseInt(agent_id) : agent_id;
      if (!isNaN(agentIdNum)) {
        countParamCount++;
        countQuery += ` AND t.assigned_agent_id = $${countParamCount}`;
        countParams.push(agentIdNum);
      }
    }

    if (isValidParam(from_country_id)) {
      const fromCountryIdNum = typeof from_country_id === 'string' ? parseInt(from_country_id) : from_country_id;
      if (!isNaN(fromCountryIdNum)) {
        countParamCount++;
        countQuery += ` AND t.from_country_id = $${countParamCount}`;
        countParams.push(fromCountryIdNum);
      }
    }

    if (isValidParam(to_country_id)) {
      const toCountryIdNum = typeof to_country_id === 'string' ? parseInt(to_country_id) : to_country_id;
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

    if (isValidParam(currency_code)) {
      countParamCount++;
      countQuery += ` AND (from_curr.code ILIKE $${countParamCount} OR to_curr.code ILIKE $${countParamCount})`;
      countParams.push(`%${currency_code}%`);
    }

    const countResult = await client.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Formater les dates pour la réponse
    const formattedTransactions = rows.map(transaction => ({
      ...transaction,
      created_at: transaction.created_at ? new Date(transaction.created_at).toISOString() : null,
      updated_at: transaction.updated_at ? new Date(transaction.updated_at).toISOString() : null,
      expires_at: transaction.expires_at ? new Date(transaction.expires_at).toISOString() : null,
      completed_at: transaction.completed_at ? new Date(transaction.completed_at).toISOString() : null,
      cancelled_at: transaction.cancelled_at ? new Date(transaction.cancelled_at).toISOString() : null,
      client_validated_at: transaction.client_validated_at ? new Date(transaction.client_validated_at).toISOString() : null,
      
      // Ajout des informations formatées
      send_amount_formatted: transaction.send_amount ? 
        `${transaction.from_currency_symbol || ''}${transaction.send_amount.toFixed(2)}` : '',
      receive_amount_formatted: transaction.receive_amount ? 
        `${transaction.to_currency_symbol || ''}${transaction.receive_amount.toFixed(2)}` : ''
    }));

    return {
      transactions: formattedTransactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  } catch (err) {
    console.error('❌ Erreur récupération transactions:', err);
    console.error('Stack trace:', err.stack);
    throw new Error(`Erreur lors de la récupération des transactions: ${err.message}`);
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
  const client = await pool.connect();
  try {
    const offset = (page - 1) * limit;
    
    console.log('🔍 Transactions agent:', { agent_id, page, limit, status });
    
    let query = `
      SELECT 
        t.*,
        fc.name as from_country_name,
        tc.name as to_country_name,
        sm.method as sender_method_name,
        rm.method as receiver_method_name
      FROM transactions t
      LEFT JOIN countries fc ON t.from_country_id = fc.id
      LEFT JOIN countries tc ON t.to_country_id = tc.id
      LEFT JOIN payment_methods sm ON t.sender_method_id = sm.id
      LEFT JOIN payment_methods rm ON t.receiver_method_id = rm.id
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

    console.log(`✅ ${rows.length} transactions trouvées pour l'agent ${agent_id}`);

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
// Récupérer les statistiques des transactions
// =========================
export const getTransactionStats = async (filters = {}) => {
  const client = await pool.connect();
  try {
    const {
      agent_id = null,
      from_country_id = null,
      to_country_id = null,
      start_date = null,
      end_date = null
    } = filters;

    console.log('📊 Statistiques transactions:', filters);

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

    // Calculer les totaux
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

    console.log('✅ Statistiques calculées:', { statsByStatus, totals });

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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Redirection transaction:', {
      transaction_id, from_agent_id, to_agent_id, redirected_amount, reason, actor: actor.role
    });

    // Vérifier si transaction existe et appartient bien à from_agent
    const { rows: trxRows } = await client.query(
      `SELECT * FROM transactions WHERE id = $1 FOR UPDATE`,
      [transaction_id]
    );
    
    if (!trxRows.length) {
      throw new Error('Transaction introuvable');
    }
    
    const trx = trxRows[0];

    // Vérification complète du statut
    if (!['en_attente', 'effectuee'].includes(trx.status)) {
      throw new Error(`Impossible de rediriger une transaction avec le statut: ${trx.status}`);
    }

    // Vérifier que l'agent source est bien assigné
    if (trx.assigned_agent_id !== from_agent_id) {
      throw new Error("Cet agent n'est pas assigné à la transaction");
    }

    // Vérifier que l'agent destinataire existe et est actif
    const toAgentCheck = await client.query(
      `SELECT id, name, email FROM agents WHERE id = $1 AND is_active = true`,
      [to_agent_id]
    );
    
    if (toAgentCheck.rows.length === 0) {
      throw new Error("L'agent destinataire n'existe pas ou est inactif");
    }

    // Vérifier le montant redirigé
    if (redirected_amount <= 0 || redirected_amount > trx.send_amount) {
      throw new Error("Montant redirigé invalide");
    }

    // Récupérer les informations détaillées pour l'email
    const [countriesRes, methodsRes, fromAgentRes] = await Promise.all([
      client.query(`SELECT id, name FROM countries WHERE id = ANY($1)`, [[trx.from_country_id, trx.to_country_id]]),
      client.query(`SELECT id, method FROM payment_methods WHERE id = ANY($1)`, [[trx.sender_method_id, trx.receiver_method_id]]),
      client.query(`SELECT name, email FROM agents WHERE id = $1`, [from_agent_id])
    ]);

    const countries = {};
    countriesRes.rows.forEach(country => {
      countries[country.id] = country.name;
    });

    const methods = {};
    methodsRes.rows.forEach(method => {
      methods[method.id] = method.method;
    });

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
        to_agent_id,
        transaction_status: trx.status
      }
    }, client);

    // Préparer les données pour l'email
    const transactionWithDetails = {
      ...trx,
      from_country_name: countries[trx.from_country_id] || 'Inconnu',
      to_country_name: countries[trx.to_country_id] || 'Inconnu',
      sender_method_name: methods[trx.sender_method_id] || 'Inconnu',
      receiver_method_name: methods[trx.receiver_method_id] || 'Inconnu'
    };

    const redirectionWithDetails = {
      ...redirection,
      from_agent_name: fromAgentRes.rows[0]?.name || `Agent #${from_agent_id}`,
      transaction: transactionWithDetails
    };

    // Notifier l'agent destinataire
    await notifyAgentForRedirection(
      toAgentCheck.rows[0].email, 
      redirectionWithDetails, 
      transactionWithDetails
    );

    await client.query('COMMIT');
    console.log('✅ Redirection créée:', redirection.id);
    return redirection;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur redirection:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Accepter une redirection
// =========================
export const acceptRedirection = async (redirection_id, agent_id, actor) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Acceptation redirection:', { redirection_id, agent_id, actor: actor.role });

    const { rows: redirRows } = await client.query(
      `SELECT * FROM redirections WHERE id = $1 FOR UPDATE`,
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
      throw new Error("Cet agent n'est pas autorisé à accepter");
    }

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

    const gain_amount = (trx.send_amount * trx.commission_applied) / 100;

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
        redirected_amount: redir.redirected_amount
      }
    }, client);

    // Notifier l'agent expéditeur de l'acceptation
    const fromAgentRes = await client.query(
      `SELECT email, name FROM agents WHERE id = $1`,
      [redir.from_agent_id]
    );
    
    const fromAgent = fromAgentRes.rows[0];

    if (fromAgent) {
      const toAgentRes = await client.query(
        `SELECT name FROM agents WHERE id = $1`,
        [redir.to_agent_id]
      );
      
      const redirectionWithDetails = {
        ...acceptedRedirection,
        to_agent_name: toAgentRes.rows[0]?.name || `Agent #${redir.to_agent_id}`
      };

      await notifyAgentRedirectionStatus(
        fromAgent.email, 
        redirectionWithDetails, 
        trx, 
        'accepted'
      );
    }

    await client.query('COMMIT');
    console.log('✅ Redirection acceptée:', redirection_id);
    return acceptedRedirection;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur acceptation redirection:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Rejeter une redirection
// =========================
export const rejectRedirection = async (redirection_id, agent_id, actor) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Rejet redirection:', { redirection_id, agent_id, actor: actor.role });

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
        transaction_id: rejectedRedirection.transaction_id,
        reason: 'Rejeté par le destinataire'
      }
    }, client);

    // Notifier l'agent expéditeur du rejet
    const fromAgentRes = await client.query(
      `SELECT email, name FROM agents WHERE id = $1`,
      [rejectedRedirection.from_agent_id]
    );
    
    const fromAgent = fromAgentRes.rows[0];

    if (fromAgent) {
      const toAgentRes = await client.query(
        `SELECT name FROM agents WHERE id = $1`,
        [agent_id]
      );

      const redirectionWithDetails = {
        ...rejectedRedirection,
        to_agent_name: toAgentRes.rows[0]?.name || `Agent #${agent_id}`
      };

      const trxRes = await client.query(
        `SELECT * FROM transactions WHERE id = $1`,
        [rejectedRedirection.transaction_id]
      );
      
      const transaction = trxRes.rows[0];

      await notifyAgentRedirectionStatus(
        fromAgent.email, 
        redirectionWithDetails, 
        transaction, 
        'rejected'
      );
    }

    await client.query('COMMIT');
    console.log('✅ Redirection rejetée:', redirection_id);
    return rejectedRedirection;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur rejet redirection:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Service de nettoyage des transactions expirées
// =========================
export const expireOldTransactions = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🧹 Nettoyage transactions expirées...');
    
    // N'expirer que les transactions non validées par le client
    const { rows } = await client.query(
      `UPDATE transactions 
       SET status = 'expiree', updated_at = NOW()
       WHERE status = 'en_attente' 
         AND expires_at < NOW()
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
          expires_at: trx.expires_at,
          expired_at: new Date()
        }
      }, client);
    }
    
    await client.query('COMMIT');
    console.log(`✅ ${rows.length} transactions expirées nettoyées`);
    return { expiredCount: rows.length };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur nettoyage transactions:', err);
    throw err;
  } finally {
    client.release();
  }
};