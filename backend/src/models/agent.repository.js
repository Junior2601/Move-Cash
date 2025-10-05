import { pool } from '../config/db.js';
import { logHistory } from './history.repository.js';

// Fonction utilitaire pour récupérer les infos du pays
const getCountryInfo = async (country_id) => {
  const result = await pool.query(
    `SELECT name, code FROM countries WHERE id = $1`,
    [country_id]
  );
  return result.rows[0] || { name: '', code: '' };
};

// Récupérer un agent par email
export const getAgentByEmail = async (email) => {
  const query = `
    SELECT 
      a.*,
      c.name as country_name,
      c.code as country_code
    FROM agents a
    LEFT JOIN countries c ON a.country_id = c.id
    WHERE a.email = $1 
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [email]);
  return rows[0];
};

// Créer un agent avec log d'historique
export const createAgent = async ({ email, hashedPassword, name, country_id }, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Vérifier si l'agent existe déjà
    const existingAgent = await client.query(
      'SELECT id FROM agents WHERE email = $1',
      [email]
    );

    if (existingAgent.rows.length > 0) {
      throw new Error('Un agent avec cet email existe déjà');
    }

    const query = `
      INSERT INTO agents (email, password, name, country_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, country_id, is_active, created_at
    `;
    const { rows } = await client.query(query, [email, hashedPassword, name, country_id]);
    const newAgent = rows[0];

    // Récupérer les infos du pays pour le log
    const countryInfo = await getCountryInfo(country_id);

    // 🔎 Log de création d'agent
    await logHistory({
      action_type: 'Création agent',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'agent',
      entity_id: newAgent.id,
      description: `Agent créé: ${name} (${email})`,
      metadata: { 
        agent_name: name,
        agent_email: email,
        country_id: country_id,
        country_name: countryInfo.name,
        country_code: countryInfo.code,
        created_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return newAgent;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Récupérer tous les agents (avec pagination optionnelle)
export const getAllAgents = async (limit = 50, offset = 0) => {
  const query = `
    SELECT 
      a.id, 
      a.email, 
      a.name,
      a.country_id,
      c.name as country_name,
      c.code as country_code, 
      a.is_active, 
      a.created_at, 
      a.updated_at
    FROM agents a
    INNER JOIN countries c ON a.country_id = c.id
    ORDER BY a.created_at DESC
    LIMIT $1 OFFSET $2
  `;
  const { rows } = await pool.query(query, [limit, offset]);
  return rows;
};

// Récupérer un agent par ID
export const getAgentById = async (id) => {
  const query = `
    SELECT 
      a.*, 
      c.name as country_name,
      c.code as country_code
    FROM agents a
    INNER JOIN countries c ON a.country_id = c.id
    WHERE a.id = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

// Mettre à jour un agent avec log d'historique
export const updateAgent = async (id, updateData, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { email, name, country_id, is_active } = updateData;

    // Récupérer l'ancien agent pour le log
    const oldAgentResult = await client.query(
      `SELECT a.*, 
              c.name as country_name,
              c.code as country_code
       FROM agents a
       LEFT JOIN countries c ON a.country_id = c.id
       WHERE a.id = $1`,
      [id]
    );
    
    if (oldAgentResult.rows.length === 0) {
      throw new Error('Agent introuvable');
    }
    
    const oldAgent = oldAgentResult.rows[0];

    const query = `
      UPDATE agents 
      SET email = COALESCE($2, email),
          name = COALESCE($3, name),
          country_id = COALESCE($4, country_id),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, country_id, is_active, created_at, updated_at
    `;
    
    const { rows } = await client.query(query, [id, email, name, country_id, is_active]);
    const updatedAgent = rows[0];

    // Récupérer les nouvelles infos du pays
    const newCountryInfo = await getCountryInfo(country_id || oldAgent.country_id);

    // 🔎 Log de modification d'agent
    await logHistory({
      action_type: 'Modification agent',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'agent',
      entity_id: id,
      description: `Agent modifié: ${name || oldAgent.name}`,
      metadata: { 
        old_agent_name: oldAgent.name,
        new_agent_name: name,
        old_agent_email: oldAgent.email,
        new_agent_email: email,
        old_country_id: oldAgent.country_id,
        new_country_id: country_id,
        old_country_name: oldAgent.country_name,
        new_country_name: newCountryInfo.name,
        old_status: oldAgent.is_active,
        new_status: is_active,
        updated_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return updatedAgent;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Mettre à jour le mot de passe d'un agent avec log d'historique
export const updateAgentPassword = async (id, hashedPassword, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer les infos de l'agent avant modification
    const agentResult = await client.query(
      `SELECT email, name FROM agents WHERE id = $1`,
      [id]
    );
    
    if (agentResult.rows.length === 0) {
      throw new Error('Agent introuvable');
    }
    
    const agent = agentResult.rows[0];

    const query = `
      UPDATE agents 
      SET password = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name
    `;
    
    const { rows } = await client.query(query, [id, hashedPassword]);
    const updatedAgent = rows[0];

    // 🔎 Log de changement de mot de passe
    await logHistory({
      action_type: 'agent_password_changed',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'agent',
      entity_id: id,
      description: `Mot de passe modifié pour l'agent: ${agent.name}`,
      metadata: { 
        agent_name: agent.name,
        agent_email: agent.email,
        password_changed_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return updatedAgent;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Désactiver un agent (soft delete) avec log d'historique
export const deactivateAgent = async (id, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer les infos de l'agent avant modification
    const agentResult = await client.query(
      `SELECT email, name FROM agents WHERE id = $1`,
      [id]
    );
    
    if (agentResult.rows.length === 0) {
      throw new Error('Agent introuvable');
    }
    
    const agent = agentResult.rows[0];

    const query = `
      UPDATE agents 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, is_active
    `;
    
    const { rows } = await client.query(query, [id]);
    const deactivatedAgent = rows[0];

    // 🔎 Log de désactivation d'agent
    await logHistory({
      action_type: 'Desactivation agent',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'agent',
      entity_id: id,
      description: `Agent désactivé: ${agent.name} (${agent.email})`,
      metadata: { 
        agent_name: agent.name,
        agent_email: agent.email,
        deactivated_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return deactivatedAgent;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Activer un agent avec log d'historique
export const activateAgent = async (id, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer les infos de l'agent avant modification
    const agentResult = await client.query(
      `SELECT email, name FROM agents WHERE id = $1`,
      [id]
    );
    
    if (agentResult.rows.length === 0) {
      throw new Error('Agent introuvable');
    }
    
    const agent = agentResult.rows[0];

    const query = `
      UPDATE agents 
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, is_active
    `;
    
    const { rows } = await client.query(query, [id]);
    const activatedAgent = rows[0];

    // 🔎 Log d'activation d'agent
    await logHistory({
      action_type: 'Activation agent',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'agent',
      entity_id: id,
      description: `Agent activé: ${agent.name} (${agent.email})`,
      metadata: { 
        agent_name: agent.name,
        agent_email: agent.email,
        activated_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return activatedAgent;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Supprimer un agent (hard delete) avec log d'historique
export const deleteAgent = async (id, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer l'agent avant suppression pour le log
    const oldAgentResult = await client.query(
      `SELECT a.*, 
              c.name as country_name,
              c.code as country_code
       FROM agents a
       LEFT JOIN countries c ON a.country_id = c.id
       WHERE a.id = $1`,
      [id]
    );
    
    if (oldAgentResult.rows.length === 0) {
      throw new Error('Agent introuvable');
    }
    
    const oldAgent = oldAgentResult.rows[0];

    const query = 'DELETE FROM agents WHERE id = $1 RETURNING id, email, name';
    const { rows } = await client.query(query, [id]);
    const deletedAgent = rows[0];

    // 🔎 Log de suppression d'agent
    await logHistory({
      action_type: 'Suppression agent',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'agent',
      entity_id: id,
      description: `Agent supprimé: ${oldAgent.name} (${oldAgent.email})`,
      metadata: { 
        agent_name: oldAgent.name,
        agent_email: oldAgent.email,
        country_name: oldAgent.country_name,
        country_code: oldAgent.country_code,
        deleted_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return deletedAgent;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Compter le nombre total d'agents
export const countAgents = async () => {
  const query = 'SELECT COUNT(*) FROM agents';
  const { rows } = await pool.query(query);
  return parseInt(rows[0].count);
};

// Compter le nombre d'agents par pays
export const countAgentsByCountry = async (country_id) => {
  const query = 'SELECT COUNT(*) FROM agents WHERE country_id = $1';
  const { rows } = await pool.query(query, [country_id]);
  return parseInt(rows[0].count);
};

// Rechercher des agents par nom ou email
export const searchAgents = async (searchTerm, limit = 50, offset = 0) => {
  const query = `
    SELECT 
      a.id, 
      a.email, 
      a.name, 
      c.name as country_name,
      c.code as country_code, 
      a.is_active, 
      a.created_at
    FROM agents a
    INNER JOIN countries c ON a.country_id = c.id
    WHERE a.name ILIKE $1 OR a.email ILIKE $1
    ORDER BY a.created_at DESC
    LIMIT $2 OFFSET $3
  `;
  
  const { rows } = await pool.query(query, [`%${searchTerm}%`, limit, offset]);
  return rows;
};

// Récupérer les agents par pays
export const getAgentsByCountry = async (country_id, limit = 50, offset = 0) => {
  const query = `
    SELECT 
      a.id, 
      a.email, 
      a.name, 
      c.name as country_name,
      c.code as country_code, 
      a.is_active, 
      a.created_at,
      a.updated_at
    FROM agents a
    INNER JOIN countries c ON a.country_id = c.id
    WHERE a.country_id = $1
    ORDER BY a.created_at DESC
    LIMIT $2 OFFSET $3
  `;
  
  const { rows } = await pool.query(query, [country_id, limit, offset]);
  return rows;
};

// Récupérer les agents par code de pays
export const getAgentsByCountryCode = async (country_code, limit = 50, offset = 0) => {
  const query = `
    SELECT 
      a.id, 
      a.email, 
      a.name, 
      c.name as country_name,
      c.code as country_code, 
      a.is_active, 
      a.created_at,
      a.updated_at
    FROM agents a
    INNER JOIN countries c ON a.country_id = c.id
    WHERE c.code = $1
    ORDER BY a.created_at DESC
    LIMIT $2 OFFSET $3
  `;
  
  const { rows } = await pool.query(query, [country_code.toUpperCase(), limit, offset]);
  return rows;
};

// Récupérer les statistiques des agents
export const getAgentsStats = async () => {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_agents,
      COUNT(*) FILTER (WHERE is_active = true) as active_agents,
      COUNT(*) FILTER (WHERE is_active = false) as inactive_agents,
      COUNT(DISTINCT country_id) as countries_with_agents
    FROM agents
  `);
  
  return result.rows[0];
};

// Récupérer l'historique des modifications d'un agent spécifique
export const getAgentHistory = async (agent_id) => {
  const result = await pool.query(`
    SELECT * FROM history 
    WHERE entity_type = 'agent' AND entity_id = $1
    ORDER BY created_at DESC
  `, [agent_id]);
  
  return result.rows;
};

// Vérifier si un agent peut être supprimé (sans dépendances)
export const canDeleteAgent = async (id) => {
  const result = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM transactions WHERE agent_id = $1) as transactions_count
  `, [id]);
  
  const dependencies = result.rows[0];
  return {
    canDelete: dependencies.transactions_count === 0,
    dependencies: {
      transactions: dependencies.transactions_count
    }
  };
};