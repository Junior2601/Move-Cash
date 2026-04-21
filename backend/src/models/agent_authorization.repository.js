import { pool } from '../config/db.js';
import { logHistory } from './history.repository.js';

// Autoriser un agent à valider des transactions
export const authorizeAgentToValidate = async (agent_id, authorized_by, authorized_by_type) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Vérifier si l'agent existe
    const agentCheck = await client.query(
      'SELECT id, name, email, can_validate FROM agents WHERE id = $1',
      [agent_id]
    );
    
    if (agentCheck.rows.length === 0) {
      throw new Error('Agent introuvable');
    }
    
    const agent = agentCheck.rows[0];

    if (agent.can_validate) {
      throw new Error('Cet agent est déjà autorisé à valider des transactions');
    }

    const query = `
      UPDATE agents 
      SET can_validate = true, 
          validated_by = $2,
          validated_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, can_validate, validated_at
    `;
    
    const { rows } = await client.query(query, [agent_id, authorized_by]);
    const authorizedAgent = rows[0];

    await logHistory({
      action_type: 'agent_authorized',
      actor_type: authorized_by_type,
      actor_id: authorized_by,
      entity_type: 'agent',
      entity_id: agent_id,
      description: `Agent autorisé à valider des transactions: ${agent.name}`,
      metadata: { agent_name: agent.name, agent_email: agent.email }
    }, client);

    await client.query('COMMIT');
    return authorizedAgent;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Révoquer l'autorisation d'un agent
export const revokeAgentAuthorization = async (agent_id, revoked_by, revoked_by_type) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const agentCheck = await client.query(
      'SELECT id, name, email, can_validate FROM agents WHERE id = $1',
      [agent_id]
    );
    
    if (agentCheck.rows.length === 0) {
      throw new Error('Agent introuvable');
    }
    
    const agent = agentCheck.rows[0];

    if (!agent.can_validate) {
      throw new Error('Cet agent n\'est pas autorisé à valider des transactions');
    }

    const query = `
      UPDATE agents 
      SET can_validate = false, 
          validated_by = NULL,
          validated_at = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, can_validate
    `;
    
    const { rows } = await client.query(query, [agent_id]);
    const revokedAgent = rows[0];

    await logHistory({
      action_type: 'agent_authorization_revoked',
      actor_type: revoked_by_type,
      actor_id: revoked_by,
      entity_type: 'agent',
      entity_id: agent_id,
      description: `Autorisation de validation révoquée pour l'agent: ${agent.name}`,
      metadata: { agent_name: agent.name, agent_email: agent.email }
    }, client);

    await client.query('COMMIT');
    return revokedAgent;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Récupérer les agents autorisés à valider
export const getAuthorizedAgents = async (limit = 50, offset = 0) => {
  const query = `
    SELECT 
      a.id, a.name, a.email, a.country_id,
      c.name as country_name,
      a.can_validate, a.validated_at,
      adm.name as validated_by_name
    FROM agents a
    LEFT JOIN countries c ON a.country_id = c.id
    LEFT JOIN admins adm ON a.validated_by = adm.id
    WHERE a.can_validate = true
    ORDER BY a.validated_at DESC
    LIMIT $1 OFFSET $2
  `;
  const { rows } = await pool.query(query, [limit, offset]);
  return rows;
};

// Récupérer les agents non autorisés
export const getUnauthorizedAgents = async (limit = 50, offset = 0) => {
  const query = `
    SELECT 
      a.id, a.name, a.email, a.country_id,
      c.name as country_name,
      a.can_validate
    FROM agents a
    LEFT JOIN countries c ON a.country_id = c.id
    WHERE a.can_validate = false
    ORDER BY a.created_at DESC
    LIMIT $1 OFFSET $2
  `;
  const { rows } = await pool.query(query, [limit, offset]);
  return rows;
};