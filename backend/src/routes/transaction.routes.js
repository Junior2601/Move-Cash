import express from 'express';
import {
  createTransactionController,
  validateTransactionController,
  cancelTransactionController,
  getTransactionByIdController,
  getTransactionByTrackingCodeController,
  redirectTransactionController,
  acceptRedirectionController,
  rejectRedirectionController,
  getAllTransactionsController,
  getTransactionStatsController
} from '../controllers/transaction.controller.js';

import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ============= PUBLIC =============
// Créer une transaction
router.post('/', createTransactionController);

// Suivi (par ID ou tracking code)
router.get('/:transaction_id', getTransactionByIdController);
router.get('/tracking/:tracking_code', getTransactionByTrackingCodeController);

// ============= ADMIN / AGENT =============

// Voir toutes les transactions (admin)
router.get('/All-transactions', verifyAdminToken, getAllTransactionsController);

// Voir les transactions par status
router.get('/transactions/stats', verifyAdminToken, getTransactionStatsController);

// Valider transaction
router.put('/:transaction_id/validate', verifyAdminToken, validateTransactionController);
router.put('/:transaction_id/validate-agent', verifyAgentToken, validateTransactionController);

// Annuler transaction
router.put('/:transaction_id/cancel', verifyAdminToken, cancelTransactionController);
router.put('/:transaction_id/cancel-agent', verifyAgentToken, cancelTransactionController);

// Un agent initie une redirection
router.post('/:transaction_id/redirect', verifyAgentToken, redirectTransactionController);

// L’agent destinataire accepte la redirection
router.put('/redirections/:redirection_id/accept', verifyAgentToken, acceptRedirectionController);

// L’agent destinataire rejette la redirection
router.put('/redirections/:redirection_id/reject', verifyAgentToken, rejectRedirectionController);

export default router;
