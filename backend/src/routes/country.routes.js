import express from 'express';
import {
  getActiveCountries,
  getAllCountries,
  getCountriesStats,
  addCountry,
  updateCountry,
  activateCountry,
  deactivateCountry,
  toggleCountryStatus,
  deleteCountry,
  getDeletedCountries,
  restoreCountry
} from '../controllers/country.controller.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Routes publiques
router.get('/active', getActiveCountries);

// Routes admin
router.get('/', verifyAdminToken, getAllCountries);
router.get('/stats', verifyAdminToken, getCountriesStats);
router.get('/deleted', verifyAdminToken, getDeletedCountries); // Nouvelle route

router.post('/', verifyAdminToken, addCountry);
router.put('/:id', verifyAdminToken, updateCountry);

// Routes spécifiques pour la gestion d'activation/désactivation
router.patch('/:id/activate', verifyAdminToken, activateCountry);
router.patch('/:id/deactivate', verifyAdminToken, deactivateCountry);
router.patch('/:id/toggle-status', verifyAdminToken, toggleCountryStatus);
router.patch('/:id/restore', verifyAdminToken, restoreCountry); // Restauration

router.delete('/:id', verifyAdminToken, deleteCountry);

export default router;