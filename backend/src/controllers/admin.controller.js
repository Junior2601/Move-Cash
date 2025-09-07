import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { getAdminByEmail, createAdmin, getAdminById } from '../models/admin.repository.js';

dotenv.config();

export const registerAdmin = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existingAdmin = await getAdminByEmail(email);
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await createAdmin({ email, hashedPassword, name });

    res.status(201).json({ message: 'Admin créé avec succès', admin: newAdmin });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await getAdminByEmail(email);

    if (!admin) {
      return res.status(404).json({ message: 'Admin introuvable' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ message: 'Connexion réussie', token });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const getAdminProfile = async (req, res) => {
  try {
    // Récupérer l'admin depuis la base de données pour avoir les données fraîches
    const admin = await getAdminById(req.user.id);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin introuvable' });
    }

    // Retourner les informations du profil
    res.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      is_active: admin.is_active,
      created_at: admin.created_at
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};