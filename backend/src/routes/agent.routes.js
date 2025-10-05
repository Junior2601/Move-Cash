import { Router } from 'express';
import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';
import {
  loginAgent,
  getProfile,
  updateProfile,
  changePassword,
  registerAgent,
  getAgents,
  getAgent,
  updateAgentProfile,
  changeAgentPassword,
  deactivateAgentAccount,
  activateAgentAccount,
  deleteAgentAccount,
  getAgentsByCountryIdController,      // Noms changés ici
  getAgentsByCountryCodeController
} from '../controllers/agent.controller.js';

const router = Router();

// Routes publiques
router.post('/login', loginAgent);

// Routes protégées pour les agents
router.get('/profile', verifyAgentToken, getProfile);
router.put('/profile', verifyAgentToken, updateProfile);
router.put('/change-password', verifyAgentToken, changePassword);

// Routes administrateur
router.post('/', verifyAdminToken, registerAgent);
router.get('/', verifyAdminToken, getAgents);
router.get('/:id', verifyAdminToken, getAgent);
router.put('/:id', verifyAdminToken, updateAgentProfile);
router.put('/:id/password', verifyAdminToken, changeAgentPassword);
router.put('/:id/deactivate', verifyAdminToken, deactivateAgentAccount);
router.put('/:id/activate', verifyAdminToken, activateAgentAccount);
router.delete('/:id', verifyAdminToken, deleteAgentAccount);
router.get('/country/:country_id', verifyAdminToken, getAgentsByCountryIdController);
router.get('/country/code/:country_code', verifyAdminToken, getAgentsByCountryCodeController);

export default router;