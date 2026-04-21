import { 
  authorizeAgentToValidate,
  revokeAgentAuthorization as revokeAgentAuthorizationInDB,  // ← Renommé
  getAuthorizedAgents as getAuthorizedAgentsFromDB,          // ← Renommé
  getUnauthorizedAgents as getUnauthorizedAgentsFromDB       // ← Renommé
} from '../models/agent_authorization.repository.js';
import { getAgentById } from '../models/agent.repository.js';

// Autoriser un agent à valider des transactions
export const authorizeAgent = async (req, res) => {
  try {
    const { agent_id } = req.params;
    const admin_id = req.user.id;

    // Vérifier si l'agent existe
    const agent = await getAgentById(agent_id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé'
      });
    }

    const result = await authorizeAgentToValidate(agent_id, admin_id, 'admin');

    res.json({
      success: true,
      message: `Agent ${agent.name} autorisé à valider des transactions`,
      data: result
    });
  } catch (error) {
    console.error('❌ Erreur autorisation agent:', error);
    
    // Gestion des erreurs spécifiques
    if (error.message.includes('déjà autorisé')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'autorisation de l\'agent'
    });
  }
};

// Révoquer l'autorisation d'un agent
export const revokeAgentAuthorization = async (req, res) => {
  try {
    const { agent_id } = req.params;
    const admin_id = req.user.id;

    const agent = await getAgentById(agent_id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé'
      });
    }

    const result = await revokeAgentAuthorizationInDB(agent_id, admin_id, 'admin');  // ← Utilisation du nom renommé

    res.json({
      success: true,
      message: `Autorisation de validation révoquée pour l'agent ${agent.name}`,
      data: result
    });
  } catch (error) {
    console.error('❌ Erreur révocation autorisation:', error);
    
    // Gestion des erreurs spécifiques
    if (error.message.includes('pas autorisé')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la révocation de l\'autorisation'
    });
  }
};

// Récupérer les agents autorisés
export const getAuthorizedAgents = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const agents = await getAuthorizedAgentsFromDB(limit, offset);  // ← Utilisation du nom renommé

    res.json({
      success: true,
      data: agents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ Erreur récupération agents autorisés:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des agents autorisés'
    });
  }
};

// Récupérer les agents non autorisés
export const getUnauthorizedAgents = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const agents = await getUnauthorizedAgentsFromDB(limit, offset);  // ← Utilisation du nom renommé

    res.json({
      success: true,
      data: agents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ Erreur récupération agents non autorisés:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des agents non autorisés'
    });
  }
};

// Vérifier le statut d'autorisation d'un agent
export const getAgentAuthorizationStatus = async (req, res) => {
  try {
    const { agent_id } = req.params;

    const agent = await getAgentById(agent_id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        agent_id: agent.id,
        agent_name: agent.name,
        agent_email: agent.email,
        can_validate: agent.can_validate || false,
        validated_at: agent.validated_at || null,
        validated_by: agent.validated_by || null
      }
    });
  } catch (error) {
    console.error('❌ Erreur vérification statut:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la vérification du statut'
    });
  }
};