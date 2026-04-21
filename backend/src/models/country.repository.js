import { pool } from '../config/db.js';
import { logHistory } from './history.repository.js';

// Fonction utilitaire pour récupérer les infos de la devise
const getCurrencyInfo = async (currency_id) => {
  if (!currency_id) return { code: '', name: '', symbol: '' };
  
  try {
    const result = await pool.query(
      `SELECT code, name, symbol FROM currencies WHERE id = $1 AND deleted_at IS NULL`,
      [currency_id]
    );
    return result.rows[0] || { code: '', name: '', symbol: '' };
  } catch (error) {
    console.error(`Erreur récupération devise ${currency_id}:`, error);
    return { code: '', name: '', symbol: '' };
  }
};

// Lister uniquement les pays actifs (avec soft delete)
export const findActiveCountries = async () => {
  console.log('🔍 Récupération pays actifs');
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.code, c.phone_prefix, c.currency_id, 
              c.is_active, c.created_at, c.updated_at,
              cur.code as currency_code, cur.name as currency_name, 
              cur.symbol as currency_symbol
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       WHERE c.is_active = true AND c.deleted_at IS NULL
       ORDER BY c.name ASC`
    );
    console.log(`✅ ${result.rows.length} pays actifs récupérés`);
    return result.rows;
  } catch (error) {
    console.error('Erreur récupération pays actifs:', error);
    throw error;
  }
};

// Lister tous les pays (exclut soft delete)
export const findAllCountries = async () => {
  console.log('🔍 Récupération de tous les pays');
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.code, c.phone_prefix, c.currency_id, 
              c.is_active, c.created_at, c.updated_at,
              cur.code as currency_code, cur.name as currency_name,
              cur.symbol as currency_symbol
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       WHERE c.deleted_at IS NULL
       ORDER BY c.name ASC`
    );
    console.log(`✅ ${result.rows.length} pays récupérés`);
    return result.rows;
  } catch (error) {
    console.error('Erreur récupération pays:', error);
    throw error;
  }
};

// Statistiques complètes des pays (renommée)
export const getCountriesStatistics = async () => {
  console.log('📊 Récupération statistiques pays');
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_countries,
        COUNT(*) FILTER (WHERE is_active = true AND deleted_at IS NULL) as active_countries,
        COUNT(*) FILTER (WHERE is_active = false AND deleted_at IS NULL) as inactive_countries,
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_countries,
        COUNT(DISTINCT currency_id) FILTER (WHERE deleted_at IS NULL) as unique_currencies
      FROM countries
    `);
    console.log('✅ Statistiques récupérées:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Erreur statistiques pays:', error);
    throw error;
  }
};

// Créer un pays avec validation
export const createCountry = async (name, code, phone_prefix, currency_id, admin_id = null) => {
  const client = await pool.connect();
  console.log('🚀 CREATE COUNTRY - Début');

  try {
    await client.query('BEGIN');

    // Vérifier si la devise existe et est active
    const currencyCheck = await client.query(
      `SELECT id, code, name FROM currencies WHERE id = $1 AND deleted_at IS NULL`,
      [currency_id]
    );
    
    if (currencyCheck.rows.length === 0) {
      throw new Error('Devise invalide ou inexistante');
    }

    // Vérifier si le pays existe déjà (même soft delete)
    const existingCountry = await client.query(
      `SELECT id, deleted_at FROM countries WHERE code = $1 OR name = $2`,
      [code, name]
    );

    if (existingCountry.rows.length > 0) {
      const country = existingCountry.rows[0];
      if (country.deleted_at === null) {
        throw new Error('Un pays avec ce code ou ce nom existe déjà');
      } else {
        // Réactiver le pays soft delete
        const result = await client.query(
          `UPDATE countries 
           SET name = $1, code = $2, phone_prefix = $3, currency_id = $4,
               is_active = true, deleted_at = NULL, updated_at = NOW()
           WHERE id = $5 
           RETURNING *`,
          [name, code, phone_prefix, currency_id, country.id]
        );
        
        const reactivatedCountry = result.rows[0];
        
        await logHistory({
          action_type: 'country_reactivated',
          actor_type: 'admin',
          actor_id: admin_id,
          entity_type: 'country',
          entity_id: reactivatedCountry.id,
          description: `Pays réactivé: ${name} (${code})`,
          metadata: { 
            country_name: name,
            country_code: code,
            phone_prefix: phone_prefix,
            currency_id: currency_id,
            currency_code: currencyCheck.rows[0].code,
            reactivated_by: admin_id
          }
        }, client);
        
        await client.query('COMMIT');
        return reactivatedCountry;
      }
    }

    // Créer le pays
    const result = await client.query(
      `INSERT INTO countries (name, code, phone_prefix, currency_id, is_active) 
       VALUES ($1, $2, $3, $4, true) 
       RETURNING *`,
      [name, code, phone_prefix, currency_id]
    );
    
    const newCountry = result.rows[0];

    // Log de création
    await logHistory({
      action_type: 'country_created',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'country',
      entity_id: newCountry.id,
      description: `Pays créé: ${name} (${code})`,
      metadata: { 
        country_name: name,
        country_code: code,
        phone_prefix: phone_prefix,
        currency_id: currency_id,
        currency_code: currencyCheck.rows[0].code,
        created_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    console.log('✅ CREATE COUNTRY - Succès');
    return newCountry;
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur création pays:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Mettre à jour un pays
export const updateCountryById = async (id, name, code, phone_prefix, currency_id, is_active, admin_id = null) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Vérifier si le pays existe
    const existingCountry = await client.query(
      `SELECT * FROM countries WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    
    if (existingCountry.rows.length === 0) {
      throw new Error('Pays introuvable');
    }
    
    const oldCountry = existingCountry.rows[0];

    // Vérifier la devise
    const currencyCheck = await client.query(
      `SELECT id, code, name FROM currencies WHERE id = $1 AND deleted_at IS NULL`,
      [currency_id]
    );
    
    if (currencyCheck.rows.length === 0) {
      throw new Error('Devise invalide ou inexistante');
    }

    // Vérifier les doublons
    const duplicateCheck = await client.query(
      `SELECT id FROM countries WHERE (code = $1 OR name = $2) AND id != $3 AND deleted_at IS NULL`,
      [code, name, id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      throw new Error('Un pays avec ce code ou ce nom existe déjà');
    }

    // Mettre à jour le pays
    const result = await client.query(
      `UPDATE countries 
       SET name = $1, code = $2, phone_prefix = $3, currency_id = $4, 
           is_active = $5, updated_at = NOW()
       WHERE id = $6 AND deleted_at IS NULL
       RETURNING *`,
      [name, code, phone_prefix, currency_id, is_active, id]
    );
    
    const updatedCountry = result.rows[0];

    // Log de mise à jour
    await logHistory({
      action_type: 'country_updated',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'country',
      entity_id: id,
      description: `Pays modifié: ${name} (${code})`,
      metadata: { 
        changes: {
          name: { old: oldCountry.name, new: name },
          code: { old: oldCountry.code, new: code },
          phone_prefix: { old: oldCountry.phone_prefix, new: phone_prefix },
          currency_id: { old: oldCountry.currency_id, new: currency_id },
          is_active: { old: oldCountry.is_active, new: is_active }
        },
        updated_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return updatedCountry;
    
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Activer un pays
export const activateCountryById = async (id, admin_id = null) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE countries 
       SET is_active = true, deleted_at = NULL, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Pays introuvable');
    }
    
    const country = result.rows[0];

    await logHistory({
      action_type: 'country_activated',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'country',
      entity_id: id,
      description: `Pays activé: ${country.name} (${country.code})`,
      metadata: { 
        country_name: country.name,
        country_code: country.code,
        activated_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return country;
    
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Désactiver un pays (soft delete)
export const deactivateCountryById = async (id, admin_id = null) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Vérifier si le pays a des dépendances actives
    const dependencies = await checkCountryDependencies(id, client);
    
    if (dependencies.hasDependencies) {
      throw new Error(`Impossible de désactiver ce pays car il est utilisé dans: ${dependencies.details.join(', ')}`);
    }

    const result = await client.query(
      `UPDATE countries 
       SET is_active = false, deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Pays introuvable');
    }
    
    const country = result.rows[0];

    await logHistory({
      action_type: 'country_deactivated',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'country',
      entity_id: id,
      description: `Pays désactivé: ${country.name} (${country.code})`,
      metadata: { 
        country_name: country.name,
        country_code: country.code,
        deactivated_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return country;
    
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Basculer le statut d'un pays
export const toggleCountryStatusById = async (id, admin_id = null) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Récupérer le pays
    const countryResult = await client.query(
      `SELECT * FROM countries WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    
    if (countryResult.rows.length === 0) {
      throw new Error('Pays introuvable');
    }
    
    const country = countryResult.rows[0];
    const newStatus = !country.is_active;

    // Si on veut désactiver, vérifier les dépendances
    if (!newStatus) {
      const dependencies = await checkCountryDependencies(id, client);
      if (dependencies.hasDependencies) {
        throw new Error(`Impossible de désactiver ce pays car il est utilisé dans: ${dependencies.details.join(', ')}`);
      }
    }

    // Mettre à jour le statut
    const result = await client.query(
      `UPDATE countries 
       SET is_active = $1, 
           deleted_at = ${newStatus ? 'NULL' : 'NOW()'},
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, id]
    );
    
    const updatedCountry = result.rows[0];

    await logHistory({
      action_type: newStatus ? 'country_activated' : 'country_deactivated',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'country',
      entity_id: id,
      description: `Pays ${newStatus ? 'activé' : 'désactivé'}: ${country.name} (${country.code})`,
      metadata: { 
        country_name: country.name,
        country_code: country.code,
        old_status: country.is_active,
        new_status: newStatus,
        changed_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return updatedCountry;
    
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Supprimer définitivement un pays
export const deleteCountryById = async (id, admin_id = null) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Vérifier les dépendances
    const dependencies = await checkCountryDependencies(id, client);
    
    if (dependencies.hasDependencies) {
      throw new Error(`Impossible de supprimer ce pays car il est utilisé dans: ${dependencies.details.join(', ')}`);
    }

    // Récupérer le pays avant suppression
    const countryResult = await client.query(
      `SELECT * FROM countries WHERE id = $1`,
      [id]
    );
    
    if (countryResult.rows.length === 0) {
      throw new Error('Pays introuvable');
    }
    
    const country = countryResult.rows[0];

    // Supprimer définitivement
    const result = await client.query(
      `DELETE FROM countries WHERE id = $1 RETURNING *`, 
      [id]
    );
    
    const deletedCountry = result.rows[0];

    await logHistory({
      action_type: 'country_permanently_deleted',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'country',
      entity_id: id,
      description: `Pays supprimé définitivement: ${country.name} (${country.code})`,
      metadata: { 
        country_name: country.name,
        country_code: country.code,
        phone_prefix: country.phone_prefix,
        currency_id: country.currency_id,
        deleted_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return deletedCountry;
    
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Vérifier les dépendances d'un pays
const checkCountryDependencies = async (country_id, client) => {
  const dependencies = {
    hasDependencies: false,
    details: []
  };

  try {
    // Vérifier les méthodes de paiement
    const paymentMethods = await client.query(
      `SELECT COUNT(*) FROM payment_methods WHERE country_id = $1`,
      [country_id]
    );
    if (parseInt(paymentMethods.rows[0].count) > 0) {
      dependencies.hasDependencies = true;
      dependencies.details.push(`${paymentMethods.rows[0].count} méthode(s) de paiement`);
    }

    // Vérifier les transactions
    const transactions = await client.query(
      `SELECT COUNT(*) FROM transactions WHERE from_country_id = $1 OR to_country_id = $1`,
      [country_id]
    );
    if (parseInt(transactions.rows[0].count) > 0) {
      dependencies.hasDependencies = true;
      dependencies.details.push(`${transactions.rows[0].count} transaction(s)`);
    }

    // Vérifier les taux de change
    const rates = await client.query(
      `SELECT COUNT(*) FROM rates WHERE from_country_id = $1 OR to_country_id = $1`,
      [country_id]
    );
    if (parseInt(rates.rows[0].count) > 0) {
      dependencies.hasDependencies = true;
      dependencies.details.push(`${rates.rows[0].count} taux de change`);
    }

    return dependencies;
  } catch (error) {
    console.error('Erreur vérification dépendances:', error);
    throw error;
  }
};

// Récupérer les pays supprimés (soft delete)
export const findDeletedCountries = async () => {
  console.log('🔍 Récupération pays supprimés');
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.code, c.phone_prefix, c.currency_id, 
              c.is_active, c.created_at, c.updated_at, c.deleted_at,
              cur.code as currency_code, cur.name as currency_name
       FROM countries c
       LEFT JOIN currencies cur ON c.currency_id = cur.id
       WHERE c.deleted_at IS NOT NULL
       ORDER BY c.deleted_at DESC`
    );
    console.log(`✅ ${result.rows.length} pays supprimés récupérés`);
    return result.rows;
  } catch (error) {
    console.error('Erreur récupération pays supprimés:', error);
    throw error;
  }
};

// Restaurer un pays soft delete
export const restoreCountryById = async (id, admin_id = null) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE countries 
       SET deleted_at = NULL, is_active = true, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NOT NULL
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Pays non trouvé ou déjà actif');
    }
    
    const restoredCountry = result.rows[0];

    await logHistory({
      action_type: 'country_restored',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'country',
      entity_id: id,
      description: `Pays restauré: ${restoredCountry.name} (${restoredCountry.code})`,
      metadata: { 
        country_name: restoredCountry.name,
        country_code: restoredCountry.code,
        restored_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return restoredCountry;
    
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};