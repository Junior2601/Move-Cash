import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { pool } from '../config/db.js';
import {
  getAgentByEmail,
  createAgent,
  getAllAgents,
  getAgentById,
  updateAgent,
  updateAgentPassword,
  deactivateAgent,
  activateAgent,
  deleteAgent,
  countAgents,
  countAgentsByCountry,
  searchAgents,
  getAgentsByCountry,
  getAgentsByCountryCode
} from '../models/agent.repository.js';

dotenv.config();

// Création d'un agent par l'admin
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

    res.json({ 
      message: 'Connexion réussie', 
      token,
      agent: {
        id: agent.id,
        email: agent.email,
        name: agent.name,
        country_id: agent.country_id,
        is_active: agent.is_active
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Récupérer tous les agents
export const getAgents = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, country_id } = req.query;
    const offset = (page - 1) * limit;

    let agents;
    let total;

    if (search) {
      agents = await searchAgents(search, limit, offset);
      total = await countAgents();
    } else if (country_id) {
      // Vérifier si le pays existe
      const country = await pool.query('SELECT id, name FROM countries WHERE id = $1', [country_id]);
      if (country.rows.length === 0) {
        return res.status(404).json({ message: 'Pays non trouvé' });
      }
      agents = await getAgentsByCountry(country_id, limit, offset);
      total = await countAgentsByCountry(country_id);
    } else {
      agents = await getAllAgents(limit, offset);
      total = await countAgents();
    }

    const totalPages = Math.ceil(total / limit);

    res.json({
      agents,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalAgents: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Récupérer un agent par ID
export const getAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await getAgentById(id);

    if (!agent) {
      return res.status(404).json({ message: 'Agent non trouvé' });
    }

    res.json({ agent });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Récupérer les agents par ID de pays
export const getAgentsByCountryIdController = async (req, res) => {
  try {
    const { country_id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Validation de l'ID du pays
    if (!country_id || isNaN(country_id)) {
      return res.status(400).json({ message: 'ID de pays invalide' });
    }

    // Vérifier si le pays existe
    const country = await pool.query('SELECT id, name, code FROM countries WHERE id = $1', [country_id]);
    if (country.rows.length === 0) {
      return res.status(404).json({ message: 'Pays non trouvé' });
    }

    const agents = await getAgentsByCountry(country_id, limit, offset);
    const total = await countAgentsByCountry(country_id);
    const totalPages = Math.ceil(total / limit);

    res.json({
      country: country.rows[0],
      agents,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalAgents: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Récupérer les agents par code de pays
export const getAgentsByCountryCodeController = async (req, res) => {
  try {
    const { country_code } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Vérifier si le pays existe et récupérer son ID
    const country = await pool.query(
      'SELECT id, name, code FROM countries WHERE code = $1',
      [country_code.toUpperCase()]
    );
    
    if (country.rows.length === 0) {
      return res.status(404).json({ message: 'Pays non trouvé' });
    }

    const agents = await getAgentsByCountryCode(country_code, limit, offset);
    const total = await countAgentsByCountry(country.rows[0].id);
    const totalPages = Math.ceil(total / limit);

    res.json({
      country: country.rows[0],
      agents,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalAgents: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Mettre à jour un agent
export const updateAgentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, country_id, is_active } = req.body;

    // Vérifier si l'agent existe
    const existingAgent = await getAgentById(id);
    if (!existingAgent) {
      return res.status(404).json({ message: 'Agent non trouvé' });
    }

    // Vérifier si l'email est déjà utilisé par un autre agent
    if (email && email !== existingAgent.email) {
      const agentWithEmail = await getAgentByEmail(email);
      if (agentWithEmail && agentWithEmail.id !== parseInt(id)) {
        return res.status(400).json({ message: 'Email déjà utilisé' });
      }
    }

    const updatedAgent = await updateAgent(id, { email, name, country_id, is_active });

    res.json({ message: 'Agent mis à jour avec succès', agent: updatedAgent });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Changer le mot de passe d'un agent
export const changeAgentPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const agent = await getAgentById(id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent non trouvé' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateAgentPassword(id, hashedPassword);

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Désactiver un agent
export const deactivateAgentAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await getAgentById(id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent non trouvé' });
    }

    if (!agent.is_active) {
      return res.status(400).json({ message: 'Agent déjà désactivé' });
    }

    const deactivatedAgent = await deactivateAgent(id);

    res.json({ message: 'Agent désactivé avec succès', agent: deactivatedAgent });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Activer un agent
export const activateAgentAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await getAgentById(id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent non trouvé' });
    }

    if (agent.is_active) {
      return res.status(400).json({ message: 'Agent déjà activé' });
    }

    const activatedAgent = await activateAgent(id);

    res.json({ message: 'Agent activé avec succès', agent: activatedAgent });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Supprimer un agent (hard delete)
export const deleteAgentAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await getAgentById(id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent non trouvé' });
    }

    const deletedAgent = await deleteAgent(id);

    res.json({ message: 'Agent supprimé avec succès', agent: deletedAgent });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Récupérer le profil de l'agent connecté
export const getProfile = async (req, res) => {
  try {
    const agentId = req.user.id;
    const agent = await getAgentById(agentId);

    if (!agent) {
      return res.status(404).json({ message: 'Agent non trouvé' });
    }

    res.json({ agent });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Mettre à jour le profil de l'agent connecté
export const updateProfile = async (req, res) => {
  try {
    const agentId = req.user.id;
    const { email, name, country_id } = req.body;

    const existingAgent = await getAgentById(agentId);
    if (!existingAgent) {
      return res.status(404).json({ message: 'Agent non trouvé' });
    }

    if (email && email !== existingAgent.email) {
      const agentWithEmail = await getAgentByEmail(email);
      if (agentWithEmail) {
        return res.status(400).json({ message: 'Email déjà utilisé' });
      }
    }

    const updatedAgent = await updateAgent(agentId, { email, name, country_id });

    res.json({ message: 'Profil mis à jour avec succès', agent: updatedAgent });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Changer le mot de passe de l'agent connecté
export const changePassword = async (req, res) => {
  try {
    const agentId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const agent = await getAgentById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent non trouvé' });
    }

    // Vérifier le mot de passe actuel
    const isMatch = await bcrypt.compare(currentPassword, agent.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateAgentPassword(agentId, hashedPassword);

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};