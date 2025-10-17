// src/routes/transaction.routes.js
import express from 'express';
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
  getAgentDashboardController,
  getAgentRedirectedTransactionsController
} from '../controllers/transaction.controller.js';

import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ============= PUBLIC ROUTES =============
router.post('/', createTransactionController);
router.post('/:id/client-validate', clientValidateTransactionController);
router.get('/:transaction_id', getTransactionByIdController);
router.get('/tracking/:tracking_code', getTransactionByTrackingCodeController);

// ============= AGENT PERSONAL ROUTES =============
router.get('/agent/dashboard', verifyAgentToken, getAgentDashboardController);
router.get('/agent/stats', verifyAgentToken, getAgentPersonalStatsController);
router.get('/agent/gains/history', verifyAgentToken, getAgentGainsHistoryController);
router.get('/agent/transactions', verifyAgentToken, getAgentTransactionsController);
router.put('/:transaction_id/validate-agent', verifyAgentToken, validateTransactionController);
router.put('/:transaction_id/cancel-agent', verifyAgentToken, cancelTransactionController);
router.post('/redirect', verifyAgentToken, redirectTransactionController);
router.put('/redirections/:redirection_id/accept', verifyAgentToken, acceptRedirectionController);
router.put('/redirections/:redirection_id/reject', verifyAgentToken, rejectRedirectionController);
router.get('/agent/redirected-transactions', verifyAgentToken, getAgentRedirectedTransactionsController);

// ============= ADMIN ROUTES =============
router.get('/admin/all-transactions', verifyAdminToken, getAllTransactionsController);
router.get('/admin/stats', verifyAdminToken, getTransactionStatsController);
router.put('/:transaction_id/validate', verifyAdminToken, validateTransactionController);
router.put('/:transaction_id/cancel', verifyAdminToken, cancelTransactionController);
router.get('/admin/agent/:agent_id/transactions', verifyAdminToken, getAgentTransactionsController);

export default router;