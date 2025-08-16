import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { getAgentByEmail, createAgent } from '../models/agent.repository.js';

dotenv.config();

// Création d’un agent par l’admin
export const registerAgent = async (req, res) => {
  try {
    const { email, password, name, country_id } = req.body;

    const existingAgent = await getAgentByEmail(email);
    if (existingAgent) {
      return res.status(400).json({ message: 'Email déjà utilisé par un agent' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAgent = await createAgent({ email, hashedPassword, name, country_id });

    res.status(201).json({ message: 'Agent créé avec succès', agent: newAgent });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Connexion agent
export const loginAgent = async (req, res) => {
  try {
    const { email, password } = req.body;

    const agent = await getAgentByEmail(email);
    if (!agent) {
      return res.status(404).json({ message: 'Agent introuvable' });
    }

    const isMatch = await bcrypt.compare(password, agent.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    if (!agent.is_active) {
      return res.status(403).json({ message: 'Compte désactivé' });
    }

    const token = jwt.sign(
      { id: agent.id, email: agent.email, role: 'agent', country_id: agent.country_id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ message: 'Connexion réussie', token });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
