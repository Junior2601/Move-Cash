import { Router } from 'express';
import { verifyAdminToken, verifySemiAdminToken } from '../middlewares/auth.middleware.js';
import {
  loginSemiAdmin,
  getSemiAdminProfile,
  registerSemiAdmin,
  getAllSemiAdminsController,  // ← Correction du nom ici
  getSemiAdmin,
  updateSemiAdmin,
  deactivateSemiAdminAccount,
  activateSemiAdminAccount,
  deleteSemiAdminAccount,
  getTransactionsForSemiAdmin,
  validateTransactionBySemiAdmin,
  cancelTransactionBySemiAdmin,
  getTransactionStatsForSemiAdmin
} from '../controllers/semi_admin.controller.js';

const router = Router();

// Routes publiques
router.post('/login', loginSemiAdmin);

// Routes protégées pour semi-admin (profil)
router.get('/profile', verifySemiAdminToken, getSemiAdminProfile);

// Routes pour la gestion des transactions (semi-admin)
router.get('/transactions', verifySemiAdminToken, getTransactionsForSemiAdmin);
router.put('/transactions/:transaction_id/validate', verifySemiAdminToken, validateTransactionBySemiAdmin);
router.put('/transactions/:transaction_id/cancel', verifySemiAdminToken, cancelTransactionBySemiAdmin);
router.get('/transactions/stats', verifySemiAdminToken, getTransactionStatsForSemiAdmin);

// Routes administrateur pour gérer les semi-admins
router.post('/', verifyAdminToken, registerSemiAdmin);
router.get('/', verifyAdminToken, getAllSemiAdminsController);  // ← Correction ici aussi
router.get('/:id', verifyAdminToken, getSemiAdmin);
router.put('/:id', verifyAdminToken, updateSemiAdmin);
router.put('/:id/deactivate', verifyAdminToken, deactivateSemiAdminAccount);
router.put('/:id/activate', verifyAdminToken, activateSemiAdminAccount);
router.delete('/:id', verifyAdminToken, deleteSemiAdminAccount);

export default router;