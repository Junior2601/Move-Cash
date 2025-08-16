import express from 'express';
import {
  getAuthorizedNumbersByAgent,
  getAllAuthorizedNumbers,
  addAuthorizedNumber,
  updateAuthorizedNumber,
  deleteAuthorizedNumber
} from '../controllers/authorizedNumber.controller.js';
import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Agent : voir ses propres numéros
router.get('/agent/:agent_id', verifyAgentToken, getAuthorizedNumbersByAgent);

// Admin : voir tous les numéros
router.get('/', verifyAdminToken, getAllAuthorizedNumbers);

// Admin : ajouter / modifier / supprimer un numéro autorisé
router.post('/', verifyAdminToken, addAuthorizedNumber);
router.put('/:id', verifyAdminToken, updateAuthorizedNumber);
router.delete('/:id', verifyAdminToken, deleteAuthorizedNumber);

export default router;
