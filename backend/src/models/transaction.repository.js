// src/models/transaction.repository.js
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

    // 1. RÉCUPÉRER LE TAUX DE CHANGE
    let rate_applied = 0.85; // Taux par défaut

    try {
      console.log('🔍 Recherche du taux de change...');
      
      // Récupérer les devises des pays
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
        
        console.log('💱 Devises trouvées:', { from_currency_id, to_currency_id });
        
        // Chercher le taux actif entre ces devises
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
        } else {
          console.warn('⚠️ Aucun taux actif trouvé, utilisation du taux par défaut');
        }
      } else {
        console.warn('⚠️ Impossible de récupérer les devises des pays');
      }
    } catch (rateError) {
      console.warn('⚠️ Erreur récupération taux, utilisation défaut:', rateError.message);
      rate_applied = 0.85;
    }

    // 2. Calcul du montant reçu
    const receive_amount = send_amount * rate_applied;
    console.log('💰 Calcul montant:', `${send_amount} × ${rate_applied} = ${receive_amount}`);

    // 3. Choisir un agent + numéro autorisé (sélection optimisée avec répartition)
    console.log('🔍 Recherche agent disponible (sélection optimisée)...');
    console.log('📋 Critères recherche:', {
      country_id: from_country_id,
      payment_method_id: sender_method_id
    });

    // D'abord, compter combien d'agents sont disponibles avec les critères exacts
    const countRes = await client.query(
      `SELECT COUNT(*) as total_agents
       FROM authorized_numbers an
       JOIN agents a ON an.agent_id = a.id
       WHERE an.country_id = $1
         AND an.payment_method_id = $2
         AND an.is_active = true
         AND a.is_active = true`,
      [from_country_id, sender_method_id]
    );

    const totalAgents = parseInt(countRes.rows[0]?.total_agents || 0);
    console.log(`📊 ${totalAgents} agents disponibles pour les critères exacts`);

    let numRes;
    let query;
    let params = [from_country_id, sender_method_id];

    if (totalAgents > 0) {
      // Si plusieurs agents, choisir aléatoirement parmi ceux disponibles
      query = `
        SELECT an.id, an.agent_id, an.number, a.name as agent_name, a.email as agent_email
        FROM authorized_numbers an
        JOIN agents a ON an.agent_id = a.id
        WHERE an.country_id = $1
          AND an.payment_method_id = $2
          AND an.is_active = true
          AND a.is_active = true
        ORDER BY RANDOM()
        LIMIT 1
      `;
      console.log('🎯 Sélection aléatoire parmi les agents correspondants');
    } else {
      // Fallback: chercher par pays seulement
      console.log('🔄 Aucun agent trouvé avec critères exacts, recherche par pays...');
      
      // Compter les agents disponibles pour le pays
      const countryCountRes = await client.query(
        `SELECT COUNT(*) as total_agents
         FROM authorized_numbers an
         JOIN agents a ON an.agent_id = a.id
         WHERE an.country_id = $1
           AND an.is_active = true
           AND a.is_active = true`,
        [from_country_id]
      );
      
      const countryAgents = parseInt(countryCountRes.rows[0]?.total_agents || 0);
      console.log(`📊 ${countryAgents} agents disponibles pour le pays`);
      
      query = `
        SELECT an.id, an.agent_id, an.number, a.name as agent_name, a.email as agent_email
        FROM authorized_numbers an
        JOIN agents a ON an.agent_id = a.id
        WHERE an.country_id = $1
          AND an.is_active = true
          AND a.is_active = true
        ORDER BY RANDOM()
        LIMIT 1
      `;
      params = [from_country_id];
    }

    numRes = await client.query(query, params);

    // Fallback final: n'importe quel agent actif
    if (numRes.rows.length === 0) {
      console.log('🔄 Fallback final: recherche d\'un agent actif quelconque...');
      
      // Compter tous les agents actifs disponibles
      const anyCountRes = await client.query(
        `SELECT COUNT(*) as total_agents
         FROM authorized_numbers an
         JOIN agents a ON an.agent_id = a.id
         WHERE an.is_active = true
           AND a.is_active = true`
      );
      
      const anyAgents = parseInt(anyCountRes.rows[0]?.total_agents || 0);
      console.log(`📊 ${anyAgents} agents actifs disponibles dans le système`);
      
      numRes = await client.query(
        `SELECT an.id, an.agent_id, an.number, a.name as agent_name, a.email as agent_email
         FROM authorized_numbers an
         JOIN agents a ON an.agent_id = a.id
         WHERE an.is_active = true
           AND a.is_active = true
         ORDER BY RANDOM()
         LIMIT 1`
      );
    }

    // Si toujours aucun agent trouvé, fournir des détails de debug
    if (numRes.rows.length === 0) {
      console.log('❌ Aucun agent trouvé. Vérification des données existantes...');
      
      // Vérifier quels agents existent pour ce pays
      const agentsCountryCheck = await client.query(
        `SELECT a.id, a.name, a.email, a.is_active, c.name as country_name
         FROM agents a 
         LEFT JOIN countries c ON a.country_id = c.id
         WHERE a.country_id = $1 AND a.is_active = true`,
        [from_country_id]
      );
      
      console.log('👥 Agents pour ce pays:', agentsCountryCheck.rows);
      
      // Vérifier quels numéros autorisés existent
      const numbersCheck = await client.query(
        `SELECT an.id, an.agent_id, an.country_id, an.payment_method_id, an.number, an.is_active,
                a.name as agent_name, a.is_active as agent_active,
                pm.method as payment_method_name,
                c.name as country_name
         FROM authorized_numbers an
         LEFT JOIN agents a ON an.agent_id = a.id
         LEFT JOIN payment_methods pm ON an.payment_method_id = pm.id
         LEFT JOIN countries c ON an.country_id = c.id
         WHERE an.is_active = true AND a.is_active = true`
      );
      
      console.log('📞 Tous les numéros autorisés actifs:', numbersCheck.rows);
      
      throw new Error('Aucun agent disponible dans le système. Veuillez contacter l\'administrateur.');
    }
    
    const { 
      id: authorized_number_id, 
      agent_id: assigned_agent_id, 
      number: authorized_number,
      agent_name,
      agent_email 
    } = numRes.rows[0];
    
    console.log('✅ Agent trouvé:', { 
      agent_id: assigned_agent_id, 
      agent_name, 
      authorized_number,
      authorized_number_id,
      selection_method: totalAgents > 0 ? 'critères_exacts_aléatoire' : 
                       numRes.rows[0] ? 'fallback_pays_aléatoire' : 'fallback_general_aléatoire'
    });

    // 4. Générer un tracking code aléatoire
    const tracking_code = 'TRX' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 5).toUpperCase();
    console.log('📦 Tracking code généré:', tracking_code);

    // 5. Commission fixe (0.75%)
    const commission_applied = 0.75;

    // 6. CORRECTION FUSEAU HORAIRE : Insérer transaction avec UTC
    console.log('💾 Insertion transaction en base (UTC)...');
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, (NOW() AT TIME ZONE 'UTC') + INTERVAL '5 minutes', $15)
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

    // Log des dates pour debug
    console.log('⏰ Dates transaction (UTC):', {
      created_at: transaction.created_at,
      expires_at: transaction.expires_at,
      server_now_utc: new Date().toISOString(),
      expected_duration: '05 minutes'
    });

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
        agent_id: assigned_agent_id,
        selection_method: totalAgents > 0 ? 'critères_exacts_aléatoire' : 'fallback_aléatoire'
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
// Vérifier expiration transaction - VERSION CORRIGÉE UTC
// =========================
const checkAndExpireTransaction = async (trx, client = pool) => {
  // Utiliser UTC pour toutes les comparaisons
  const now = new Date().toISOString(); // Heure UTC
  const expiresAt = new Date(trx.expires_at).toISOString(); // Date stockée en UTC
  
  const isClientValidated = trx.client_validated ?? false;
  
  console.log('⏰ Vérification expiration (UTC):', {
    id: trx.id,
    status: trx.status,
    client_validated: trx.client_validated,
    expiresAt: expiresAt,
    now: now,
    is_expired: now > expiresAt,
    time_remaining_seconds: Math.floor((new Date(expiresAt) - new Date(now)) / 1000),
    time_remaining_minutes: Math.floor((new Date(expiresAt) - new Date(now)) / (1000 * 60))
  });
  
  // CORRECTION : Vérifier si vraiment expiré (maintenant > expires_at) en UTC
  if (trx.status === 'en_attente' && now > expiresAt && !isClientValidated) {
    console.log('🔴 Transaction EXPIRÉE - Marquage comme expirée:', trx.id);
    
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

      console.log('✅ Transaction marquée comme expirée:', trx.id);
      return expiredTrx;
    }
  } else if (trx.status === 'en_attente') {
    console.log('✅ Transaction EN ATTENTE - Non expirée:', trx.id, {
      time_remaining: Math.floor((new Date(expiresAt) - new Date(now)) / 1000) + 's',
      time_remaining_minutes: Math.floor((new Date(expiresAt) - new Date(now)) / (1000 * 60)) + 'm'
    });
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

    // Récupérer la transaction AVEC FOR UPDATE pour éviter les conflits
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
        validated_at: new Date().toISOString()
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
// Valider une transaction agent ou admin - VERSION CORRIGÉE AVEC GAINS CUMULATIFS
// =========================
export const validateTransaction = async (transaction_id, actor) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Validation transaction par', actor.role, ':', transaction_id);

    // Récupérer la transaction AVEC FOR UPDATE pour éviter les conflits
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

    // Récupérer les devises des pays d'envoi et de réception
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
      throw new Error('Devises introuvables pour les pays d\'envoi et réception');
    }
    
    const { 
      from_currency_id, 
      to_currency_id, 
      from_currency_code, 
      to_currency_code,
      from_currency_symbol,
      to_currency_symbol
    } = currenciesRes.rows[0];

    // Calcul du gain en fonction du montant d'envoi (dans la devise d'envoi)
    const gain_amount = (trx.send_amount * trx.commission_applied) / 100;
    console.log('💰 Gain calculé:', {
      send_amount: trx.send_amount,
      commission_percent: trx.commission_applied,
      gain_amount: gain_amount,
      currency: from_currency_code
    });

    // ===========================================
    // GESTION DES GAINS CUMULATIFS
    // ===========================================

    // Vérifier s'il existe déjà un gain pour cet agent et cette devise
    const existingGainRes = await client.query(
      `SELECT id, gain_amount FROM gains 
       WHERE agent_id = $1 AND currency_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [trx.assigned_agent_id, from_currency_id]
    );

    let total_gain_amount = gain_amount;
    let is_new_gain = true;

    if (existingGainRes.rows.length > 0) {
      // Accumuler sur le gain existant
      const existingGain = existingGainRes.rows[0];
      total_gain_amount = parseFloat(existingGain.gain_amount) + gain_amount;
      
      await client.query(
        `UPDATE gains 
         SET gain_amount = $1, updated_at = NOW()
         WHERE id = $2`,
        [total_gain_amount, existingGain.id]
      );
      
      is_new_gain = false;
      console.log('💰 Gain accumulé sur gain existant:', {
        existing_gain_id: existingGain.id,
        previous_amount: parseFloat(existingGain.gain_amount),
        new_gain: gain_amount,
        total_gain: total_gain_amount,
        currency: from_currency_code
      });
    } else {
      // Créer un nouveau gain
      await client.query(
        `INSERT INTO gains (transaction_id, agent_id, currency_id, gain_amount, commission_percent_applied)
         VALUES ($1, $2, $3, $4, $5)`,
        [transaction_id, trx.assigned_agent_id, from_currency_id, gain_amount, trx.commission_applied]
      );
      console.log('💰 Nouveau gain créé:', {
        gain_amount: gain_amount,
        currency: from_currency_code
      });
    }

    // ===========================================
    // DOUBLE MOUVEMENT DE BALANCE - CORRECTION
    // ===========================================

    // 1. CRÉDITER la balance dans la devise d'ENVOI (montant envoyé)
    await client.query(
      `INSERT INTO balances (agent_id, currency_id, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (agent_id, currency_id)
       DO UPDATE SET amount = balances.amount + $3, last_updated = NOW()`,
      [trx.assigned_agent_id, from_currency_id, trx.send_amount]
    );

    console.log('✅ Balance CRÉDITÉE (devise envoi):', {
      agent_id: trx.assigned_agent_id,
      currency_id: from_currency_id,
      currency_code: from_currency_code,
      amount_added: trx.send_amount,
      type: 'CRÉDIT'
    });

    // 2. DÉBITER la balance dans la devise de RÉCEPTION (montant à recevoir)
    await client.query(
      `INSERT INTO balances (agent_id, currency_id, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (agent_id, currency_id)
       DO UPDATE SET amount = balances.amount - $3, last_updated = NOW()`,
      [trx.assigned_agent_id, to_currency_id, trx.receive_amount]
    );

    console.log('✅ Balance DÉBITÉE (devise réception):', {
      agent_id: trx.assigned_agent_id,
      currency_id: to_currency_id,
      currency_code: to_currency_code,
      amount_subtracted: trx.receive_amount,
      type: 'DÉBIT'
    });

    // 🔎 Log de validation de transaction avec double mouvement et gains cumulatifs
    await logHistory({
      action_type: 'transaction_validated',
      actor_type: actor.role,
      actor_id: actor.id,
      entity_type: 'transaction',
      entity_id: transaction_id,
      description: `Transaction validée - Envoi: ${trx.send_amount} ${from_currency_code}, Réception: ${trx.receive_amount} ${to_currency_code}, Gain: ${gain_amount} ${from_currency_code} (${is_new_gain ? 'nouveau' : 'accumulé'})`,
      metadata: { 
        agent_id: trx.assigned_agent_id,
        transaction_amount_send: trx.send_amount,
        transaction_amount_receive: trx.receive_amount,
        gain_amount: gain_amount,
        total_gain_amount: total_gain_amount,
        commission_percent: trx.commission_applied,
        from_currency: from_currency_code,
        to_currency: to_currency_code,
        validated_by: actor.id,
        gain_accumulated: !is_new_gain,
        balance_movements: {
          credit: {
            currency: from_currency_code,
            amount: trx.send_amount
          },
          debit: {
            currency: to_currency_code,
            amount: trx.receive_amount
          }
        }
      }
    }, client);

    await client.query('COMMIT');
    console.log('✅ Transaction validée avec double mouvement de balance et gains cumulatifs:', transaction_id);
    return { 
      message: 'Transaction validée avec succès',
      transaction_amount_send: trx.send_amount,
      transaction_amount_receive: trx.receive_amount,
      gain_amount: gain_amount,
      total_gain_amount: total_gain_amount,
      from_currency: from_currency_code,
      to_currency: to_currency_code,
      gain_accumulated: !is_new_gain,
      balance_movements: {
        credited: `${from_currency_symbol}${trx.send_amount} ${from_currency_code}`,
        debited: `${to_currency_symbol}${trx.receive_amount} ${to_currency_code}`
      }
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Annulation transaction par', actor.role, ':', transaction_id);

    // Utiliser FOR UPDATE pour verrouiller la transaction
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
        cancelled_at: new Date().toISOString()
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
// Récupération avec expiration automatique - VERSION CORRIGÉE UTC
// =========================

// Fonction pour récupérer les détails complets (sans FOR UPDATE - pour lecture seule)
const getTransactionDetails = async (transaction_id, client) => {
  const { rows } = await client.query(
    `SELECT 
      t.*,
      a.name as agent_name,
      a.email as agent_email,
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
  return rows[0] || null;
};

export const findTransactionById = async (transaction_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Recherche transaction par ID:', transaction_id);
    
    // 1. Récupérer les détails (lecture seule)
    const transaction = await getTransactionDetails(transaction_id, client);
    
    if (!transaction) {
      await client.query('COMMIT');
      console.log('❌ Transaction non trouvée:', transaction_id);
      return null;
    }
    
    // 2. Vérifier l'expiration (nécessite un verrou pour modification)
    if (transaction.status === 'en_attente' && !transaction.client_validated) {
      const now = new Date().toISOString(); // UTC
      const expiresAt = new Date(transaction.expires_at).toISOString(); // UTC
      
      // CORRECTION : Vérifier si VRAIMENT expiré en UTC
      if (now > expiresAt) {
        console.log('⏰ Transaction expirée, mise à jour du statut...');
        
        // Verrouiller la transaction pour modification
        const { rows } = await client.query(
          `UPDATE transactions 
           SET status = 'expiree', updated_at = NOW()
           WHERE id = $1 AND status = 'en_attente'
           RETURNING *`,
          [transaction_id]
        );
        
        if (rows.length > 0) {
          const expiredTrx = rows[0];
          
          await logHistory({
            action_type: 'transaction_expired',
            actor_type: 'system',
            actor_id: null,
            entity_type: 'transaction',
            entity_id: transaction_id,
            description: `Transaction expirée automatiquement - Code: ${transaction.tracking_code}`,
            metadata: { 
              original_status: transaction.status,
              expires_at: transaction.expires_at,
              expired_at: now
            }
          }, client);

          console.log('✅ Transaction expirée:', transaction_id);
          
          // Récupérer les détails mis à jour
          const updatedTransaction = await getTransactionDetails(transaction_id, client);
          await client.query('COMMIT');
          return updatedTransaction;
        }
      } else {
        console.log('⏰ Transaction non expirée - temps restant:', 
          Math.floor((new Date(expiresAt) - new Date(now)) / 1000) + 's',
          Math.floor((new Date(expiresAt) - new Date(now)) / (1000 * 60)) + 'm'
        );
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Transaction trouvée:', transaction_id);
    return transaction;
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
    
    // Récupérer l'ID de la transaction d'abord
    const idRes = await client.query(
      `SELECT id FROM transactions WHERE tracking_code = $1`,
      [tracking_code]
    );
    
    if (idRes.rows.length === 0) {
      await client.query('COMMIT');
      console.log('❌ Transaction non trouvée avec tracking:', tracking_code);
      return null;
    }
    
    const transaction_id = idRes.rows[0].id;
    
    // Utiliser la fonction existante pour récupérer les détails
    const transaction = await findTransactionById(transaction_id);
    
    await client.query('COMMIT');
    console.log('✅ Transaction trouvée avec tracking:', tracking_code);
    return transaction;
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

    // Formater les transactions avec gestion des valeurs nulles
    const formattedTransactions = rows.map(transaction => {
      // Convertir les montants en nombres de manière sécurisée
      const sendAmount = parseFloat(transaction.send_amount) || 0;
      const receiveAmount = parseFloat(transaction.receive_amount) || 0;
      const rateApplied = parseFloat(transaction.rate_applied) || 0;
      const commissionApplied = parseFloat(transaction.commission_applied) || 0;

      return {
        ...transaction,
        // Conversion explicite des montants en nombres
        send_amount: sendAmount,
        receive_amount: receiveAmount,
        rate_applied: rateApplied,
        commission_applied: commissionApplied,
        
        // Formatage des dates
        created_at: transaction.created_at ? new Date(transaction.created_at).toISOString() : null,
        updated_at: transaction.updated_at ? new Date(transaction.updated_at).toISOString() : null,
        expires_at: transaction.expires_at ? new Date(transaction.expires_at).toISOString() : null,
        completed_at: transaction.completed_at ? new Date(transaction.completed_at).toISOString() : null,
        cancelled_at: transaction.cancelled_at ? new Date(transaction.cancelled_at).toISOString() : null,
        client_validated_at: transaction.client_validated_at ? new Date(transaction.client_validated_at).toISOString() : null,
        
        // Ajout des informations formatées avec gestion d'erreur
        send_amount_formatted: sendAmount > 0 ? 
          `${transaction.from_currency_symbol || ''}${sendAmount.toFixed(2)}` : '0.00',
        receive_amount_formatted: receiveAmount > 0 ? 
          `${transaction.to_currency_symbol || ''}${receiveAmount.toFixed(2)}` : '0.00'
      };
    });

    console.log('✅ Transactions formatées avec succès');

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
        fc.phone_prefix as from_country_phone_prefix,  
        fc.code as from_country_code,
        tc.name as to_country_name,
        tc.code as to_country_code,
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
// Récupérer les statistiques d'un agent spécifique - VERSION CORRIGÉE
// =========================
export const getAgentStats = async (agent_id, filters = {}) => {
  const client = await pool.connect();
  try {
    const {
      start_date = null,
      end_date = null,
      status = null
    } = filters;

    console.log('📊 Statistiques agent:', { agent_id, filters });

    // Statistiques par statut
    let statsQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(send_amount), 0) as total_send_amount,
        COALESCE(SUM(receive_amount), 0) as total_receive_amount,
        COALESCE(SUM(g.gain_amount), 0) as total_gains
      FROM transactions t
      LEFT JOIN gains g ON t.id = g.transaction_id
      WHERE t.assigned_agent_id = $1
    `;
    
    const statsParams = [agent_id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      statsQuery += ` AND t.status = $${paramCount}`;
      statsParams.push(status);
    }

    if (start_date) {
      paramCount++;
      statsQuery += ` AND t.created_at >= $${paramCount}`;
      statsParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      statsQuery += ` AND t.created_at <= $${paramCount}`;
      statsParams.push(end_date);
    }

    statsQuery += ` GROUP BY t.status`;

    const { rows: statsRows } = await client.query(statsQuery, statsParams);

    // Volume et gains par devise
    const volumeByCurrencyQuery = `
      SELECT 
        c.code as currency_code,
        c.symbol as currency_symbol,
        COALESCE(SUM(t.send_amount), 0) as total_volume,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(g.gain_amount), 0) as total_commissions
      FROM transactions t
      JOIN countries fc ON t.from_country_id = fc.id
      JOIN currencies c ON fc.currency_id = c.id
      LEFT JOIN gains g ON t.id = g.transaction_id
      WHERE t.assigned_agent_id = $1 AND t.status = 'effectuee'
      GROUP BY c.code, c.symbol
      ORDER BY total_volume DESC
    `;

    const { rows: volumeRows } = await client.query(volumeByCurrencyQuery, [agent_id]);

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

    console.log('💰 Soldes par devise récupérés:', balanceRows);
    console.log('📈 Volume par devise:', volumeRows);

    // Calculer les totaux
    const totals = {
      total_transactions: 0,
      total_send_amount: 0,
      total_receive_amount: 0,
      total_gains: 0,
      total_volume: 0
    };

    const statsByStatus = {};
    
    statsRows.forEach(row => {
      statsByStatus[row.status] = {
        count: parseInt(row.count),
        total_send_amount: parseFloat(row.total_send_amount),
        total_receive_amount: parseFloat(row.total_receive_amount),
        total_gains: parseFloat(row.total_gains)
      };
      
      totals.total_transactions += parseInt(row.count);
      totals.total_send_amount += parseFloat(row.total_send_amount);
      totals.total_receive_amount += parseFloat(row.total_receive_amount);
      totals.total_gains += parseFloat(row.total_gains);
    });

    // Calculer le volume total
    totals.total_volume = volumeRows.reduce((total, row) => {
      return total + parseFloat(row.total_volume);
    }, 0);

    // Performance (taux de réussite)
    const successRate = totals.total_transactions > 0 
      ? ((statsByStatus['effectuee']?.count || 0) / totals.total_transactions * 100).toFixed(1)
      : 0;

    console.log('✅ Statistiques agent calculées:', { 
      agent_id, 
      total_transactions: totals.total_transactions,
      total_volume: totals.total_volume,
      total_commissions: totals.total_gains,
      success_rate: successRate,
      balances_count: balanceRows.length
    });

    return {
      agent_id,
      by_status: statsByStatus,
      totals,
      volume_by_currency: volumeRows,
      performance: {
        success_rate: parseFloat(successRate),
        total_gains: totals.total_gains,
        total_volume: totals.total_volume
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
  const client = await pool.connect();
  try {
    const offset = (page - 1) * limit;
    
    console.log('💰 Historique gains agent:', { agent_id, page, limit });

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

    console.log(`✅ ${rows.length} gains trouvés pour l'agent ${agent_id}`);

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

// Les autres fonctions restent inchangées...
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

    // Vérifier si transaction existe AVEC FOR UPDATE
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

    console.log('🔄 [REDIRECT] Acceptation redirection:', { redirection_id, agent_id, actor: actor.role });

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
      throw new Error("Cet agent n'est pas autorisé à accepter cette redirection");
    }

    // Récupérer transaction AVEC FOR UPDATE
    const { rows: trxRows } = await client.query(
      `SELECT * FROM transactions WHERE id = $1 FOR UPDATE`,
      [redir.transaction_id]
    );
    
    if (!trxRows.length) {
      throw new Error('Transaction introuvable');
    }
    
    const trx = trxRows[0];

    // Récupérer la devise
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

    const gain_amount = (trx.send_amount * trx.commission_applied) / 100;

    // Si la transaction est déjà effectuée, transférer les fonds
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
        redirected_amount: redir.redirected_amount,
        currency: currency_code
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
    console.log('✅ [REDIRECT] Redirection acceptée:', redirection_id);
    return acceptedRedirection;
  } catch (err) {
    await client.query('ROLLBACK');
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 [REDIRECT] Rejet redirection:', { redirection_id, agent_id, actor: actor.role });

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
    console.log('✅ [REDIRECT] Redirection rejetée:', redirection_id);
    return rejectedRedirection;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [REDIRECT] Erreur rejet redirection:', err);
    throw err;
  } finally {
    client.release();
  }
};

// =========================
// Service de nettoyage des transactions expirées - VERSION UTC
// =========================
export const expireOldTransactions = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🧹 Nettoyage transactions expirées (UTC)...');
    
    // N'expirer que les transactions non validées par le client (comparaison UTC)
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
          expires_at: trx.expires_at,
          expired_at: new Date().toISOString()
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