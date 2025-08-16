import { Router } from 'express';
import { registerAdmin, loginAdmin } from '../controllers/admin.controller.js';
import { body } from 'express-validator';

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

export default router;
