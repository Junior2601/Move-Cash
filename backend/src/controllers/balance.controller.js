import { 
  findAllBalances,
  findBalancesByAgent, 
  findBalanceByCurrency, 
  createBalance, 
  creditBalance, 
  debitBalance, 
  transferBalance,
  deleteBalanceById
} from '../models/balance.repository.js';

// =========================
// Obtenir TOUTES les balances (admin seulement)
// =========================
export const getAllBalances = async (req, res) => {
  try {
    const balances = await findAllBalances();
    
    res.status(200).json({
      success: true,
      data: balances,
      message: 'Toutes les balances récupérées avec succès'
    });
  } catch (error) {
    console.error('Erreur getAllBalances:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des balances',
      error: error.message
    });
  }
};

// =========================
// Obtenir toutes les balances d'un agent
// =========================
export const getAgentBalances = async (req, res) => {
  try {
    const { agent_id } = req.params;
    
    if (!agent_id) {
      return res.status(400).json({ message: 'ID agent requis' });
    }

    const balances = await findBalancesByAgent(agent_id);
    
    res.status(200).json({
      success: true,
      data: balances,
      message: 'Balances récupérées avec succès'
    });
  } catch (error) {
    console.error('Erreur getAgentBalances:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des balances',
      error: error.message
    });
  }
};

// =========================
// Obtenir une balance spécifique
// =========================
export const getAgentBalanceByCurrency = async (req, res) => {
  try {
    const { agent_id, currency_id } = req.params;
    
    if (!agent_id || !currency_id) {
      return res.status(400).json({ message: 'ID agent et devise requis' });
    }

    const balance = await findBalanceByCurrency(agent_id, currency_id);
    
    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Balance non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      data: balance,
      message: 'Balance récupérée avec succès'
    });
  } catch (error) {
    console.error('Erreur getAgentBalanceByCurrency:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de la balance',
      error: error.message
    });
  }
};

// =========================
// Créer une nouvelle balance
// =========================
export const createAgentBalance = async (req, res) => {
  try {
    const { agent_id, currency_id } = req.body;
    const actor = req.user;
    
    if (!agent_id || !currency_id) {
      return res.status(400).json({ message: 'ID agent et devise requis' });
    }

    const balance = await createBalance(agent_id, currency_id, actor);
    
    if (!balance) {
      return res.status(200).json({
        success: true,
        message: 'Balance existe déjà',
        data: null
      });
    }

    res.status(201).json({
      success: true,
      data: balance,
      message: 'Balance créée avec succès'
    });
  } catch (error) {
    console.error('Erreur createAgentBalance:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de la balance',
      error: error.message
    });
  }
};

// =========================
// Créditer une balance
// =========================
export const creditAgentBalance = async (req, res) => {
  try {
    const { agent_id, currency_id, amount, reason } = req.body;
    const actor = req.user;
    
    if (!agent_id || !currency_id || !amount) {
      return res.status(400).json({ message: 'ID agent, devise et montant requis' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Le montant doit être positif' });
    }

    const balance = await creditBalance(agent_id, currency_id, amount, actor, reason);
    
    res.status(200).json({
      success: true,
      data: balance,
      message: 'Balance créditée avec succès'
    });
  } catch (error) {
    console.error('Erreur creditAgentBalance:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du crédit de la balance',
      error: error.message
    });
  }
};

// =========================
// Débiter une balance
// =========================
export const debitAgentBalance = async (req, res) => {
  try {
    const { agent_id, currency_id, amount, reason } = req.body;
    const actor = req.user;
    
    if (!agent_id || !currency_id || !amount) {
      return res.status(400).json({ message: 'ID agent, devise et montant requis' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Le montant doit être positif' });
    }

    const balance = await debitBalance(agent_id, currency_id, amount, actor, reason);
    
    res.status(200).json({
      success: true,
      data: balance,
      message: 'Balance débitée avec succès'
    });
  } catch (error) {
    console.error('Erreur debitAgentBalance:', error);
    
    if (error.message === 'Solde insuffisant') {
      return res.status(400).json({
        success: false,
        message: 'Solde insuffisant pour effectuer le débit'
      });
    }

    if (error.message === 'Balance introuvable') {
      return res.status(404).json({
        success: false,
        message: 'Balance non trouvée'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du débit de la balance',
      error: error.message
    });
  }
};

// =========================
// Supprimer une balance
// =========================
export const deleteBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const actor = req.user;
    
    if (!id) {
      return res.status(400).json({ message: 'ID balance requis' });
    }

    // ✅ CORRECTION : Ajout du paramètre actor
    const balance = await deleteBalanceById(id, actor);
    
    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Balance non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Balance supprimée avec succès',
      data: balance
    });
  } catch (error) {
    console.error('Erreur deleteBalance:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression de la balance',
      error: error.message
    });
  }
};

// =========================
// Transférer entre balances
// =========================
export const transferBetweenBalances = async (req, res) => {
  try {
    const { from_agent_id, to_agent_id, currency_id, amount, reason } = req.body;
    const actor = req.user;
    
    if (!from_agent_id || !to_agent_id || !currency_id || !amount) {
      return res.status(400).json({ 
        message: 'Agent source, agent destination, devise et montant requis' 
      });
    }

    if (from_agent_id === to_agent_id) {
      return res.status(400).json({ 
        message: 'Les agents source et destination doivent être différents' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Le montant doit être positif' });
    }

    const result = await transferBalance(from_agent_id, to_agent_id, currency_id, amount, actor, reason);
    
    res.status(200).json({
      success: true,
      data: result,
      message: 'Transfert effectué avec succès'
    });
  } catch (error) {
    console.error('Erreur transferBetweenBalances:', error);
    
    if (error.message === 'Solde insuffisant') {
      return res.status(400).json({
        success: false,
        message: 'Solde insuffisant pour effectuer le transfert'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du transfert',
      error: error.message
    });
  }
};

// =========================
// Vérifier le solde avant opération
// =========================
export const checkBalance = async (req, res) => {
  try {
    const { agent_id, currency_id, amount } = req.body;
    
    if (!agent_id || !currency_id || !amount) {
      return res.status(400).json({ message: 'ID agent, devise et montant requis' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Le montant doit être positif' });
    }

    const balance = await findBalanceByCurrency(agent_id, currency_id);
    
    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Balance non trouvée',
        hasSufficientBalance: false
      });
    }

    const hasSufficientBalance = balance.amount >= amount;

    res.status(200).json({
      success: true,
      data: {
        current_balance: balance.amount,
        required_amount: amount,
        hasSufficientBalance,
        deficit: hasSufficientBalance ? 0 : amount - balance.amount
      },
      message: hasSufficientBalance ? 
        'Solde suffisant' : 
        'Solde insuffisant'
    });
  } catch (error) {
    console.error('Erreur checkBalance:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification du solde',
      error: error.message
    });
  }
};

// =========================
// Obtenir les balances de l'agent connecté
// =========================
export const getMyBalances = async (req, res) => {
  try {
    const user = req.user;
    
    if (user.role !== 'agent') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux agents'
      });
    }

    const balances = await findBalancesByAgent(user.id);
    
    res.status(200).json({
      success: true,
      data: balances,
      message: 'Vos balances ont été récupérées avec succès'
    });
  } catch (error) {
    console.error('Erreur getMyBalances:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de vos balances',
      error: error.message
    });
  }
};