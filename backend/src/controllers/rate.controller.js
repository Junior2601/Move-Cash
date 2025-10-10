import {
  findActiveRates,
  findAllRates,
  createRate,
  updateRateById,
  deleteRateById,
  findRateByCurrencies,
  findRateByCountries
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
    const admin_id = req.admin?.id;

    console.log('Données reçues:', { from_currency_id, to_currency_id, rate, commission_percent });

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
    const admin_id = req.admin?.id;

    console.log('Mise à jour taux:', { id, rate, commission_percent, is_active });

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
      is_active,
      admin_id
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
    const admin_id = req.admin?.id;

    console.log('Suppression taux:', id);

    const deletedRate = await deleteRateById(id, admin_id);
    
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
    
    if (!from_currency_id || !to_currency_id) {
      return res.status(400).json({ 
        message: 'Les IDs des devises sont requis' 
      });
    }

    const rate = await findRateByCurrencies(from_currency_id, to_currency_id);
    
    if (!rate) {
      return res.status(404).json({ 
        message: 'Taux non trouvé pour cette paire de devises' 
      });
    }
    
    res.json({
      success: true,
      data: rate
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du taux:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du taux', 
      error: error.message 
    });
  }
};

// 📌 Endpoint générique pour récupérer un taux
export const getRate = async (req, res) => {
  try {
    const { from_country, to_country, from_currency, to_currency } = req.query;
    
    let rate;

    // Priorité 1: Recherche par pays
    if (from_country && to_country) {
      rate = await findRateByCountries(from_country, to_country);
    }
    // Priorité 2: Recherche par devises
    else if (from_currency && to_currency) {
      rate = await findRateByCurrencies(from_currency, to_currency);
    }
    else {
      return res.status(400).json({ 
        message: 'Paramètres de recherche manquants. Utilisez from_country/to_country ou from_currency/to_currency' 
      });
    }
    
    if (!rate) {
      return res.status(404).json({ 
        message: 'Taux non trouvé' 
      });
    }
    
    res.json({
      success: true,
      data: rate
    });
  } catch (error) {
    console.error('Erreur récupération taux:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du taux', 
      error: error.message 
    });
  }
};

// 📌 Récupérer un taux par paires de pays
export const getRateByCountries = async (req, res) => {
  try {
    const { from_country_id, to_country_id } = req.params;
    
    console.log('🌐 GET /rate/countries - Paramètres:', { from_country_id, to_country_id });
    
    if (!from_country_id || !to_country_id) {
      return res.status(400).json({ 
        success: false,
        message: 'Les IDs des pays sont requis' 
      });
    }

    const rate = await findRateByCountries(from_country_id, to_country_id);
    
    if (!rate) {
      console.log('❌ Aucun taux trouvé pour ces pays');
      return res.status(404).json({ 
        success: false,
        message: 'Taux non trouvé pour cette paire de pays' 
      });
    }
    
    console.log('✅ Taux trouvé:', rate);
    
    res.json({
      success: true,
      data: rate
    });
  } catch (error) {
    console.error('💥 Erreur récupération taux par pays:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération du taux', 
      error: error.message 
    });
  }
};