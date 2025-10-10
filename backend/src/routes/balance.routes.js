import express from 'express';
import {
  getAllBalances,
  getAgentBalances,
  getAgentBalanceByCurrency,
  createAgentBalance,
  creditAgentBalance,
  debitAgentBalance,
  transferBetweenBalances,
  checkBalance,
  getMyBalances,
  deleteBalance
} from '../controllers/balance.controller.js';
import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// =========================
// ROUTES ADMIN
// =========================

// Récupérer toutes les balances (admin seulement)
router.get('/', verifyAdminToken, getAllBalances);

// Voir la balance d'un agent dans une devise spécifique
router.get('/:agent_id/currency/:currency_id', verifyAdminToken, getAgentBalanceByCurrency);

// Voir toutes les balances d'un agent
router.get('/agent/:agent_id', verifyAdminToken, getAgentBalances);

// Créer une balance pour un agent
router.post('/create', verifyAdminToken, createAgentBalance);

// Créditer un compte
router.post('/credit', verifyAdminToken, creditAgentBalance);

// Débiter un compte
router.post('/debit', verifyAdminToken, debitAgentBalance);

// Supprimer une balance
router.delete('/:id', verifyAdminToken, deleteBalance);

// Transférer entre balances
router.post('/transfer', verifyAdminToken, transferBetweenBalances);

// Vérifier le solde
router.post('/check', verifyAdminToken, checkBalance);

// =========================
// ROUTES AGENT
// =========================

// Agent : voir ses propres balances
router.get('/my-balance/:agent_id', verifyAgentToken, getMyBalances);

export default router;