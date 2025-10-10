import { pool } from '../config/db.js';
import { logHistory } from './history.repository.js';

// Obtenir TOUTES les balances avec les informations des agents et devises
export const findAllBalances = async () => {
  const result = await pool.query(
    `SELECT 
       b.*,
       a.name as agent_name,
       a.email as agent_email,
       c.name as currency_name,
       c.code as currency_code,
       c.symbol as currency_symbol
     FROM balances b
     JOIN agents a ON b.agent_id = a.id
     JOIN currencies c ON b.currency_id = c.id
     ORDER BY a.name, c.code ASC`
  );
  return result.rows;
};

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
    `SELECT b.*, c.code as currency_code
     FROM balances b
     JOIN currencies c ON b.currency_id = c.id
     WHERE b.agent_id = $1 AND b.currency_id = $2`,
    [agent_id, currency_id]
  );
  return result.rows[0];
};

// Obtenir le code de devise par ID
const getCurrencyCodeById = async (currency_id) => {
  const result = await pool.query(
    `SELECT code FROM currencies WHERE id = $1`,
    [currency_id]
  );
  return result.rows[0]?.code || 'DEVISE_INCONNUE';
};

// Obtenir le nom de l'agent par ID
const getAgentNameById = async (agent_id) => {
  const result = await pool.query(
    `SELECT name, email FROM agents WHERE id = $1`,
    [agent_id]
  );
  const agent = result.rows[0];
  return agent ? `${agent.name} (${agent.email})` : 'AGENT_INCONNU';
};

// Créer une nouvelle balance (0 par défaut)
export const createBalance = async (agent_id, currency_id, actor) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer les informations pour les logs
    const currencyCode = await getCurrencyCodeById(currency_id);
    const agentInfo = await getAgentNameById(agent_id);

    const result = await client.query(
      `INSERT INTO balances (agent_id, currency_id, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (agent_id, currency_id) DO NOTHING
       RETURNING *`,
      [agent_id, currency_id, 0]
    );

    const balance = result.rows[0];

    if (balance) {
      // 🔎 Log de création de balance avec code devise
      await logHistory({
        action_type: 'Création Balance',
        actor_type: actor.role,
        actor_id: actor.id,
        entity_type: 'balance',
        entity_id: balance.id,
        description: `Balance créée pour ${agentInfo} - Devise: ${currencyCode}`,
        metadata: { 
          agent_id, 
          agent_info: agentInfo,
          currency_id,
          currency_code: currencyCode,
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

    // Récupérer les informations pour les logs
    const currencyCode = await getCurrencyCodeById(currency_id);
    const agentInfo = await getAgentNameById(agent_id);

    // Vérifier si la balance existe, sinon la créer
    let balance = await findBalanceByCurrency(agent_id, currency_id);
    if (!balance) {
      balance = await createBalance(agent_id, currency_id, actor);
    }

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
      [agent_id, currency_id, parseFloat(amount)]
    );

    const updatedBalance = result.rows[0];

    if (updatedBalance) {
      // 🔎 Log de crédit de balance avec code devise
      await logHistory({
        action_type: 'Balance Créditée',
        actor_type: actor.role,
        actor_id: actor.id,
        entity_type: 'balance',
        entity_id: updatedBalance.id,
        description: `Balance créditée - ${agentInfo}, Montant: ${amount} ${currencyCode}`,
        metadata: { 
          agent_id, 
          agent_info: agentInfo,
          currency_id, 
          currency_code: currencyCode,
          amount_credited: amount,
          old_amount: oldAmount,
          new_amount: updatedBalance.amount,
          reason
        }
      }, client);
    }

    await client.query('COMMIT');
    return updatedBalance;
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

    // Récupérer les informations pour les logs
    const currencyCode = await getCurrencyCodeById(currency_id);
    const agentInfo = await getAgentNameById(agent_id);

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

    if (oldAmount < parseFloat(amount)) {
      throw new Error('Solde insuffisant');
    }

    const result = await client.query(
      `UPDATE balances
       SET amount = amount - $3,
           last_updated = CURRENT_TIMESTAMP
       WHERE agent_id = $1 AND currency_id = $2
         AND amount >= $3
       RETURNING *`,
      [agent_id, currency_id, parseFloat(amount)]
    );

    if (result.rows.length === 0) {
      throw new Error('Débit impossible - solde insuffisant');
    }

    const balance = result.rows[0];

    // 🔎 Log de débit de balance avec code devise
    await logHistory({
      action_type: 'Balance Débitée',
      actor_type: actor.role,
      actor_id: actor.id,
      entity_type: 'balance',
      entity_id: balance.id,
      description: `Balance débitée - ${agentInfo}, Montant: ${amount} ${currencyCode}`,
      metadata: { 
        agent_id, 
        agent_info: agentInfo,
        currency_id, 
        currency_code: currencyCode,
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

// Supprimer une balance
export const deleteBalanceById = async (id, actor) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer les informations de la balance avant suppression
    const balanceRes = await client.query(
      `SELECT b.*, a.name as agent_name, a.email as agent_email, c.code as currency_code
       FROM balances b
       JOIN agents a ON b.agent_id = a.id
       JOIN currencies c ON b.currency_id = c.id
       WHERE b.id = $1`,
      [id]
    );

    if (balanceRes.rows.length === 0) {
      throw new Error('Balance non trouvée');
    }

    const balance = balanceRes.rows[0];
    const agentInfo = `${balance.agent_name} (${balance.agent_email})`;

    // Supprimer la balance
    const result = await client.query(
      `DELETE FROM balances WHERE id = $1 RETURNING *`,
      [id]
    );

    const deletedBalance = result.rows[0];

    // 🔎 Log de suppression de balance avec code devise
    await logHistory({
      action_type: 'Balance Supprimée',
      actor_type: actor.role,
      actor_id: actor.id,
      entity_type: 'balance',
      entity_id: id,
      description: `Balance supprimée - ${agentInfo}, Devise: ${balance.currency_code}, Solde final: ${balance.amount}`,
      metadata: { 
        agent_id: balance.agent_id,
        agent_info: agentInfo,
        currency_id: balance.currency_id,
        currency_code: balance.currency_code,
        final_amount: balance.amount
      }
    }, client);

    await client.query('COMMIT');
    return deletedBalance;
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

    // Récupérer les informations pour les logs
    const currencyCode = await getCurrencyCodeById(currency_id);
    const fromAgentInfo = await getAgentNameById(from_agent_id);
    const toAgentInfo = await getAgentNameById(to_agent_id);

    // Débiter l'agent source
    const debitedBalance = await debitBalance(from_agent_id, currency_id, amount, actor, `Transfert vers ${toAgentInfo}: ${reason}`, client);

    // Créditer l'agent destination
    const creditedBalance = await creditBalance(to_agent_id, currency_id, amount, actor, `Transfert depuis ${fromAgentInfo}: ${reason}`, client);

    // 🔎 Log de transfert entre balances avec codes devises
    await logHistory({
      action_type: 'Fonds transférés',
      actor_type: actor.role,
      actor_id: actor.id,
      entity_type: 'balance_transfer',
      entity_id: null,
      description: `Transfert de ${amount} ${currencyCode} de ${fromAgentInfo} vers ${toAgentInfo}`,
      metadata: { 
        from_agent_id, 
        from_agent_info: fromAgentInfo,
        to_agent_id, 
        to_agent_info: toAgentInfo,
        currency_id, 
        currency_code: currencyCode,
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