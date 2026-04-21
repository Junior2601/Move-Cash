import { Router } from 'express';
import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';
import {
  loginAgent,
  getProfile,
  updateProfile,
  changePassword,
  registerAgent,
  getAgents,
  getAgentsListForAgents,
  getAgent,
  updateAgentProfile,
  validateAgent,
  changeAgentPassword,
  deactivateAgentAccount,
  activateAgentAccount,
  deleteAgentAccount,
  getAgentsByCountryIdController,
  getAgentsByCountryCodeController,
  getAgentsListForRedirection,
  getAgentsStatistics
} from '../controllers/agent.controller.js';

const router = Router();

// ============= ROUTES PUBLIQUES =============
// POST /api/agent/login - Connexion d'un agent
router.post('/login', loginAgent);

// ============= ROUTES PROTÉGÉES POUR LES AGENTS =============
// GET /api/agent/profile - Récupérer le profil de l'agent connecté
router.get('/profile', verifyAgentToken, getProfile);

// PUT /api/agent/profile - Mettre à jour le profil de l'agent connecté
router.put('/profile', verifyAgentToken, updateProfile);

// PUT /api/agent/change-password - Changer le mot de passe de l'agent connecté
router.put('/change-password', verifyAgentToken, changePassword);

// GET /api/agent/list - Récupérer la liste des agents (version limitée)
router.get('/list', verifyAgentToken, getAgentsListForAgents);

// GET /api/agent/agents/list-for-redirection - Récupérer la liste des agents pour redirection
router.get('/agents/list-for-redirection', verifyAgentToken, getAgentsListForRedirection);

// ============= ROUTES ADMINISTRATEUR =============
// POST /api/agent - Créer un nouvel agent
router.post('/', verifyAdminToken, registerAgent);

// GET /api/agent - Récupérer tous les agents (version complète)
router.get('/', verifyAdminToken, getAgents);

// GET /api/agent/statistics - Récupérer les statistiques des agents
router.get('/statistics', verifyAdminToken, getAgentsStatistics);

// GET /api/agent/country/:country_id - Récupérer les agents par ID de pays
router.get('/country/:country_id', verifyAdminToken, getAgentsByCountryIdController);

// GET /api/agent/country/code/:country_code - Récupérer les agents par code de pays
router.get('/country/code/:country_code', verifyAdminToken, getAgentsByCountryCodeController);

// GET /api/agent/:id - Récupérer un agent par son ID
router.get('/:id', verifyAdminToken, getAgent);

// PUT /api/agent/:id - Mettre à jour un agent
router.put('/:id', verifyAdminToken, updateAgentProfile);

// PUT /api/agent/:id/validate - Valider ou dévalider un agent
router.put('/:id/validate', verifyAdminToken, validateAgent);

// PUT /api/agent/:id/password - Changer le mot de passe d'un agent
router.put('/:id/password', verifyAdminToken, changeAgentPassword);

// PUT /api/agent/:id/deactivate - Désactiver un agent
router.put('/:id/deactivate', verifyAdminToken, deactivateAgentAccount);

// PUT /api/agent/:id/activate - Activer un agent
router.put('/:id/activate', verifyAdminToken, activateAgentAccount);

// DELETE /api/agent/:id - Supprimer définitivement un agent
router.delete('/:id', verifyAdminToken, deleteAgentAccount);

export default router;