import express from 'express';
import { pool } from '../config/db.js';
import {
  createTransactionController,
  clientValidateTransactionController,
  validateTransactionController,
  cancelTransactionController,
  getTransactionByIdController,
  getTransactionByTrackingCodeController,
  redirectTransactionController,
  acceptRedirectionController,
  rejectRedirectionController,
  getAllTransactionsController,
  getAgentTransactionsController,
  getTransactionStatsController,
  getAgentPersonalStatsController,
  getAgentGainsHistoryController,
  getAgentDashboardController
} from '../controllers/transaction.controller.js';

import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';
import { debugDatabase } from '../middlewares/debug.middleware.js';

const router = express.Router();

// ============= PUBLIC ROUTES =============

// Créer une transaction (Client)
router.post('/', createTransactionController);

// Validation par le client
router.post('/:id/client-validate', clientValidateTransactionController);

// Suivi de transaction (par ID ou tracking code) - Public
router.get('/:transaction_id', getTransactionByIdController);
router.get('/tracking/:tracking_code', getTransactionByTrackingCodeController);

// ============= AGENT PERSONAL ROUTES =============

// Dashboard agent (statistiques personnelles complètes)
router.get('/agent/dashboard', verifyAgentToken, getAgentDashboardController);

// Statistiques personnelles de l'agent
router.get('/agent/stats', verifyAgentToken, getAgentPersonalStatsController);

// Historique des gains de l'agent
router.get('/agent/gains/history', verifyAgentToken, getAgentGainsHistoryController);

// Transactions de l'agent (ses propres transactions)
router.get('/agent/transactions', verifyAgentToken, (req, res) => {
  // Rediriger vers la fonction existante avec l'ID de l'agent connecté
  req.params.agent_id = req.user.id;
  return getAgentTransactionsController(req, res);
});

// Valider une transaction (Agent)
router.put('/:transaction_id/validate-agent', verifyAgentToken, validateTransactionController);

// Annuler une transaction (Agent)
router.put('/:transaction_id/cancel-agent', verifyAgentToken, cancelTransactionController);

// Rediriger une transaction (Agent)
router.post('/redirect', verifyAgentToken, redirectTransactionController);

// Accepter une redirection (Agent)
router.put('/redirections/:redirection_id/accept', verifyAgentToken, acceptRedirectionController);

// Rejeter une redirection (Agent)
router.put('/redirections/:redirection_id/reject', verifyAgentToken, rejectRedirectionController);

// ============= ADMIN ROUTES =============

// Voir toutes les transactions (Admin)
router.get('/admin/all-transactions', debugDatabase, verifyAdminToken, getAllTransactionsController);

// Statistiques globales (Admin)
router.get('/admin/stats', verifyAdminToken, getTransactionStatsController);

// Valider une transaction (Admin)
router.put('/:transaction_id/validate', verifyAdminToken, validateTransactionController);

// Annuler une transaction (Admin)
router.put('/:transaction_id/cancel', verifyAdminToken, cancelTransactionController);

// Transactions d'un agent spécifique (Admin)
router.get('/admin/agent/:agent_id/transactions', verifyAdminToken, getAgentTransactionsController);

export default router;