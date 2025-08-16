import express from 'express';
import {
  getBalancesByAgent,
  getBalance,
  addBalance,
  creditAgentBalance,
  debitAgentBalance
} from '../controllers/balance.controller.js';
import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Agent : voir ses propres balances
router.get('/agent/:agent_id', verifyAgentToken, getBalancesByAgent);

// Admin : voir la balance d'un agent dans une devise spécifique
router.get('/:agent_id/:currency_id', verifyAdminToken, getBalance);

// Admin : créer une balance pour un agent
router.post('/', verifyAdminToken, addBalance);

// Admin : créditer / débiter un compte
router.post('/credit', verifyAdminToken, creditAgentBalance);
router.post('/debit', verifyAdminToken, debitAgentBalance);

export default router;
