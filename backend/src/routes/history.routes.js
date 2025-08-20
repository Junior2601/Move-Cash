import express from 'express';
import {
  adminListHistory,
  adminGetHistoryById,
  adminCreateHistory,
  agentMyHistory,
} from '../controllers/history.controller.js';
import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ⚠️ Important: placer /me AVANT /:id
router.get('/me', verifyAgentToken, agentMyHistory);

// Admin-only
router.get('/', verifyAdminToken, adminListHistory);
router.get('/:id', verifyAdminToken, adminGetHistoryById);
router.post('/', verifyAdminToken, adminCreateHistory);

export default router;
