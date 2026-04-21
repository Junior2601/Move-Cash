import express from 'express';
import {
  getActivePaymentMethodsByCountry,
  getPaymentMethodsByCountryWithDetails,
  getAllPaymentMethods,
  getPaymentMethodById,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  togglePaymentMethodStatusCtrl,
  getStats,
  getHistory,
  batchUpdateStatus
} from '../controllers/paymentMethod.controller.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ============ ROUTES PUBLIQUES ============
router.get('/country/:country_id', getActivePaymentMethodsByCountry);
router.get('/public/country/:country_id/details', getPaymentMethodsByCountryWithDetails);

// ============ ROUTES ADMIN ============
// Routes principales
router.get('/', verifyAdminToken, getAllPaymentMethods);
router.get('/:id', verifyAdminToken, getPaymentMethodById);
router.post('/', verifyAdminToken, addPaymentMethod);
router.put('/:id', verifyAdminToken, updatePaymentMethod);
router.delete('/:id', verifyAdminToken, deletePaymentMethod);

// Routes spécifiques pour l'activation/désactivation
router.patch('/:id/toggle-status', verifyAdminToken, togglePaymentMethodStatusCtrl);
router.patch('/batch/toggle-status', verifyAdminToken, batchUpdateStatus);

// Routes statistiques et historiques
router.get('/stats/overview', verifyAdminToken, getStats);
router.get('/:id/history', verifyAdminToken, getHistory);

export default router;