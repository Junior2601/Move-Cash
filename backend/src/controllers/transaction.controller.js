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
// Créer une transaction (Client)
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

    // Validation des données requises
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
// Valider une transaction (client)
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
// Valider une transaction (Admin/Agent)
// =========================
export const validateTransactionController = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const actor = req.user; // Supposant que l'utilisateur est authentifié

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
// Annuler une transaction (Admin/Agent)
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
// Récupérer une transaction par ID
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
// Récupérer une transaction par tracking code
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
// Rediriger une transaction (Agent)
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

    // Validation des données requises
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
      from_agent_id: actor.id, // L'agent connecté est celui qui redirige
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
// Accepter une redirection (Agent)
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
// Rejeter une redirection (Agent)
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
// Lister toutes les transactions (Admin)
// =========================
export const getAllTransactionsController = async (req, res) => {
  try {
    console.log('📋 Query params received:', req.query);

    // Extraction et validation des paramètres
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

    // Validation des paramètres numériques
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

    // Validation du statut
    const validStatuses = ['en_attente', 'effectuee', 'echouee', 'expiree'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Les statuts valides sont: ${validStatuses.join(', ')}`
      });
    }

    // Appeler la fonction du repository
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

    // Réponse réussie
    res.json({
      success: true,
      message: 'Transactions récupérées avec succès',
      data: result.transactions,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('❌ Error in getAllTransactionsController:', error);
    
    // Gérer les erreurs spécifiques
    if (error.message.includes('invalid input syntax')) {
      return res.status(400).json({
        success: false,
        message: 'Paramètre de requête invalide'
      });
    }

    // Erreur générale
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur lors de la récupération des transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// =========================
// Obtenir les transactions d'un agent
// =========================
export const getAgentTransactionsController = async (req, res) => {
  try {
    const { agent_id } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      start_date,
      end_date
    } = req.query;

    // Valider l'ID de l'agent
    const agentIdNum = parseInt(agent_id);
    if (isNaN(agentIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'agent invalide'
      });
    }

    // Convertir les paramètres numériques
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
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

    const result = await findTransactionsByAgent(agentIdNum, {
      page: pageNum,
      limit: limitNum,
      status,
      start_date,
      end_date
    });

    res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Erreur transactions agent:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des transactions de l\'agent'
    });
  }
};

// =========================
// Obtenir les statistiques des transactions (Admin)
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
// Obtenir les statistiques d'un agent (pour l'agent lui-même)
// =========================
export const getAgentPersonalStatsController = async (req, res) => {
  try {
    const agent_id = req.user.id; // L'agent connecté
    const {
      start_date,
      end_date,
      status
    } = req.query;

    console.log('📊 Stats personnelles agent:', { agent_id, query: req.query });

    // Valider que l'agent existe et est actif
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
// Obtenir l'historique des gains d'un agent
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
// Obtenir le dashboard complet de l'agent
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

    // Récupérer les gains du mois en cours
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyGains = await getAgentGainsHistory(agent_id, {
      start_date: `${currentMonth}-01`,
      end_date: new Date().toISOString().split('T')[0],
      page: 1,
      limit: 1000 // Récupérer tout pour calculer le total du mois
    });

    const monthlyTotal = monthlyGains.summary.total_gains;

    res.json({
      success: true,
      message: 'Dashboard agent récupéré avec succès',
      data: {
        agent_info: agentCheck.rows[0],
        stats: stats,
        recent_transactions: recentTransactions.transactions,
        monthly_performance: {
          current_month: currentMonth,
          total_gains: monthlyTotal,
          transaction_count: monthlyGains.summary.total_count
        },
        quick_stats: {
          pending_transactions: stats.by_status['en_attente']?.count || 0,
          completed_today: 0, // À implémenter si nécessaire
          total_balance: stats.current_balance.reduce((total, balance) => total + parseFloat(balance.balance), 0)
        }
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