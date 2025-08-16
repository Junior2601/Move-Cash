import express from 'express';
import {
  getActivePaymentMethodsByCountry,
  getAllPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod
} from '../controllers/paymentMethod.controller.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Routes publiques
router.get('/country/:country_id', getActivePaymentMethodsByCountry);

// Routes admin
router.get('/', verifyAdminToken, getAllPaymentMethods);
router.post('/', verifyAdminToken, addPaymentMethod);
router.put('/:id', verifyAdminToken, updatePaymentMethod);
router.delete('/:id', verifyAdminToken, deletePaymentMethod);

export default router;
