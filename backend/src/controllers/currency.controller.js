import {
  findActiveCurrencies,
  findAllCurrencies,
  createCurrency,
  updateCurrencyById,
  deleteCurrencyById,
  deactivateCurrencyById,
  activateCurrencyById,
  toggleCurrencyStatusById
} from '../models/currency.repository.js';

// Liste publique des devises actives
export const getActiveCurrencies = async (req, res) => {
  try {
    const currencies = await findActiveCurrencies();
    res.json({
      success: true,
      data: currencies,
      count: currencies.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération des devises actives', 
      error: error.message 
    });
  }
};

// Liste complète (admin)
export const getAllCurrencies = async (req, res) => {
  try {
    const currencies = await findAllCurrencies();
    res.json({
      success: true,
      data: currencies,
      count: currencies.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération des devises', 
      error: error.message 
    });
  }
};

// Création d'une devise (admin)
export const addCurrency = async (req, res) => {
  const { code, name, symbol } = req.body;
  
  // Validation des champs requis
  if (!code || !name || !symbol) {
    return res.status(400).json({
      success: false,
      message: 'Les champs code, name et symbol sont requis'
    });
  }
  
  // Validation du format du code
  if (code.length > 10) {
    return res.status(400).json({
      success: false,
      message: 'Le code de la devise ne peut pas dépasser 10 caractères'
    });
  }
  
  try {
    const newCurrency = await createCurrency(code.toUpperCase(), name, symbol);
    res.status(201).json({ 
      success: true,
      message: 'Devise ajoutée avec succès', 
      data: newCurrency 
    });
  } catch (error) {
    const status = error.message.includes('existe déjà') ? 409 : 500;
    res.status(status).json({ 
      success: false,
      message: error.message || 'Erreur lors de l\'ajout de la devise', 
      error: error.message 
    });
  }
};

// Mise à jour d'une devise (admin)
export const updateCurrency = async (req, res) => {
  const { id } = req.params;
  const { code, name, symbol, is_active } = req.body;
  
  try {
    const updatedCurrency = await updateCurrencyById(id, code, name, symbol, is_active);
    if (!updatedCurrency) {
      return res.status(404).json({ 
        success: false,
        message: 'Devise non trouvée' 
      });
    }
    res.json({ 
      success: true,
      message: 'Devise mise à jour avec succès', 
      data: updatedCurrency 
    });
  } catch (error) {
    const status = error.message.includes('existe déjà') ? 409 : 500;
    res.status(status).json({ 
      success: false,
      message: error.message || 'Erreur lors de la mise à jour de la devise', 
      error: error.message 
    });
  }
};

// Désactiver une devise (admin)
export const deactivateCurrency = async (req, res) => {
  const { id } = req.params;
  
  try {
    const deactivatedCurrency = await deactivateCurrencyById(id);
    if (!deactivatedCurrency) {
      return res.status(404).json({ 
        success: false,
        message: 'Devise non trouvée' 
      });
    }
    res.json({ 
      success: true,
      message: 'Devise désactivée avec succès', 
      data: deactivatedCurrency 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la désactivation de la devise', 
      error: error.message 
    });
  }
};

// Activer une devise (admin)
export const activateCurrency = async (req, res) => {
  const { id } = req.params;
  
  try {
    const activatedCurrency = await activateCurrencyById(id);
    if (!activatedCurrency) {
      return res.status(404).json({ 
        success: false,
        message: 'Devise non trouvée ou déjà active' 
      });
    }
    res.json({ 
      success: true,
      message: 'Devise activée avec succès', 
      data: activatedCurrency 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de l\'activation de la devise', 
      error: error.message 
    });
  }
};

// Basculer le statut d'une devise (admin)
export const toggleCurrencyStatus = async (req, res) => {
  const { id } = req.params;
  
  try {
    const toggledCurrency = await toggleCurrencyStatusById(id);
    if (!toggledCurrency) {
      return res.status(404).json({ 
        success: false,
        message: 'Devise non trouvée' 
      });
    }
    const message = toggledCurrency.is_active 
      ? 'Devise activée avec succès' 
      : 'Devise désactivée avec succès';
    
    res.json({ 
      success: true,
      message, 
      data: toggledCurrency 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors du changement de statut de la devise', 
      error: error.message 
    });
  }
};

// Suppression d'une devise (admin)
export const deleteCurrency = async (req, res) => {
  const { id } = req.params;
  
  try {
    const deletedCurrency = await deleteCurrencyById(id);
    if (!deletedCurrency) {
      return res.status(404).json({ 
        success: false,
        message: 'Devise non trouvée' 
      });
    }
    res.json({ 
      success: true,
      message: 'Devise supprimée définitivement avec succès' 
    });
  } catch (error) {
    const status = error.message.includes('ne peut pas être supprimée') ? 400 : 500;
    res.status(status).json({ 
      success: false,
      message: error.message || 'Erreur lors de la suppression de la devise', 
      error: error.message 
    });
  }
};