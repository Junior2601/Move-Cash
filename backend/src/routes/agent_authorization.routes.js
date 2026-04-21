import { Router } from 'express';
import { verifyAdminToken, verifyAdminOrSemiAdminToken } from '../middlewares/auth.middleware.js';
import {
  authorizeAgent,
  revokeAgentAuthorization,
  getAuthorizedAgents,
  getUnauthorizedAgents,
  getAgentAuthorizationStatus
} from '../controllers/agent_authorization.controller.js';

const router = Router();

// Routes pour la gestion des autorisations des agents
router.put('/agents/:agent_id/authorize', verifyAdminToken, authorizeAgent);
router.put('/agents/:agent_id/revoke', verifyAdminToken, revokeAgentAuthorization);
router.get('/agents/authorized', verifyAdminOrSemiAdminToken, getAuthorizedAgents);
router.get('/agents/unauthorized', verifyAdminToken, getUnauthorizedAgents);
router.get('/agents/:agent_id/authorization-status', verifyAdminOrSemiAdminToken, getAgentAuthorizationStatus);

export default router;