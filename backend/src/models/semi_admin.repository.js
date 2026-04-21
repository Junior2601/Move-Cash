import { pool } from '../config/db.js';
import { logHistory } from './history.repository.js';

// Récupérer un semi-admin par email
export const getSemiAdminByEmail = async (email) => {
  const query = `
    SELECT 
      sa.*,
      c.name as country_name,
      c.code as country_code,
      adm.name as created_by_name
    FROM semi_admins sa
    LEFT JOIN countries c ON sa.country_id = c.id
    LEFT JOIN admins adm ON sa.created_by = adm.id
    WHERE sa.email = $1 
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [email]);
  return rows[0];
};

// Récupérer un semi-admin par ID
export const getSemiAdminById = async (id) => {
  const query = `
    SELECT 
      sa.*,
      c.name as country_name,
      c.code as country_code
    FROM semi_admins sa
    LEFT JOIN countries c ON sa.country_id = c.id
    WHERE sa.id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

// Créer un semi-admin
export const createSemiAdmin = async ({ email, hashedPassword, name, country_id }, admin_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const query = `
      INSERT INTO semi_admins (email, password, name, country_id, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, country_id, is_active, created_at
    `;
    const { rows } = await client.query(query, [email, hashedPassword, name, country_id, admin_id]);
    const newSemiAdmin = rows[0];

    // Log de création
    await logHistory({
      action_type: 'semi_admin_created',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'semi_admin',
      entity_id: newSemiAdmin.id,
      description: `Semi-admin créé: ${name} (${email})`,
      metadata: { semi_admin_name: name, semi_admin_email: email, country_id }
    }, client);

    await client.query('COMMIT');
    return newSemiAdmin;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Récupérer tous les semi-admins
export const getAllSemiAdmins = async (limit = 50, offset = 0) => {
  const query = `
    SELECT 
      sa.id, sa.email, sa.name, sa.is_active, sa.created_at,
      c.name as country_name,
      adm.name as created_by_name
    FROM semi_admins sa
    LEFT JOIN countries c ON sa.country_id = c.id
    LEFT JOIN admins adm ON sa.created_by = adm.id
    ORDER BY sa.created_at DESC
    LIMIT $1 OFFSET $2
  `;
  const { rows } = await pool.query(query, [limit, offset]);
  return rows;
};

// Mettre à jour un semi-admin
export const updateSemiAdmin = async (id, updateData, admin_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { email, name, country_id, is_active } = updateData;

    const query = `
      UPDATE semi_admins 
      SET email = COALESCE($2, email),
          name = COALESCE($3, name),
          country_id = COALESCE($4, country_id),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, country_id, is_active, created_at, updated_at
    `;
    
    const { rows } = await client.query(query, [id, email, name, country_id, is_active]);
    const updatedSemiAdmin = rows[0];

    await logHistory({
      action_type: 'semi_admin_updated',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'semi_admin',
      entity_id: id,
      description: `Semi-admin modifié: ${name}`,
      metadata: updateData
    }, client);

    await client.query('COMMIT');
    return updatedSemiAdmin;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Désactiver un semi-admin
export const deactivateSemiAdmin = async (id, admin_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const query = `
      UPDATE semi_admins 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, is_active
    `;
    
    const { rows } = await client.query(query, [id]);
    const deactivatedSemiAdmin = rows[0];

    await logHistory({
      action_type: 'semi_admin_deactivated',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'semi_admin',
      entity_id: id,
      description: `Semi-admin désactivé: ${deactivatedSemiAdmin.name}`,
      metadata: { semi_admin_email: deactivatedSemiAdmin.email }
    }, client);

    await client.query('COMMIT');
    return deactivatedSemiAdmin;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Activer un semi-admin
export const activateSemiAdmin = async (id, admin_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const query = `
      UPDATE semi_admins 
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, is_active
    `;
    
    const { rows } = await client.query(query, [id]);
    const activatedSemiAdmin = rows[0];

    await logHistory({
      action_type: 'semi_admin_activated',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'semi_admin',
      entity_id: id,
      description: `Semi-admin activé: ${activatedSemiAdmin.name}`,
      metadata: { semi_admin_email: activatedSemiAdmin.email }
    }, client);

    await client.query('COMMIT');
    return activatedSemiAdmin;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Supprimer un semi-admin
export const deleteSemiAdmin = async (id, admin_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const semiAdmin = await getSemiAdminById(id);
    
    const query = 'DELETE FROM semi_admins WHERE id = $1 RETURNING id, email, name';
    const { rows } = await client.query(query, [id]);
    const deletedSemiAdmin = rows[0];

    await logHistory({
      action_type: 'semi_admin_deleted',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'semi_admin',
      entity_id: id,
      description: `Semi-admin supprimé: ${semiAdmin?.name}`,
      metadata: { semi_admin_email: semiAdmin?.email }
    }, client);

    await client.query('COMMIT');
    return deletedSemiAdmin;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Compter les semi-admins
export const countSemiAdmins = async () => {
  const query = 'SELECT COUNT(*) FROM semi_admins';
  const { rows } = await pool.query(query);
  return parseInt(rows[0].count);
};