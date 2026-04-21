import express from 'express';
import {
  getActiveCurrencies,
  getAllCurrencies,
  addCurrency,
  updateCurrency,
  deleteCurrency,
  deactivateCurrency,
  activateCurrency,
  toggleCurrencyStatus
} from '../controllers/currency.controller.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Routes publiques
router.get('/active', getActiveCurrencies);

// Routes réservées à l'admin
router.get('/', verifyAdminToken, getAllCurrencies);
router.post('/', verifyAdminToken, addCurrency);
router.put('/:id', verifyAdminToken, updateCurrency);

// Routes spécifiques pour la gestion d'activation/désactivation
router.patch('/:id/deactivate', verifyAdminToken, deactivateCurrency);
router.patch('/:id/activate', verifyAdminToken, activateCurrency);
router.patch('/:id/toggle', verifyAdminToken, toggleCurrencyStatus);

// Suppression définitive
router.delete('/:id', verifyAdminToken, deleteCurrency);

export default router;