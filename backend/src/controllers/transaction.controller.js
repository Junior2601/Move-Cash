import { 
  createTransaction,
  findAllTransactions,
  getTransactionStats,
  clientValidateTransaction,
  validateTransaction, 
  cancelTransaction, 
  findTransactionById, 
  findTransactionByTrackingCode,
  redirectTransaction,
  acceptRedirection,
  rejectRedirection,
  findTransactionsByAgent,
  getAgentStats,
  getAgentGainsHistory
} from '../models/transaction.repository.js';
import { pool } from '../config/db.js';

// =========================
// Dashboard agent - VERSION AVEC API GAINS
// =========================
export const getAgentDashboardController = async (req, res) => {
  try {
    const agent_id = req.user.id;

    console.log('📊 Dashboard agent:', { agent_id });

    // Valider que l'agent existe
    const agentCheck = await pool.query(
      'SELECT id, name, email, created_at FROM agents WHERE id = $1 AND is_active = true',
      [agent_id]
    );

    if (agentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé ou inactif'
      });
    }

    // Récupérer les statistiques globales
    const stats = await getAgentStats(agent_id);

    // Récupérer les transactions récentes (5 dernières)
    const recentTransactions = await findTransactionsByAgent(agent_id, {
      page: 1,
      limit: 5
    });

    // Calculer les statistiques pour le dashboard
    const pendingCount = stats.by_status['en_attente']?.count || 0;
    const completedCount = stats.by_status['effectuee']?.count || 0;
    const failedCount = (stats.by_status['echouee']?.count || 0) + (stats.by_status['expiree']?.count || 0);
    
    // Récupérer les soldes par devise
    const balancesByCurrency = stats.current_balance || [];
    const totalBalance = balancesByCurrency.reduce((total, balance) => {
      return total + parseFloat(balance.balance || 0);
    }, 0);

    // NOUVEAU: Récupérer les gains du mois en cours par devise
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const monthlyGainsByCurrency = await pool.query(
      `SELECT 
          c.id as currency_id,
          c.code as currency_code,
          c.name as currency_name,
          c.symbol as currency_symbol,
          COALESCE(SUM(g.gain_amount), 0) as total_commissions,
          COUNT(g.id) as number_of_transactions
       FROM gains g
       JOIN currencies c ON g.currency_id = c.id
       WHERE g.agent_id = $1 
         AND EXTRACT(YEAR FROM g.created_at) = $2
         AND EXTRACT(MONTH FROM g.created_at) = $3
       GROUP BY c.id, c.code, c.name, c.symbol
       ORDER BY total_commissions DESC`,
      [agent_id, currentYear, currentMonth]
    );

    // Récupérer le volume des transactions du mois par devise
    const monthlyVolumeByCurrency = await pool.query(
      `SELECT 
          c.code as currency_code,
          c.symbol as currency_symbol,
          COALESCE(SUM(t.send_amount), 0) as total_volume,
          COUNT(t.id) as transaction_count
       FROM transactions t
       JOIN countries fc ON t.from_country_id = fc.id
       JOIN currencies c ON fc.currency_id = c.id
       WHERE t.assigned_agent_id = $1 
         AND t.status = 'effectuee'
         AND EXTRACT(YEAR FROM t.created_at) = $2
         AND EXTRACT(MONTH FROM t.created_at) = $3
       GROUP BY c.code, c.symbol
       ORDER BY total_volume DESC`,
      [agent_id, currentYear, currentMonth]
    );

    // Calculer les totaux
    const monthlyCommissions = monthlyGainsByCurrency.rows.reduce((total, row) => {
      return total + parseFloat(row.total_commissions);
    }, 0);

    const monthlyVolume = monthlyVolumeByCurrency.rows.reduce((total, row) => {
      return total + parseFloat(row.total_volume);
    }, 0);

    // Récupérer le nombre total de transactions du mois
    const monthlyTransactionsRes = await pool.query(
      `SELECT COUNT(*) as count 
       FROM transactions 
       WHERE assigned_agent_id = $1 
         AND status = 'effectuee'
         AND EXTRACT(YEAR FROM created_at) = $2
         AND EXTRACT(MONTH FROM created_at) = $3`,
      [agent_id, currentYear, currentMonth]
    );

    const monthlyTransactionCount = parseInt(monthlyTransactionsRes.rows[0]?.count || 0);

    // Combiner les données de volume et de commissions
    const combinedMonthlyData = monthlyVolumeByCurrency.rows.map(volumeItem => {
      const gainItem = monthlyGainsByCurrency.rows.find(gain => 
        gain.currency_code === volumeItem.currency_code
      );
      
      return {
        currency_code: volumeItem.currency_code,
        currency_symbol: volumeItem.currency_symbol,
        total_volume: parseFloat(volumeItem.total_volume),
        total_commissions: gainItem ? parseFloat(gainItem.total_commissions) : 0,
        transaction_count: parseInt(volumeItem.transaction_count)
      };
    });

    // Ajouter les devises qui ont des gains mais pas de volume (cas rare)
    monthlyGainsByCurrency.rows.forEach(gainItem => {
      const exists = combinedMonthlyData.find(item => 
        item.currency_code === gainItem.currency_code
      );
      if (!exists) {
        combinedMonthlyData.push({
          currency_code: gainItem.currency_code,
          currency_symbol: gainItem.currency_symbol,
          total_volume: 0,
          total_commissions: parseFloat(gainItem.total_commissions),
          transaction_count: parseInt(gainItem.number_of_transactions)
        });
      }
    });

    res.json({
      success: true,
      message: 'Dashboard agent récupéré avec succès',
      data: {
        balance: totalBalance,
        pending: pendingCount,
        completed: completedCount,
        failed: failedCount,
        monthly_earnings: monthlyCommissions, // Commissions du mois depuis la table gains
        monthly_volume: monthlyVolume, // Volume total des transactions
        monthly_transactions: monthlyTransactionCount,
        monthly_volume_by_currency: combinedMonthlyData, // Données combinées volume + commissions
        monthly_commissions_by_currency: monthlyGainsByCurrency.rows, // Commissions par devise
        recent_transactions: recentTransactions.transactions,
        balances_by_currency: balancesByCurrency,
        agent_info: agentCheck.rows[0]
      }
    });
  } catch (error) {
    console.error('❌ Erreur dashboard agent:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération du dashboard'
    });
  }
};

// =========================
// Statistiques personnelles agent
// =========================
export const getAgentPersonalStatsController = async (req, res) => {
  try {
    const agent_id = req.user.id;
    const { start_date, end_date, status } = req.query;

    console.log('📊 Stats personnelles agent:', { agent_id, query: req.query });

    const agentCheck = await pool.query(
      'SELECT id, name FROM agents WHERE id = $1 AND is_active = true',
      [agent_id]
    );

    if (agentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé ou inactif'
      });
    }

    const stats = await getAgentStats(agent_id, {
      start_date: start_date || null,
      end_date: end_date || null,
      status: status || null
    });

    res.json({
      success: true,
      message: 'Statistiques récupérées avec succès',
      data: {
        ...stats,
        agent_info: {
          id: agentCheck.rows[0].id,
          name: agentCheck.rows[0].name
        }
      }
    });
  } catch (error) {
    console.error('❌ Erreur stats personnelles agent:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des statistiques'
    });
  }
};

// =========================
// Transactions de l'agent
// =========================
export const getAgentTransactionsController = async (req, res) => {
  try {
    const agent_id = req.user.id;
    const {
      page = 1,
      limit = 10,
      status,
      start_date,
      end_date
    } = req.query;

    // Validation des paramètres
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre page doit être un nombre positif'
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre limit doit être un nombre entre 1 et 100'
      });
    }

    const result = await findTransactionsByAgent(agent_id, {
      page: pageNum,
      limit: limitNum,
      status,
      start_date,
      end_date
    });

    res.json({
      success: true,
      message: 'Transactions récupérées avec succès',
      data: {
        transactions: result.transactions,
        pagination: result.pagination
      }
    });
  } catch (error) {
    console.error('❌ Erreur transactions agent:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des transactions'
    });
  }
};

// =========================
// Historique des gains agent
// =========================
export const getAgentGainsHistoryController = async (req, res) => {
  try {
    const agent_id = req.user.id;
    const {
      page = 1,
      limit = 10,
      start_date,
      end_date
    } = req.query;

    // Validation des paramètres
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre page doit être un nombre positif'
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre limit doit être un nombre entre 1 et 100'
      });
    }

    const result = await getAgentGainsHistory(agent_id, {
      page: pageNum,
      limit: limitNum,
      start_date: start_date || null,
      end_date: end_date || null
    });

    res.json({
      success: true,
      message: 'Historique des gains récupéré avec succès',
      data: result
    });
  } catch (error) {
    console.error('❌ Erreur historique gains agent:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération de l\'historique des gains'
    });
  }
};

// =========================
// Création de transaction
// =========================
export const createTransactionController = async (req, res) => {
  try {
    const {
      from_country_id,
      to_country_id,
      sender_phone,
      receiver_phone,
      sender_method_id,
      receiver_method_id,
      send_amount
    } = req.body;

    if (!from_country_id || !to_country_id || !sender_phone || !receiver_phone || 
        !sender_method_id || !receiver_method_id || !send_amount) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont obligatoires'
      });
    }

    if (send_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Le montant doit être supérieur à 0'
      });
    }

    const transaction = await createTransaction({
      from_country_id,
      to_country_id,
      sender_phone,
      receiver_phone,
      sender_method_id,
      receiver_method_id,
      send_amount
    });

    res.status(201).json({
      success: true,
      message: 'Transaction créée avec succès',
      data: transaction
    });
  } catch (error) {
    console.error('Erreur création transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création de la transaction'
    });
  }
};

// =========================
// Validation par le client
// =========================
export const clientValidateTransactionController = async (req, res) => {
  try {
    const result = await clientValidateTransaction(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// =========================
// Validation transaction par agent/admin
// =========================
export const validateTransactionController = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const actor = req.user;

    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        message: 'ID de transaction requis'
      });
    }

    const result = await validateTransaction(transaction_id, actor);

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Erreur validation transaction:', error);
    
    if (error.message.includes('introuvable')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('déjà traitée') || error.message.includes('expirée')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la validation de la transaction'
    });
  }
};

// =========================
// Annulation transaction
// =========================
export const cancelTransactionController = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const actor = req.user;

    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        message: 'ID de transaction requis'
      });
    }

    const result = await cancelTransaction(transaction_id, actor);

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Erreur annulation transaction:', error);
    
    if (error.message.includes('introuvable') || error.message.includes('déjà traitée')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'annulation de la transaction'
    });
  }
};

// =========================
// Récupération transaction par ID
// =========================
export const getTransactionByIdController = async (req, res) => {
  try {
    const { transaction_id } = req.params;

    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        message: 'ID de transaction requis'
      });
    }

    const transaction = await findTransactionById(transaction_id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Erreur récupération transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération de la transaction'
    });
  }
};

// =========================
// Récupération transaction par tracking code
// =========================
export const getTransactionByTrackingCodeController = async (req, res) => {
  try {
    const { tracking_code } = req.params;

    if (!tracking_code) {
      return res.status(400).json({
        success: false,
        message: 'Code de tracking requis'
      });
    }

    const transaction = await findTransactionByTrackingCode(tracking_code);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Erreur récupération transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération de la transaction'
    });
  }
};

// =========================
// Redirection de transaction
// =========================
export const redirectTransactionController = async (req, res) => {
  try {
    const {
      transaction_id,
      to_agent_id,
      redirected_amount,
      reason
    } = req.body;

    const actor = req.user;

    if (!transaction_id || !to_agent_id || !redirected_amount) {
      return res.status(400).json({
        success: false,
        message: 'transaction_id, to_agent_id et redirected_amount sont obligatoires'
      });
    }

    if (redirected_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Le montant redirigé doit être supérieur à 0'
      });
    }

    const redirection = await redirectTransaction({
      transaction_id,
      from_agent_id: actor.id,
      to_agent_id,
      redirected_amount,
      reason,
      actor
    });

    res.status(201).json({
      success: true,
      message: 'Transaction redirigée avec succès',
      data: redirection
    });
  } catch (error) {
    console.error('Erreur redirection transaction:', error);
    
    if (error.message.includes('introuvable') || 
        error.message.includes('Impossible') || 
        error.message.includes('assigné')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la redirection de la transaction'
    });
  }
};

// =========================
// Acceptation redirection
// =========================
export const acceptRedirectionController = async (req, res) => {
  try {
    const { redirection_id } = req.params;
    const actor = req.user;

    if (!redirection_id) {
      return res.status(400).json({
        success: false,
        message: 'ID de redirection requis'
      });
    }

    const redirection = await acceptRedirection(redirection_id, actor.id, actor);

    res.json({
      success: true,
      message: 'Redirection acceptée avec succès',
      data: redirection
    });
  } catch (error) {
    console.error('Erreur acceptation redirection:', error);
    
    if (error.message.includes('introuvable') || 
        error.message.includes('déjà traitée') || 
        error.message.includes('autorisé')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'acceptation de la redirection'
    });
  }
};

// =========================
// Rejet redirection
// =========================
export const rejectRedirectionController = async (req, res) => {
  try {
    const { redirection_id } = req.params;
    const actor = req.user;

    if (!redirection_id) {
      return res.status(400).json({
        success: false,
        message: 'ID de redirection requis'
      });
    }

    const redirection = await rejectRedirection(redirection_id, actor.id, actor);

    res.json({
      success: true,
      message: 'Redirection rejetée avec succès',
      data: redirection
    });
  } catch (error) {
    console.error('Erreur rejet redirection:', error);
    
    if (error.message.includes('introuvable') || error.message.includes('déjà traitée')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors du rejet de la redirection'
    });
  }
};

// =========================
// Récupération toutes les transactions (admin)
// =========================
export const getAllTransactionsController = async (req, res) => {
  try {
    console.log('📋 Query params received:', req.query);

    const {
      page = 1,
      limit = 10,
      status,
      agent_id,
      from_country_id,
      to_country_id,
      start_date,
      end_date
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre page doit être un nombre positif'
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre limit doit être un nombre entre 1 et 100'
      });
    }

    const validStatuses = ['en_attente', 'effectuee', 'echouee', 'expiree'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Les statuts valides sont: ${validStatuses.join(', ')}`
      });
    }

    const result = await findAllTransactions({
      page: pageNum,
      limit: limitNum,
      status: status || null,
      agent_id: agent_id || null,
      from_country_id: from_country_id || null,
      to_country_id: to_country_id || null,
      start_date: start_date || null,
      end_date: end_date || null
    });

    res.json({
      success: true,
      message: 'Transactions récupérées avec succès',
      data: result.transactions,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('❌ Error in getAllTransactionsController:', error);
    
    if (error.message.includes('invalid input syntax')) {
      return res.status(400).json({
        success: false,
        message: 'Paramètre de requête invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur lors de la récupération des transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =========================
// Statistiques transactions (admin)
// =========================
export const getTransactionStatsController = async (req, res) => {
  try {
    const {
      agent_id,
      from_country_id,
      to_country_id,
      start_date,
      end_date
    } = req.query;

    const stats = await getTransactionStats({
      agent_id: agent_id ? parseInt(agent_id) : null,
      from_country_id: from_country_id ? parseInt(from_country_id) : null,
      to_country_id: to_country_id ? parseInt(to_country_id) : null,
      start_date,
      end_date
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erreur stats transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

// =========================
// Récupérer les transactions redirigées vers l'agent
// =========================
export const getAgentRedirectedTransactionsController = async (req, res) => {
  try {
    const agent_id = req.user.id;
    const {
      page = 1,
      limit = 10,
      status,
      start_date,
      end_date
    } = req.query;

    console.log('🔍 [REDIRECT] Paramètres reçus:', { agent_id, page, limit, status });

    // Validation des paramètres
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Construire la requête de base
    let query = `
      SELECT 
        r.id as redirection_id,
        r.transaction_id,
        r.from_agent_id,
        r.to_agent_id,
        r.redirected_amount,
        r.reason as redirection_reason,
        r.status as redirection_status,
        r.created_at as redirection_created_at,
        r.processed_at as redirection_processed_at,
        t.*,
        fc.name as from_country_name,
        tc.name as to_country_name,
        from_curr.code as from_currency_code,
        to_curr.code as to_currency_code,
        from_curr.symbol as from_currency_symbol,
        to_curr.symbol as to_currency_symbol,
        sm.method as sender_method_name,
        rm.method as receiver_method_name,
        from_agent.name as from_agent_name,
        from_agent.email as from_agent_email,
        an.number as authorized_number
      FROM redirections r
      JOIN transactions t ON r.transaction_id = t.id
      LEFT JOIN countries fc ON t.from_country_id = fc.id
      LEFT JOIN countries tc ON t.to_country_id = tc.id
      LEFT JOIN currencies from_curr ON fc.currency_id = from_curr.id
      LEFT JOIN currencies to_curr ON tc.currency_id = to_curr.id
      LEFT JOIN payment_methods sm ON t.sender_method_id = sm.id
      LEFT JOIN payment_methods rm ON t.receiver_method_id = rm.id
      LEFT JOIN agents from_agent ON r.from_agent_id = from_agent.id
      LEFT JOIN authorized_numbers an ON t.authorized_number_id = an.id
      WHERE r.to_agent_id = $1
    `;

    let countQuery = `SELECT COUNT(*) FROM redirections WHERE to_agent_id = $1`;
    const params = [agent_id];
    const countParams = [agent_id];
    let paramCount = 1;
    let countParamCount = 1;

    // Appliquer les filtres
    if (status) {
      paramCount++;
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
      
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }

    if (start_date) {
      paramCount++;
      query += ` AND r.created_at >= $${paramCount}`;
      params.push(start_date);
      
      countParamCount++;
      countQuery += ` AND created_at >= $${countParamCount}`;
      countParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND r.created_at <= $${paramCount}`;
      params.push(end_date);
      
      countParamCount++;
      countQuery += ` AND created_at <= $${countParamCount}`;
      countParams.push(end_date);
    }

    // Ajouter l'ordre et la pagination
    query += ` ORDER BY r.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limitNum, offset);

    console.log('🔍 [REDIRECT] Requête SQL:', query);
    console.log('🔍 [REDIRECT] Paramètres:', params);

    // Exécuter les requêtes
    const transactionsResult = await pool.query(query, params);
    const countResult = await pool.query(countQuery, countParams);

    const total = parseInt(countResult.rows[0].count);

    console.log(`✅ [REDIRECT] ${transactionsResult.rows.length} transactions redirigées trouvées pour l'agent ${agent_id}`);

    // Formater les données
    const formattedTransactions = transactionsResult.rows.map(transaction => ({
      ...transaction,
      send_amount: parseFloat(transaction.send_amount) || 0,
      receive_amount: parseFloat(transaction.receive_amount) || 0,
      redirected_amount: parseFloat(transaction.redirected_amount) || 0,
      created_at: transaction.created_at ? new Date(transaction.created_at).toISOString() : null,
      redirection_created_at: transaction.redirection_created_at ? new Date(transaction.redirection_created_at).toISOString() : null,
      redirection_processed_at: transaction.redirection_processed_at ? new Date(transaction.redirection_processed_at).toISOString() : null
    }));

    res.json({
      success: true,
      message: 'Transactions redirigées récupérées avec succès',
      data: {
        transactions: formattedTransactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('❌ [REDIRECT] Erreur détaillée:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des transactions redirigées'
    });
  }
};