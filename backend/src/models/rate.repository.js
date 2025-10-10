import { pool } from '../config/db.js';
import { logHistory } from './history.repository.js';

// Fonction utilitaire pour récupérer les noms des devises
const getCurrencyNames = async (from_currency_id, to_currency_id) => {
  const result = await pool.query(`
    SELECT 
      fc.code as from_currency_code,
      fc.name as from_currency_name,
      tc.code as to_currency_code,
      tc.name as to_currency_name
    FROM currencies fc, currencies tc
    WHERE fc.id = $1 AND tc.id = $2
  `, [from_currency_id, to_currency_id]);
  
  return result.rows[0] || { from_currency_code: '', from_currency_name: '', to_currency_code: '', to_currency_name: '' };
};

// Lister uniquement les taux actifs
export const findActiveRates = async () => {
  const result = await pool.query(
    `SELECT r.*, 
            fc.code AS from_currency_code, 
            fc.name AS from_currency_name,
            fc.symbol AS from_currency_symbol,
            tc.code AS to_currency_code,
            tc.name AS to_currency_name,
            tc.symbol AS to_currency_symbol
     FROM rates r
     JOIN currencies fc ON r.from_currency_id = fc.id
     JOIN currencies tc ON r.to_currency_id = tc.id
     WHERE r.is_active = true
     ORDER BY fc.code, tc.code`
  );
  return result.rows;
};

// Lister tous les taux (admin)
export const findAllRates = async () => {
  const result = await pool.query(
    `SELECT r.*, 
            fc.code AS from_currency_code,
            fc.name AS from_currency_name,
            fc.symbol AS from_currency_symbol,
            tc.code AS to_currency_code,
            tc.name AS to_currency_name,
            tc.symbol AS to_currency_symbol
     FROM rates r
     JOIN currencies fc ON r.from_currency_id = fc.id
     JOIN currencies tc ON r.to_currency_id = tc.id
     ORDER BY r.created_at DESC`
  );
  return result.rows;
};

// Créer un taux avec vérification d'existence
export const createRate = async (from_currency_id, to_currency_id, rate, commission_percent = 0.75, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Vérifier si le taux existe déjà
    const existingRate = await client.query(
      `SELECT id FROM rates WHERE from_currency_id = $1 AND to_currency_id = $2`,
      [from_currency_id, to_currency_id]
    );

    if (existingRate.rows.length > 0) {
      throw new Error('Un taux existe déjà pour cette paire de devises');
    }

    const result = await client.query(
      `INSERT INTO rates (from_currency_id, to_currency_id, rate, commission_percent, created_by) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [from_currency_id, to_currency_id, rate, commission_percent, admin_id]
    );
    
    const newRate = result.rows[0];

    // Récupérer les noms des devises pour le log
    const currencyNames = await getCurrencyNames(from_currency_id, to_currency_id);

    // Log de création de taux
    await logHistory({
      action_type: 'Création de taux',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'rate',
      entity_id: newRate.id,
      description: `Taux de change créé: ${currencyNames.from_currency_code} → ${currencyNames.to_currency_code} = ${rate}`,
      metadata: { 
        from_currency: currencyNames.from_currency_code,
        to_currency: currencyNames.to_currency_code,
        from_currency_name: currencyNames.from_currency_name,
        to_currency_name: currencyNames.to_currency_name,
        rate,
        commission_percent,
        created_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return newRate;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Mettre à jour un taux
export const updateRateById = async (id, rate, commission_percent, is_active, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer l'ancien taux pour le log
    const oldRateResult = await client.query(
      `SELECT r.*, 
              fc.code as from_currency_code, 
              fc.name as from_currency_name,
              tc.code as to_currency_code,
              tc.name as to_currency_name
       FROM rates r
       JOIN currencies fc ON r.from_currency_id = fc.id
       JOIN currencies tc ON r.to_currency_id = tc.id
       WHERE r.id = $1`,
      [id]
    );
    
    if (oldRateResult.rows.length === 0) {
      throw new Error('Taux introuvable');
    }
    
    const oldRate = oldRateResult.rows[0];

    const result = await client.query(
      `UPDATE rates 
       SET rate = $1, commission_percent = $2, is_active = $3, updated_at = NOW()
       WHERE id = $4 
       RETURNING *`,
      [rate, commission_percent, is_active, id]
    );
    
    const updatedRate = result.rows[0];

    // Log de modification de taux
    await logHistory({
      action_type: 'Modification Taux',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'rate',
      entity_id: id,
      description: `Taux de change modifié: ${oldRate.from_currency_code} → ${oldRate.to_currency_code} = ${rate}`,
      metadata: { 
        from_currency: oldRate.from_currency_code,
        to_currency: oldRate.to_currency_code,
        from_currency_name: oldRate.from_currency_name,
        to_currency_name: oldRate.to_currency_name,
        old_rate: oldRate.rate,
        new_rate: rate,
        old_commission: oldRate.commission_percent,
        new_commission: commission_percent,
        old_status: oldRate.is_active,
        new_status: is_active,
        updated_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return updatedRate;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Supprimer un taux
export const deleteRateById = async (id, admin_id = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer le taux avant suppression pour le log
    const oldRateResult = await client.query(
      `SELECT r.*, 
              fc.code as from_currency_code, 
              fc.name as from_currency_name,
              tc.code as to_currency_code,
              tc.name as to_currency_name
       FROM rates r
       JOIN currencies fc ON r.from_currency_id = fc.id
       JOIN currencies tc ON r.to_currency_id = tc.id
       WHERE r.id = $1`,
      [id]
    );
    
    if (oldRateResult.rows.length === 0) {
      throw new Error('Taux introuvable');
    }
    
    const oldRate = oldRateResult.rows[0];

    const result = await client.query(
      `DELETE FROM rates WHERE id = $1 RETURNING *`,
      [id]
    );
    
    const deletedRate = result.rows[0];

    // Log de suppression de taux
    await logHistory({
      action_type: 'rate_deleted',
      actor_type: 'admin',
      actor_id: admin_id,
      entity_type: 'rate',
      entity_id: id,
      description: `Taux de change supprimé: ${oldRate.from_currency_code} → ${oldRate.to_currency_code}`,
      metadata: { 
        from_currency: oldRate.from_currency_code,
        to_currency: oldRate.to_currency_code,
        from_currency_name: oldRate.from_currency_name,
        to_currency_name: oldRate.to_currency_name,
        rate: oldRate.rate,
        commission_percent: oldRate.commission_percent,
        deleted_by: admin_id
      }
    }, client);

    await client.query('COMMIT');
    return deletedRate;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Trouver un taux par paire de devises
export const findRateByCurrencies = async (from_currency_id, to_currency_id) => {
  const result = await pool.query(
    `SELECT r.*,
            fc.code as from_currency_code,
            fc.name as from_currency_name,
            fc.symbol as from_currency_symbol,
            tc.code as to_currency_code,
            tc.name as to_currency_name,
            tc.symbol as to_currency_symbol
     FROM rates r
     JOIN currencies fc ON r.from_currency_id = fc.id
     JOIN currencies tc ON r.to_currency_id = tc.id
     WHERE r.from_currency_id = $1 AND r.to_currency_id = $2
     AND r.is_active = true
     ORDER BY r.created_at DESC
     LIMIT 1`,
    [from_currency_id, to_currency_id]
  );
  return result.rows[0];
};

// Récupérer les statistiques des taux
export const getRatesStats = async () => {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_rates,
      COUNT(*) FILTER (WHERE is_active = true) as active_rates,
      COUNT(*) FILTER (WHERE is_active = false) as inactive_rates,
      COUNT(DISTINCT from_currency_id) as unique_from_currencies,
      COUNT(DISTINCT to_currency_id) as unique_to_currencies
    FROM rates
  `);
  
  return result.rows[0];
};

// Récupérer l'historique des modifications d'un taux spécifique
export const getRateHistory = async (rate_id) => {
  const result = await pool.query(`
    SELECT * FROM history 
    WHERE entity_type = 'rate' AND entity_id = $1
    ORDER BY created_at DESC
  `, [rate_id]);
  
  return result.rows;
};

// Trouver un taux par paire de pays
export const findRateByCountries = async (from_country_id, to_country_id) => {
  console.log('🔍 Recherche taux par pays:', { from_country_id, to_country_id });
  
  try {
    const result = await pool.query(
      `SELECT 
        r.*,
        fc.code as from_currency_code,
        fc.name as from_currency_name,
        fc.symbol as from_currency_symbol,
        tc.code as to_currency_code,
        tc.name as to_currency_name,
        tc.symbol as to_currency_symbol,
        from_country.name as from_country_name,
        to_country.name as to_country_name
      FROM rates r
      JOIN countries from_country ON from_country.id = $1
      JOIN countries to_country ON to_country.id = $2
      JOIN currencies fc ON r.from_currency_id = fc.id
      JOIN currencies tc ON r.to_currency_id = tc.id
      WHERE from_country.currency_id = r.from_currency_id 
        AND to_country.currency_id = r.to_currency_id
        AND r.is_active = true
      ORDER BY r.created_at DESC
      LIMIT 1`,
      [from_country_id, to_country_id]
    );
    
    console.log(`✅ Résultat recherche: ${result.rows.length} taux trouvé(s)`);
    
    return result.rows[0];
  } catch (error) {
    console.error('💥 Erreur recherche taux par pays:', error);
    throw error;
  }
};