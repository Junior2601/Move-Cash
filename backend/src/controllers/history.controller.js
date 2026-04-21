import {
  getHistory,
  getHistoryById,
  createHistoryManual,
  countHistory,
} from '../models/history.repository.js';

// Admin: liste avec filtres/pagination
export const adminListHistory = async (req, res) => {
  try {
    // Validation des paramètres de pagination
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    
    // Récupération des données avec les filtres
    const data = await getHistory({
      action_type: req.query.action_type,
      actor_type: req.query.actor_type,
      actor_id: req.query.actor_id ? Number(req.query.actor_id) : undefined,
      entity_type: req.query.entity_type,
      entity_id: req.query.entity_id ? Number(req.query.entity_id) : undefined,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit,
      offset,
    });
    
    // Comptage total pour la pagination (optionnel mais recommandé)
    let total = null;
    if (req.query.include_total === 'true') {
      total = await countHistory({
        action_type: req.query.action_type,
        actor_type: req.query.actor_type,
        actor_id: req.query.actor_id ? Number(req.query.actor_id) : undefined,
        entity_type: req.query.entity_type,
        entity_id: req.query.entity_id ? Number(req.query.entity_id) : undefined,
        date_from: req.query.date_from,
        date_to: req.query.date_to,
      });
    }
    
    const response = {
      items: data,
      pagination: {
        limit,
        offset,
      },
    };
    
    if (total !== null) {
      response.pagination.total = total;
      response.pagination.hasMore = offset + data.length < total;
    }
    
    res.json(response);
  } catch (err) {
    console.error('Erreur dans adminListHistory:', err);
    res.status(400).json({ 
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Admin: détail d'un log
export const adminGetHistoryById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    
    const row = await getHistoryById(id);
    
    if (!row) {
      return res.status(404).json({ message: 'Entrée introuvable' });
    }
    
    res.json(row);
  } catch (err) {
    console.error('Erreur dans adminGetHistoryById:', err);
    res.status(400).json({ 
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Admin: création manuelle d'une entrée (pour tests/annotations)
export const adminCreateHistory = async (req, res) => {
  try {
    // Validation basique
    if (!req.body.action_type || !req.body.actor_type) {
      return res.status(400).json({ 
        message: 'action_type et actor_type sont requis' 
      });
    }
    
    // Ajout automatique de l'admin connecté comme acteur si non spécifié
    const payload = {
      ...req.body,
      actor_type: req.body.actor_type || 'admin',
      actor_id: req.body.actor_id || req.user?.id || null,
    };
    
    const row = await createHistoryManual(payload);
    res.status(201).json(row);
  } catch (err) {
    console.error('Erreur dans adminCreateHistory:', err);
    res.status(400).json({ 
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Agent: voir SON historique (actor_id = agent connecté)
export const agentMyHistory = async (req, res) => {
  try {
    const agentId = req.user.id;
    
    if (!agentId) {
      return res.status(401).json({ message: 'Agent non authentifié' });
    }
    
    // Validation des paramètres de pagination
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    
    const data = await getHistory({
      actor_type: 'agent',
      actor_id: agentId,
      limit,
      offset,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      action_type: req.query.action_type, // Permet à l'agent de filtrer par type d'action
    });
    
    res.json({ 
      items: data,
      pagination: {
        limit,
        offset,
      }
    });
  } catch (err) {
    console.error('Erreur dans agentMyHistory:', err);
    res.status(400).json({ 
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Agent: voir l'historique d'une transaction spécifique (si autorisé)
export const agentTransactionHistory = async (req, res) => {
  try {
    const transactionId = Number(req.params.transactionId);
    const agentId = req.user.id;
    
    if (isNaN(transactionId) || transactionId <= 0) {
      return res.status(400).json({ message: 'ID de transaction invalide' });
    }
    
    // Vérifier que l'agent est autorisé à voir cette transaction
    // (à implémenter selon votre logique métier)
    
    const data = await getHistory({
      entity_type: 'transaction',
      entity_id: transactionId,
      limit: 100,
      offset: 0,
    });
    
    res.json({ items: data });
  } catch (err) {
    console.error('Erreur dans agentTransactionHistory:', err);
    res.status(400).json({ 
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};