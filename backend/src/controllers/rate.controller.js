import {
  findActiveRates,
  findAllRates,
  createRate,
  updateRateById,
  deleteRateById,
  findRateByCurrencies
} from '../models/rate.repository.js';

// 📌 Liste publique des taux actifs
export const getActiveRates = async (req, res) => {
  try {
    const rates = await findActiveRates();
    res.json(rates);
  } catch (error) {
    console.error('Erreur lors de la récupération des taux actifs:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des taux actifs', 
      error: error.message 
    });
  }
};

// 📌 Liste complète (admin)
export const getAllRates = async (req, res) => {
  try {
    const rates = await findAllRates();
    res.json(rates);
  } catch (error) {
    console.error('Erreur lors de la récupération des taux:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des taux', 
      error: error.message 
    });
  }
};

// 📌 Création d'un taux (admin)
export const addRate = async (req, res) => {
  try {
    const { from_currency_id, to_currency_id, rate, commission_percent } = req.body;
    const admin_id = req.admin?.id; // récupéré via verifyAdminToken

    // Validation des données
    if (!from_currency_id || !to_currency_id || !rate) {
      return res.status(400).json({ 
        message: 'Les champs from_currency_id, to_currency_id et rate sont obligatoires' 
      });
    }

    if (from_currency_id === to_currency_id) {
      return res.status(400).json({ 
        message: 'Les devises source et cible doivent être différentes' 
      });
    }

    if (parseFloat(rate) <= 0) {
      return res.status(400).json({ 
        message: 'Le taux doit être supérieur à 0' 
      });
    }

    const commission = commission_percent || 0.75;

    const newRate = await createRate(
      from_currency_id, 
      to_currency_id, 
      parseFloat(rate), 
      parseFloat(commission), 
      admin_id
    );
    
    res.status(201).json({ 
      message: 'Taux ajouté avec succès', 
      rate: newRate 
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du taux:', error);
    
    if (error.message === 'Un taux existe déjà pour cette paire de devises') {
      return res.status(409).json({ 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      message: 'Erreur lors de l\'ajout du taux', 
      error: error.message 
    });
  }
};

// 📌 Mise à jour d'un taux (admin)
export const updateRate = async (req, res) => {
  try {
    const { id } = req.params;
    const { rate, commission_percent, is_active } = req.body;

    // Validation
    if (rate && parseFloat(rate) <= 0) {
      return res.status(400).json({ 
        message: 'Le taux doit être supérieur à 0' 
      });
    }

    const updatedRate = await updateRateById(
      id, 
      rate ? parseFloat(rate) : undefined, 
      commission_percent ? parseFloat(commission_percent) : undefined, 
      is_active
    );
    
    if (!updatedRate) {
      return res.status(404).json({ 
        message: 'Taux non trouvé' 
      });
    }
    
    res.json({ 
      message: 'Taux mis à jour avec succès', 
      rate: updatedRate 
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du taux:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour du taux', 
      error: error.message 
    });
  }
};

// 📌 Suppression d'un taux (admin)
export const deleteRate = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedRate = await deleteRateById(id);
    
    if (!deletedRate) {
      return res.status(404).json({ 
        message: 'Taux non trouvé' 
      });
    }
    
    res.json({ 
      message: 'Taux supprimé avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du taux:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du taux', 
      error: error.message 
    });
  }
};

// 📌 Récupérer un taux spécifique par paire de devises
export const getRateByCurrencies = async (req, res) => {
  try {
    const { from_currency_id, to_currency_id } = req.params;
    
    const rate = await findRateByCurrencies(from_currency_id, to_currency_id);
    
    if (!rate) {
      return res.status(404).json({ 
        message: 'Taux non trouvé pour cette paire de devises' 
      });
    }
    
    res.json(rate);
  } catch (error) {
    console.error('Erreur lors de la récupération du taux:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du taux', 
      error: error.message 
    });
  }
};