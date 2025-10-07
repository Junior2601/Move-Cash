import express from 'express';
import {
  getActiveCountries,
  getAllCountries,
  getCountriesStats,
  addCountry,
  updateCountry,
  deleteCountry,
  toggleCountryStatus
} from '../controllers/country.controller.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Middleware de logging pour toutes les routes
router.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
});

// Routes publiques
router.get('/active', getActiveCountries);

// Routes réservées à l'admin
router.get('/', verifyAdminToken, getAllCountries);
router.get('/stats', verifyAdminToken, getCountriesStats);
router.post('/', verifyAdminToken, addCountry);
router.put('/:id', verifyAdminToken, updateCountry);
router.patch('/:id/toggle-status', verifyAdminToken, toggleCountryStatus);
router.delete('/:id', verifyAdminToken, deleteCountry);

export default router;