import express from 'express';
import { getAllGains, getGainsByAgent, addGain, removeGain } from '../controllers/gain.controller.js';
import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

//  Admin : voir tous les gains
router.get('/', verifyAdminToken, getAllGains);

//  Agent : voir ses gains
router.get('/agent/:agent_id', verifyAgentToken, getGainsByAgent);

//  Admin : ajouter un gain
// router.post('/', verifyAdminToken, addGain);

//  Admin : supprimer un gain
// router.delete('/:id', verifyAdminToken, removeGain);

export default router;
