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
      c.code as country_code,
      admin.name as validated_by_name
    FROM agents a
    LEFT JOIN countries c ON a.country_id = c.id
    LEFT JOIN admins admin ON a.validated_by = admin.id
    WHERE a.email = $1 
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [email]);
  return rows[0];
};

// Créer un agent avec log d'historique
export const createAgent = async ({ email, hashedPassword, name, country_id, can_validate = false }, admin_id = null) => {
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
      INSERT INTO agents (email, password, name, country_id, can_validate, validated_by, validated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id, email, name, country_id, is_active, can_validate, validated_by, validated_at, created_at
    `;
    const { rows } = await client.query(query, [email, hashedPassword, name, country_id, can_validate, admin_id]);
    const newAgent = rows[0];

    // Récupérer les infos du pays pour le log
    const countryInfo = await getCountryInfo(country_id);

    // Log de création d'agent
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
        can_validate: can_validate,
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
      a.can_validate,
      a.validated_by,
      a.validated_at,
      admin.name as validated_by_name,
      a.created_at, 
      a.updated_at
    FROM agents a
    INNER JOIN countries c ON a.country_id = c.id
    LEFT JOIN admins admin ON a.validated_by = admin.id
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
      c.code as country_code,
      admin.name as validated_by_name
    FROM agents a
    INNER JOIN countries c ON a.country_id = c.id
    LEFT JOIN admins admin ON a.validated_by = admin.id
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

    const { email, name, country_id, is_active, can_validate } = updateData;

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

    // Construire la requête dynamiquement
    const updates = [];
    const values = [id];
    let paramCount = 2;

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (country_id !== undefined) {
      updates.push(`country_id = $${paramCount++}`);
      values.push(country_id);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (can_validate !== undefined) {
      updates.push(`can_validate = $${paramCount++}`);
      values.push(can_validate);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE agents 
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING id, email, name, country_id, is_active, can_validate, validated_by, validated_at, created_at, updated_at
    `;
    
    const { rows } = await client.query(query, values);
    const updatedAgent = rows[0];

    // Récupérer les nouvelles infos du pays
    const newCountryInfo = await getCountryInfo(country_id || oldAgent.country_id);

    // Log de modification d'agent
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
        old_can_validate: oldAgent.can_validate,
        new_can_validate: can_validate,
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

// Mettre à jour la validation d'un agent
export const updateAgentValidation = async (id, can_validate, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer l'agent avant modification
    const agentResult = await client.query(
      `SELECT name, email FROM agents WHERE id = $1`,
      [id]
    );
    
    if (agentResult.rows.length === 0) {
      throw new Error('Agent introuvable');
    }
    
    const agent = agentResult.rows[0];

    const query = `
      UPDATE agents 
      SET can_validate = $2,
          validated_by = CASE WHEN $2 = true THEN $3 ELSE NULL END,
          validated_at = CASE WHEN $2 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, can_validate, validated_by, validated_at
    `;
    
    const { rows } = await client.query(query, [id, can_validate, admin_id]);
    const updatedAgent = rows[0];

    // Log de modification de validation
    await logHistory({
      action_type: can_validate ? 'Validation agent' : 'Retrait validation agent',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'agent',
      entity_id: id,
      description: `${can_validate ? 'Validation accordée' : 'Validation retirée'} pour l'agent: ${agent.name} (${agent.email})`,
      metadata: { 
        agent_name: agent.name,
        agent_email: agent.email,
        can_validate: can_validate,
        validated_by: admin_id
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

    // Log de changement de mot de passe
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

// ============= VERSION OPTIMISÉE - ACTIVATION D'UN AGENT =============
export const activateAgent = async (id, admin_id = null) => {
  console.log(`[activateAgent] Début activation pour l'agent ID: ${id}`);
  
  try {
    // 1. Vérifier l'état actuel de l'agent
    console.log(`[activateAgent] Vérification de l'existence de l'agent...`);
    const checkResult = await pool.query(
      `SELECT id, email, name, is_active FROM agents WHERE id = $1`,
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      console.log(`[activateAgent] Agent ID ${id} non trouvé`);
      throw new Error('Agent introuvable');
    }
    
    const agent = checkResult.rows[0];
    console.log(`[activateAgent] Agent trouvé: ${agent.name} (${agent.email}), is_active: ${agent.is_active}`);
    
    // 2. Si déjà actif, retourner directement sans faire de mise à jour
    if (agent.is_active === true) {
      console.log(`[activateAgent] Agent déjà actif, retour direct`);
      return agent;
    }
    
    // 3. Mise à jour directe (sans transaction complexe)
    console.log(`[activateAgent] Mise à jour de l'agent...`);
    const updateResult = await pool.query(
      `UPDATE agents 
       SET is_active = true, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, name, is_active, country_id, can_validate, created_at, updated_at`,
      [id]
    );
    
    const activatedAgent = updateResult.rows[0];
    console.log(`[activateAgent] Agent activé avec succès`);
    
    // 4. Log d'historique (asynchrone, non-bloquant)
    console.log(`[activateAgent] Création du log d'historique...`);
    logHistory({
      action_type: 'Activation agent',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'agent',
      entity_id: id,
      description: `Agent activé: ${agent.name} (${agent.email})`,
      metadata: { 
        agent_name: agent.name,
        agent_email: agent.email,
        activated_by: admin_id,
        timestamp: new Date().toISOString()
      }
    }).catch(err => {
      console.error('[activateAgent] Erreur lors du log historique:', err);
    });
    
    console.log(`[activateAgent] Opération terminée avec succès`);
    return activatedAgent;
    
  } catch (err) {
    console.error('[activateAgent] Erreur:', err);
    throw err;
  }
};

// ============= VERSION OPTIMISÉE - DÉSACTIVATION D'UN AGENT =============
export const deactivateAgent = async (id, admin_id = null) => {
  console.log(`[deactivateAgent] Début désactivation pour l'agent ID: ${id}`);
  
  try {
    // 1. Vérifier l'état actuel de l'agent
    console.log(`[deactivateAgent] Vérification de l'existence de l'agent...`);
    const checkResult = await pool.query(
      `SELECT id, email, name, is_active FROM agents WHERE id = $1`,
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      console.log(`[deactivateAgent] Agent ID ${id} non trouvé`);
      throw new Error('Agent introuvable');
    }
    
    const agent = checkResult.rows[0];
    console.log(`[deactivateAgent] Agent trouvé: ${agent.name} (${agent.email}), is_active: ${agent.is_active}`);
    
    // 2. Si déjà inactif, retourner directement sans faire de mise à jour
    if (agent.is_active === false) {
      console.log(`[deactivateAgent] Agent déjà inactif, retour direct`);
      return agent;
    }
    
    // 3. Mise à jour directe (sans transaction complexe)
    console.log(`[deactivateAgent] Mise à jour de l'agent...`);
    const updateResult = await pool.query(
      `UPDATE agents 
       SET is_active = false, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, name, is_active, country_id, can_validate, created_at, updated_at`,
      [id]
    );
    
    const deactivatedAgent = updateResult.rows[0];
    console.log(`[deactivateAgent] Agent désactivé avec succès`);
    
    // 4. Log d'historique (asynchrone, non-bloquant)
    console.log(`[deactivateAgent] Création du log d'historique...`);
    logHistory({
      action_type: 'Desactivation agent',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'agent',
      entity_id: id,
      description: `Agent désactivé: ${agent.name} (${agent.email})`,
      metadata: { 
        agent_name: agent.name,
        agent_email: agent.email,
        deactivated_by: admin_id,
        timestamp: new Date().toISOString()
      }
    }).catch(err => {
      console.error('[deactivateAgent] Erreur lors du log historique:', err);
    });
    
    console.log(`[deactivateAgent] Opération terminée avec succès`);
    return deactivatedAgent;
    
  } catch (err) {
    console.error('[deactivateAgent] Erreur:', err);
    throw err;
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

    // Log de suppression d'agent
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
      a.can_validate,
      a.validated_by,
      a.validated_at,
      admin.name as validated_by_name,
      a.created_at
    FROM agents a
    INNER JOIN countries c ON a.country_id = c.id
    LEFT JOIN admins admin ON a.validated_by = admin.id
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
      a.can_validate,
      a.validated_by,
      a.validated_at,
      admin.name as validated_by_name,
      a.created_at,
      a.updated_at
    FROM agents a
    INNER JOIN countries c ON a.country_id = c.id
    LEFT JOIN admins admin ON a.validated_by = admin.id
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
      a.can_validate,
      a.validated_by,
      a.validated_at,
      admin.name as validated_by_name,
      a.created_at,
      a.updated_at
    FROM agents a
    INNER JOIN countries c ON a.country_id = c.id
    LEFT JOIN admins admin ON a.validated_by = admin.id
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
      COUNT(*) FILTER (WHERE can_validate = true) as validated_agents,
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