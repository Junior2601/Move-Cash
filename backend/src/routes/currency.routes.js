import express from 'express';
import {
  getActiveCurrencies,
  getAllCurrencies,
  addCurrency,
  updateCurrency,
  deleteCurrency
} from '../controllers/currency.controller.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Routes publiques
router.get('/active', getActiveCurrencies);

// Routes réservées à l'admin
router.get('/', verifyAdminToken, getAllCurrencies);
router.post('/', verifyAdminToken, addCurrency);
router.put('/:id', verifyAdminToken, updateCurrency);
router.delete('/:id', verifyAdminToken, deleteCurrency);

export default router;