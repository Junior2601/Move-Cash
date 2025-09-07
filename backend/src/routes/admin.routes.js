import { Router } from 'express';
import { registerAdmin, loginAdmin, getAdminProfile  } from '../controllers/admin.controller.js';
import { body } from 'express-validator';
import { verifyAdminToken } from '../middlewares/auth.middleware.js'; 
const router = Router();

// Route inscription admin
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 6 }).withMessage('Mot de passe trop court'),
    body('name').notEmpty().withMessage('Nom requis')
  ],
  registerAdmin
);

// Route connexion admin
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis')
  ],
  loginAdmin
);

router.get('/profile', verifyAdminToken, getAdminProfile);

export default router;
