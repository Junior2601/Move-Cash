import express from 'express';
import {
  getActiveRates,
  getAllRates,
  addRate,
  updateRate,
  deleteRate,
  getRateByCurrencies
} from '../controllers/rate.controller.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Route publique
router.get('/active', getActiveRates);

// Route pour obtenir un taux spécifique
router.get('/pair/:from_currency_id/:to_currency_id', getRateByCurrencies);

// Routes admin
router.get('/', verifyAdminToken, getAllRates);
router.post('/', verifyAdminToken, addRate);
router.put('/:id', verifyAdminToken, updateRate);
router.delete('/:id', verifyAdminToken, deleteRate);

export default router;