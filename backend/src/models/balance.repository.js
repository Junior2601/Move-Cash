import { pool } from '../config/db.js';
import { logHistory } from './history.repository.js';

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
export const createBalance = async (agent_id, currency_id, actor) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO balances (agent_id, currency_id)
       VALUES ($1, $2)
       ON CONFLICT (agent_id, currency_id) DO NOTHING
       RETURNING *`,
      [agent_id, currency_id]
    );

    const balance = result.rows[0];

    if (balance) {
      // 🔎 Log de création de balance
      await logHistory({
        action_type: 'balance_created',
        actor_type: actor.role, // 'admin' ou 'system'
        actor_id: actor.id,
        entity_type: 'balance',
        entity_id: balance.id,
        description: `Balance créée pour l'agent ${agent_id} - Devise: ${currency_id}`,
        metadata: { 
          agent_id, 
          currency_id,
          initial_amount: 0
        }
      }, client);
    }

    await client.query('COMMIT');
    return balance;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Créditer un compte
export const creditBalance = async (agent_id, currency_id, amount, actor, reason = '') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer l'ancien solde
    const oldBalanceRes = await client.query(
      `SELECT amount FROM balances 
       WHERE agent_id = $1 AND currency_id = $2`,
      [agent_id, currency_id]
    );
    const oldAmount = oldBalanceRes.rows[0]?.amount || 0;

    const result = await client.query(
      `UPDATE balances
       SET amount = amount + $3,
           last_updated = CURRENT_TIMESTAMP
       WHERE agent_id = $1 AND currency_id = $2
       RETURNING *`,
      [agent_id, currency_id, amount]
    );

    const balance = result.rows[0];

    if (balance) {
      // 🔎 Log de crédit de balance
      await logHistory({
        action_type: 'balance_credited',
        actor_type: actor.role, // 'admin', 'system' ou 'agent'
        actor_id: actor.id,
        entity_type: 'balance',
        entity_id: balance.id,
        description: `Balance créditée - Agent: ${agent_id}, Montant: ${amount}, Devise: ${currency_id}`,
        metadata: { 
          agent_id, 
          currency_id, 
          amount_credited: amount,
          old_amount: oldAmount,
          new_amount: balance.amount,
          reason
        }
      }, client);
    }

    await client.query('COMMIT');
    return balance;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Débiter un compte
export const debitBalance = async (agent_id, currency_id, amount, actor, reason = '') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer l'ancien solde
    const oldBalanceRes = await client.query(
      `SELECT amount FROM balances 
       WHERE agent_id = $1 AND currency_id = $2`,
      [agent_id, currency_id]
    );
    
    if (oldBalanceRes.rows.length === 0) {
      throw new Error('Balance introuvable');
    }

    const oldAmount = oldBalanceRes.rows[0].amount;

    if (oldAmount < amount) {
      throw new Error('Solde insuffisant');
    }

    const result = await client.query(
      `UPDATE balances
       SET amount = amount - $3,
           last_updated = CURRENT_TIMESTAMP
       WHERE agent_id = $1 AND currency_id = $2
         AND amount >= $3
       RETURNING *`,
      [agent_id, currency_id, amount]
    );

    if (result.rows.length === 0) {
      throw new Error('Débit impossible - solde insuffisant');
    }

    const balance = result.rows[0];

    // 🔎 Log de débit de balance
    await logHistory({
      action_type: 'balance_debited',
      actor_type: actor.role, // 'admin', 'system' ou 'agent'
      actor_id: actor.id,
      entity_type: 'balance',
      entity_id: balance.id,
      description: `Balance débitée - Agent: ${agent_id}, Montant: ${amount}, Devise: ${currency_id}`,
      metadata: { 
        agent_id, 
        currency_id, 
        amount_debited: amount,
        old_amount: oldAmount,
        new_amount: balance.amount,
        reason
      }
    }, client);

    await client.query('COMMIT');
    return balance;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Transférer des fonds entre agents
export const transferBalance = async (from_agent_id, to_agent_id, currency_id, amount, actor, reason = '') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Débiter l'agent source
    const debitedBalance = await debitBalance(from_agent_id, currency_id, amount, actor, `Transfert vers agent ${to_agent_id}: ${reason}`, client);

    // Créditer l'agent destination
    const creditedBalance = await creditBalance(to_agent_id, currency_id, amount, actor, `Transfert depuis agent ${from_agent_id}: ${reason}`, client);

    // 🔎 Log de transfert entre balances
    await logHistory({
      action_type: 'balance_transfer',
      actor_type: actor.role,
      actor_id: actor.id,
      entity_type: 'balance_transfer',
      entity_id: null, // Pas d'ID spécifique pour le transfert
      description: `Transfert de ${amount} ${currency_id} de l'agent ${from_agent_id} vers l'agent ${to_agent_id}`,
      metadata: { 
        from_agent_id, 
        to_agent_id, 
        currency_id, 
        amount,
        reason,
        debit_balance_id: debitedBalance.id,
        credit_balance_id: creditedBalance.id
      }
    }, client);

    await client.query('COMMIT');
    return { debited: debitedBalance, credited: creditedBalance };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};