import express from 'express';
import {
  getAuthorizedNumbersByAgent,
  getAllAuthorizedNumbers,
  addAuthorizedNumber,
  updateAuthorizedNumber,
  deleteAuthorizedNumber,
  getAuthorizedNumberPublic,           
  getAllActiveAuthorizedNumbers      
} from '../controllers/authorizedNumber.controller.js';
import { verifyAdminToken, verifyAgentToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Routes publiques (sans authentification)
router.get('/public', getAllActiveAuthorizedNumbers);           // Tous les numéros actifs
router.get('/public/:id', getAuthorizedNumberPublic);           // Un numéro spécifique

// Agent : voir ses propres numéros
router.get('/agent/:agent_id', verifyAgentToken, getAuthorizedNumbersByAgent);

// Admin : voir tous les numéros
router.get('/', verifyAdminToken, getAllAuthorizedNumbers);

// Admin : ajouter / modifier / supprimer un numéro autorisé
router.post('/', verifyAdminToken, addAuthorizedNumber);
router.put('/:id', verifyAdminToken, updateAuthorizedNumber);
router.delete('/:id', verifyAdminToken, deleteAuthorizedNumber);

export default router;