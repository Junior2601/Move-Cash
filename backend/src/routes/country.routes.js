import express from 'express';
import {
  getActiveCountries,
  getAllCountries,
  getCountriesStats,
  addCountry,
  updateCountry,
  deleteCountry
} from '../controllers/country.controller.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

//  Routes publiques
router.get('/active', getActiveCountries);

//  Routes réservées à l'admin
router.get('/', verifyAdminToken, getAllCountries);
router.get('/stats', verifyAdminToken, getCountriesStats); // Nouvelle route pour les statistiques
router.post('/', verifyAdminToken, addCountry);
router.put('/:id', verifyAdminToken, updateCountry);
router.delete('/:id', verifyAdminToken, deleteCountry);

export default router;