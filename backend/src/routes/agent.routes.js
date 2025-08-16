import { Router } from 'express';
import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';
import * as agentController from '../controllers/agent.controller.js';

const router = Router();

// Création d'un agent (réservée aux admins)
router.post('/', verifyAdminToken, agentController.registerAgent);

// Connexion d'un agent
router.post('/login', agentController.loginAgent);

// Profil d'un agent connecté (test token)
router.get('/profile', verifyAgentToken, (req, res) => {
  res.json({
    message: 'Profil de l’agent',
    user: req.user
  });
});

export default router;
