import { pool } from '../config/db.js';

// Récupérer un agent par email
export const getAgentByEmail = async (email) => {
  const query = 'SELECT * FROM agents WHERE email = $1 LIMIT 1';
  const { rows } = await pool.query(query, [email]);
  return rows[0];
};

// Créer un agent
export const createAgent = async ({ email, hashedPassword, name, country_id }) => {
  const query = `
    INSERT INTO agents (email, password, name, country_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, name, country_id, is_active, created_at
  `;
  const { rows } = await pool.query(query, [email, hashedPassword, name, country_id]);
  return rows[0];
};

// Récupérer tous les agents (avec pagination optionnelle)
export const getAllAgents = async (limit = 50, offset = 0) => {
  const query = `
    SELECT id, email, name, country_id, is_active, created_at, updated_at
    FROM agents
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;
  const { rows } = await pool.query(query, [limit, offset]);
  return rows;
};

// Récupérer un agent par ID
export const getAgentById = async (id) => {
  const query = `
    SELECT id, email, name, country_id, is_active, created_at, updated_at
    FROM agents
    WHERE id = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

// Mettre à jour un agent
export const updateAgent = async (id, updateData) => {
  const { email, name, country_id, is_active } = updateData;
  
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
  
  const { rows } = await pool.query(query, [id, email, name, country_id, is_active]);
  return rows[0];
};

// Mettre à jour le mot de passe d'un agent
export const updateAgentPassword = async (id, hashedPassword) => {
  const query = `
    UPDATE agents 
    SET password = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, email, name
  `;
  
  const { rows } = await pool.query(query, [id, hashedPassword]);
  return rows[0];
};

// Désactiver un agent (soft delete)
export const deactivateAgent = async (id) => {
  const query = `
    UPDATE agents 
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, email, name, is_active
  `;
  
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

// Activer un agent
export const activateAgent = async (id) => {
  const query = `
    UPDATE agents 
    SET is_active = true, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, email, name, is_active
  `;
  
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

// Supprimer un agent (hard delete - utiliser avec précaution)
export const deleteAgent = async (id) => {
  const query = 'DELETE FROM agents WHERE id = $1 RETURNING id, email';
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

// Compter le nombre total d'agents
export const countAgents = async () => {
  const query = 'SELECT COUNT(*) FROM agents';
  const { rows } = await pool.query(query);
  return parseInt(rows[0].count);
};

// Rechercher des agents par nom ou email
export const searchAgents = async (searchTerm, limit = 50, offset = 0) => {
  const query = `
    SELECT id, email, name, country_id, is_active, created_at
    FROM agents
    WHERE name ILIKE $1 OR email ILIKE $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;
  
  const { rows } = await pool.query(query, [`%${searchTerm}%`, limit, offset]);
  return rows;
};

// Récupérer les agents par pays
export const getAgentsByCountry = async (country_id, limit = 50, offset = 0) => {
  const query = `
    SELECT id, email, name, country_id, is_active, created_at
    FROM agents
    WHERE country_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;
  
  const { rows } = await pool.query(query, [country_id, limit, offset]);
  return rows;
};