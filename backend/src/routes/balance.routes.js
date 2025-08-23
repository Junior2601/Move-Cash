import express from 'express';
import {
  getAgentBalances,
  getAgentBalanceByCurrency,
  createAgentBalance,
  creditAgentBalance,
  debitAgentBalance,
  transferBetweenBalances,
  checkBalance,
  getMyBalances
} from '../controllers/balance.controller.js';
import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Agent : voir ses propres balances
router.get('/my-balance/:agent_id', verifyAgentToken, getMyBalances);

// Admin : voir la balance d'un agent dans une devise spécifique
router.get('/:agent_id/currency/:currency_id', verifyAdminToken, getAgentBalanceByCurrency);
router.get('/agent/:agent_id', verifyAdminToken, getAgentBalances);

// Admin : créer une balance pour un agent
router.post('/create', verifyAdminToken, createAgentBalance);

// Admin : créditer / débiter un compte
router.post('/credit', verifyAdminToken, creditAgentBalance);
router.post('/debit', verifyAdminToken, debitAgentBalance);

export default router;
