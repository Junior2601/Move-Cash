import express from 'express';
import { 
  getAllGains, 
  getGainsByAgent, 
  addGain, 
  removeGain,
  getGainsByAgentGroupedByCurrency,
  getGainsByAgentWithCurrencyDetails
} from '../controllers/gain.controller.js';
import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

//  Admin : voir tous les gains
router.get('/', verifyAdminToken, getAllGains);

//  Agent : voir ses gains
router.get('/agent/:agent_id', verifyAgentToken, getGainsByAgent);

//  Agent : voir ses gains groupés par devise (version simplifiée)
router.get('/agent/:agent_id/currency', verifyAgentToken, getGainsByAgentGroupedByCurrency);

//  Agent : voir ses gains groupés par devise avec détails
router.get('/agent/:agent_id/currency/details', verifyAgentToken, getGainsByAgentWithCurrencyDetails);

//  Admin : ajouter un gain
// router.post('/', verifyAdminToken, addGain);

//  Admin : supprimer un gain
// router.delete('/:id', verifyAdminToken, removeGain);

export default router;