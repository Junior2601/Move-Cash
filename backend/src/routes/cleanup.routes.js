import express from 'express';
import { cleanupService } from '../services/cleanup.service.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Route pour démarrer le nettoyage
router.post('/cleanup/start', verifyAdminToken, (req, res) => {
  const { interval = 5 } = req.body;
  cleanupService.start(interval);
  res.json({ message: `Service de nettoyage démarré (${interval} min)` });
});

// Route pour arrêter le nettoyage
router.post('/cleanup/stop', verifyAdminToken, (req, res) => {
  cleanupService.stop();
  res.json({ message: 'Service de nettoyage arrêté' });
});

// Route pour exécuter manuellement
router.post('/cleanup/run', verifyAdminToken, async (req, res) => {
  try {
    const result = await cleanupService.runCleanup();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour obtenir le statut
router.get('/cleanup/status', verifyAdminToken, (req, res) => {
  res.json(cleanupService.getStatus());
});

export default router;