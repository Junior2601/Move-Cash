import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { 
  getSemiAdminByEmail, 
  getSemiAdminById, 
  createSemiAdmin,
  getAllSemiAdmins,
  updateSemiAdmin as updateSemiAdminInDB,  // ← Renommé pour éviter le conflit
  deactivateSemiAdmin as deactivateSemiAdminInDB,
  activateSemiAdmin as activateSemiAdminInDB,
  deleteSemiAdmin as deleteSemiAdminInDB,
  countSemiAdmins
} from '../models/semi_admin.repository.js';
import { findAllTransactions, validateTransaction, cancelTransaction, getTransactionStats } from '../models/transaction.repository.js';

dotenv.config();

// Connexion semi-admin
export const loginSemiAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const semiAdmin = await getSemiAdminByEmail(email);
    if (!semiAdmin) {
      return res.status(404).json({ message: 'Semi-admin introuvable' });
    }

    const isMatch = await bcrypt.compare(password, semiAdmin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    if (!semiAdmin.is_active) {
      return res.status(403).json({ message: 'Compte désactivé' });
    }

    const token = jwt.sign(
      { id: semiAdmin.id, email: semiAdmin.email, role: 'semi_admin', name: semiAdmin.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ 
      message: 'Connexion réussie', 
      token,
      semi_admin: {
        id: semiAdmin.id,
        email: semiAdmin.email,
        name: semiAdmin.name,
        country_id: semiAdmin.country_id,
        is_active: semiAdmin.is_active
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Récupérer le profil du semi-admin connecté
export const getSemiAdminProfile = async (req, res) => {
  try {
    const semiAdminId = req.user.id;
    const semiAdmin = await getSemiAdminById(semiAdminId);

    if (!semiAdmin) {
      return res.status(404).json({ message: 'Semi-admin non trouvé' });
    }

    res.json({ semi_admin: semiAdmin });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Création d'un semi-admin par l'admin
export const registerSemiAdmin = async (req, res) => {
  try {
    const { email, password, name, country_id } = req.body;
    const admin_id = req.user.id;

    const existingSemiAdmin = await getSemiAdminByEmail(email);
    if (existingSemiAdmin) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newSemiAdmin = await createSemiAdmin({ email, hashedPassword, name, country_id }, admin_id);

    res.status(201).json({ message: 'Semi-admin créé avec succès', semi_admin: newSemiAdmin });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Récupérer tous les semi-admins
export const getAllSemiAdminsController = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const semiAdmins = await getAllSemiAdmins(limit, offset);
    const total = await countSemiAdmins();
    const totalPages = Math.ceil(total / limit);

    res.json({
      semi_admins: semiAdmins,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalSemiAdmins: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Récupérer un semi-admin par ID
export const getSemiAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const semiAdmin = await getSemiAdminById(id);

    if (!semiAdmin) {
      return res.status(404).json({ message: 'Semi-admin non trouvé' });
    }

    res.json({ semi_admin: semiAdmin });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Mettre à jour un semi-admin
export const updateSemiAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, country_id, is_active } = req.body;
    const admin_id = req.user.id;

    const semiAdmin = await getSemiAdminById(id);
    if (!semiAdmin) {
      return res.status(404).json({ message: 'Semi-admin non trouvé' });
    }

    const updatedSemiAdmin = await updateSemiAdminInDB(id, { email, name, country_id, is_active }, admin_id);

    res.json({ message: 'Semi-admin mis à jour avec succès', semi_admin: updatedSemiAdmin });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Désactiver un semi-admin
export const deactivateSemiAdminAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.user.id;

    const semiAdmin = await getSemiAdminById(id);
    if (!semiAdmin) {
      return res.status(404).json({ message: 'Semi-admin non trouvé' });
    }

    if (!semiAdmin.is_active) {
      return res.status(400).json({ message: 'Semi-admin déjà désactivé' });
    }

    const deactivatedSemiAdmin = await deactivateSemiAdminInDB(id, admin_id);

    res.json({ message: 'Semi-admin désactivé avec succès', semi_admin: deactivatedSemiAdmin });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Activer un semi-admin
export const activateSemiAdminAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.user.id;

    const semiAdmin = await getSemiAdminById(id);
    if (!semiAdmin) {
      return res.status(404).json({ message: 'Semi-admin non trouvé' });
    }

    if (semiAdmin.is_active) {
      return res.status(400).json({ message: 'Semi-admin déjà activé' });
    }

    const activatedSemiAdmin = await activateSemiAdminInDB(id, admin_id);

    res.json({ message: 'Semi-admin activé avec succès', semi_admin: activatedSemiAdmin });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Supprimer un semi-admin
export const deleteSemiAdminAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.user.id;

    const semiAdmin = await getSemiAdminById(id);
    if (!semiAdmin) {
      return res.status(404).json({ message: 'Semi-admin non trouvé' });
    }

    const deletedSemiAdmin = await deleteSemiAdminInDB(id, admin_id);

    res.json({ message: 'Semi-admin supprimé avec succès', semi_admin: deletedSemiAdmin });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ============= GESTION DES TRANSACTIONS POUR SEMI-ADMIN =============

// Récupérer les transactions pour semi-admin
export const getTransactionsForSemiAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      agent_id,
      from_country_id,
      to_country_id,
      start_date,
      end_date
    } = req.query;

    const result = await findAllTransactions({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      agent_id,
      from_country_id,
      to_country_id,
      start_date,
      end_date
    });

    res.json({
      success: true,
      message: 'Transactions récupérées avec succès',
      data: result.transactions,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('❌ Erreur récupération transactions pour semi-admin:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des transactions'
    });
  }
};

// Valider une transaction par semi-admin
export const validateTransactionBySemiAdmin = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const actor = { ...req.user, role: 'semi_admin' };

    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        message: 'ID de transaction requis'
      });
    }

    const result = await validateTransaction(transaction_id, actor);

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('❌ Erreur validation transaction par semi-admin:', error);
    
    if (error.message.includes('introuvable')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('déjà traitée') || error.message.includes('expirée') || error.message.includes('autorisé')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la validation de la transaction'
    });
  }
};

// Annuler une transaction par semi-admin
export const cancelTransactionBySemiAdmin = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const actor = { ...req.user, role: 'semi_admin' };

    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        message: 'ID de transaction requis'
      });
    }

    const result = await cancelTransaction(transaction_id, actor);

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('❌ Erreur annulation transaction par semi-admin:', error);
    
    if (error.message.includes('introuvable') || error.message.includes('déjà traitée')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'annulation de la transaction'
    });
  }
};

// Statistiques pour semi-admin
export const getTransactionStatsForSemiAdmin = async (req, res) => {
  try {
    const {
      agent_id,
      from_country_id,
      to_country_id,
      start_date,
      end_date
    } = req.query;

    const stats = await getTransactionStats({
      agent_id: agent_id ? parseInt(agent_id) : null,
      from_country_id: from_country_id ? parseInt(from_country_id) : null,
      to_country_id: to_country_id ? parseInt(to_country_id) : null,
      start_date,
      end_date
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Erreur stats transactions pour semi-admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};