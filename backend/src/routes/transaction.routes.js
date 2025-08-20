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
} from '../controllers/transaction.controller.js';

import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ============= PUBLIC =============
// Créer une transaction
router.post('/', createTransactionController);

// Suivi (par ID ou tracking code)
router.get('/:id', getTransactionByIdController);
router.get('/tracking/:code', getTransactionByTrackingCodeController);

// ============= ADMIN / AGENT =============
// Valider transaction
router.put('/:id/validate', verifyAdminToken, validateTransactionController);
router.put('/:id/validate-agent', verifyAgentToken, validateTransactionController);

// Annuler transaction
router.put('/:id/cancel', verifyAdminToken, cancelTransactionController);
router.put('/:id/cancel-agent', verifyAgentToken, cancelTransactionController);

// Un agent initie une redirection
router.post('/:id/redirect', verifyAgentToken, redirectTransactionController);

// L’agent destinataire accepte la redirection
router.put('/redirections/:id/accept', verifyAgentToken, acceptRedirectionController);

// L’agent destinataire rejette la redirection
router.put('/redirections/:id/reject', verifyAgentToken, rejectRedirectionController);

export default router;
