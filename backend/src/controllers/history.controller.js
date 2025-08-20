import {
  getHistory,
  getHistoryById,
  createHistoryManual,
} from '../models/history.repository.js';

// Admin: liste avec filtres/pagination
export const adminListHistory = async (req, res) => {
  try {
    const data = await getHistory({
      action_type: req.query.action_type,
      actor_type:  req.query.actor_type,
      actor_id:    req.query.actor_id ? Number(req.query.actor_id) : undefined,
      entity_type: req.query.entity_type,
      entity_id:   req.query.entity_id ? Number(req.query.entity_id) : undefined,
      date_from:   req.query.date_from,
      date_to:     req.query.date_to,
      limit:       req.query.limit,
      offset:      req.query.offset,
    });
    res.json({ items: data });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Admin: détail d'un log
export const adminGetHistoryById = async (req, res) => {
  try {
    const row = await getHistoryById(Number(req.params.id));
    if (!row) return res.status(404).json({ message: 'Entrée introuvable' });
    res.json(row);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Admin: création manuelle d'une entrée (pour tests/annotations)
export const adminCreateHistory = async (req, res) => {
  try {
    const row = await createHistoryManual(req.body);
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Agent: voir SON historique (actor_id = agent connecté)
export const agentMyHistory = async (req, res) => {
  try {
    const data = await getHistory({
      actor_type: 'agent',
      actor_id: req.user.id,
      limit: req.query.limit,
      offset: req.query.offset,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
    });
    res.json({ items: data });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
