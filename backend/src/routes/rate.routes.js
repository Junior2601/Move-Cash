import express from 'express';
import {
  getActiveRates,
  getAllRates,
  addRate,
  updateRate,
  deleteRate
} from '../controllers/rate.controller.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

//  Routes publiques
router.get('/active', getActiveRates);

//  Routes admin
router.get('/', verifyAdminToken, getAllRates);
router.post('/', verifyAdminToken, addRate);
router.put('/:id', verifyAdminToken, updateRate);
router.delete('/:id', verifyAdminToken, deleteRate);

export default router;
