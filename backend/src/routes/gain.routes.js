import express from 'express';
import { 
  getAllGains, 
  getGainsByAgent, 
  getGainsByAgentGroupedByCurrency,
  getGainsByAgentWithCurrencyDetails,
  getMonthlyGainsByAgentAndCurrency,
  getCurrentMonthGainsSummary,
  getLast12MonthsGains,
  getCurrentMonthTotal
} from '../controllers/gain.controller.js';
import { verifyAdminToken, verifyAdminOrAgentToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Admin : voir tous les gains
router.get('/', verifyAdminToken, getAllGains);

// Routes accessibles aux admins ET aux agents
router.get('/agent/:agent_id', verifyAdminOrAgentToken, getGainsByAgent);
router.get('/agent/:agent_id/currency', verifyAdminOrAgentToken, getGainsByAgentGroupedByCurrency);
router.get('/agent/:agent_id/monthly', verifyAdminOrAgentToken, getMonthlyGainsByAgentAndCurrency);
router.get('/agent/:agent_id/currency/details', verifyAdminOrAgentToken, getGainsByAgentWithCurrencyDetails);
router.get('/agent/:agent_id/currency/:currency_id/current-month-total', verifyAdminOrAgentToken, getCurrentMonthTotal);

// Routes admin pour les résumés globaux
router.get('/summary/current-month', verifyAdminToken, getCurrentMonthGainsSummary);
router.get('/history/last-12-months', verifyAdminToken, getLast12MonthsGains);

export default router;