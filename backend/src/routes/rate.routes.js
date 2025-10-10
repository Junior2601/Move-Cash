import express from 'express';
import {
  getActiveRates,
  getAllRates,
  addRate,
  updateRate,
  deleteRate,
  getRateByCurrencies,
  getRateByCountries,
  getRate
} from '../controllers/rate.controller.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Routes publiques
router.get('/active', getActiveRates);
router.get('/', getRate); // Endpoint générique
router.get('/pair/:from_currency_id/:to_currency_id', getRateByCurrencies);
router.get('/countries/:from_country_id/:to_country_id', getRateByCountries);

// Routes admin
router.get('/admin/all', verifyAdminToken, getAllRates);
router.post('/', verifyAdminToken, addRate);
router.put('/:id', verifyAdminToken, updateRate);
router.delete('/:id', verifyAdminToken, deleteRate);

export default router;