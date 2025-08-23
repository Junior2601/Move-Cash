import { 
  createTransaction, 
  validateTransaction, 
  cancelTransaction, 
  findTransactionById, 
  findTransactionByTrackingCode,
  redirectTransaction,
  acceptRedirection,
  rejectRedirection
} from '../models/transaction.repository.js';

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
    // Implémentation basique - à adapter selon votre modèle
    const { rows } = await pool.query(`
      SELECT t.*, 
             c1.name as from_country_name,
             c2.name as to_country_name,
             a.name as agent_name
      FROM transactions t
      LEFT JOIN countries c1 ON t.from_country_id = c1.id
      LEFT JOIN countries c2 ON t.to_country_id = c2.id
      LEFT JOIN agents a ON t.assigned_agent_id = a.id
      ORDER BY t.created_at DESC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Erreur liste transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des transactions'
    });
  }
};

// =========================
// Obtenir les statistiques des transactions (Admin)
// =========================
export const getTransactionStatsController = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE status = 'effectuee') as completed,
        COUNT(*) FILTER (WHERE status = 'en_attente') as pending,
        COUNT(*) FILTER (WHERE status = 'echouee') as failed,
        COUNT(*) FILTER (WHERE status = 'expiree') as expired,
        SUM(send_amount) as total_amount_sent,
        SUM(receive_amount) as total_amount_received
      FROM transactions
    `);

    res.json({
      success: true,
      data: stats.rows[0]
    });
  } catch (error) {
    console.error('Erreur stats transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};