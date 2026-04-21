import express from 'express';
import {
  adminListHistory,
  adminGetHistoryById,
  adminCreateHistory,
  agentMyHistory,
  agentTransactionHistory,
} from '../controllers/history.controller.js';
import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// =====================================================
// ROUTES AGENT
// =====================================================

// IMPORTANT: Routes spécifiques AVANT les routes avec paramètres dynamiques
// Agent: voir son propre historique
router.get('/me', verifyAgentToken, agentMyHistory);

// Agent: voir l'historique d'une transaction spécifique
router.get('/me/transaction/:transactionId', verifyAgentToken, agentTransactionHistory);

// =====================================================
// ROUTES ADMIN
// =====================================================

// Admin: liste avec filtres et pagination
router.get('/', verifyAdminToken, adminListHistory);

// Admin: créer une entrée manuelle
router.post('/', verifyAdminToken, adminCreateHistory);

// Admin: voir une entrée spécifique
// DOIT ÊTRE EN DERNIER car /:id capture tout
router.get('/:id', verifyAdminToken, adminGetHistoryById);

export default router;