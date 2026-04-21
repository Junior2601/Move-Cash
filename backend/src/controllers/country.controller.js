import {
  findActiveCountries,
  findAllCountries,
  getCountriesStatistics,
  createCountry,
  updateCountryById,
  activateCountryById,
  deactivateCountryById,
  toggleCountryStatusById,
  deleteCountryById,
  findDeletedCountries,
  restoreCountryById
} from '../models/country.repository.js';

// Liste publique des pays actifs
export const getActiveCountries = async (req, res) => {
  try {
    const countries = await findActiveCountries();
    res.json({
      success: true,
      data: countries,
      count: countries.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération des pays actifs', 
      error: error.message 
    });
  }
};

// Liste complète (admin)
export const getAllCountries = async (req, res) => {
  try {
    const countries = await findAllCountries();
    res.json({
      success: true,
      data: countries,
      count: countries.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération des pays', 
      error: error.message 
    });
  }
};

// Statistiques des pays (admin)
export const getCountriesStats = async (req, res) => {
  try {
    const stats = await getCountriesStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération des statistiques', 
      error: error.message 
    });
  }
};

// Création d'un pays (admin)
export const addCountry = async (req, res) => {
  const { name, code, phone_prefix, currency_id } = req.body;
  const admin_id = req.user?.id;

  // Validation des champs requis
  const missingFields = [];
  if (!name?.trim()) missingFields.push('name');
  if (!code?.trim()) missingFields.push('code');
  if (!phone_prefix?.trim()) missingFields.push('phone_prefix');
  if (!currency_id) missingFields.push('currency_id');

  if (missingFields.length > 0) {
    return res.status(400).json({ 
      success: false,
      message: 'Champs obligatoires manquants',
      missing: missingFields 
    });
  }
  
  // Validation du format
  if (code.length !== 3) {
    return res.status(400).json({
      success: false,
      message: 'Le code pays doit contenir exactement 3 caractères (ISO 3166-1 alpha-3)'
    });
  }
  
  try {
    const newCountry = await createCountry(
      name.trim(), 
      code.trim().toUpperCase(), 
      phone_prefix.trim(), 
      parseInt(currency_id), 
      admin_id
    );
    
    res.status(201).json({ 
      success: true,
      message: 'Pays ajouté avec succès', 
      data: newCountry 
    });
    
  } catch (error) {
    const status = error.message.includes('existe déjà') ? 409 : 
                   error.message.includes('Devise invalide') ? 400 : 500;
    
    res.status(status).json({ 
      success: false,
      message: error.message || 'Erreur lors de l\'ajout du pays', 
      error: error.message 
    });
  }
};

// Mise à jour d'un pays (admin)
export const updateCountry = async (req, res) => {
  const { id } = req.params;
  const { name, code, phone_prefix, currency_id, is_active } = req.body;
  const admin_id = req.user?.id;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({ 
      success: false,
      message: 'ID de pays invalide' 
    });
  }
  
  try {
    const updatedCountry = await updateCountryById(
      parseInt(id), 
      name?.trim(), 
      code?.trim().toUpperCase(), 
      phone_prefix?.trim(), 
      parseInt(currency_id), 
      is_active, 
      admin_id
    );

    res.json({ 
      success: true,
      message: 'Pays mis à jour avec succès', 
      data: updatedCountry 
    });
    
  } catch (error) {
    const status = error.message === 'Pays introuvable' ? 404 :
                   error.message.includes('existe déjà') ? 409 :
                   error.message.includes('Devise invalide') ? 400 : 500;
    
    res.status(status).json({ 
      success: false,
      message: error.message || 'Erreur lors de la mise à jour du pays',
      error: error.message 
    });
  }
};

// Activer un pays (admin)
export const activateCountry = async (req, res) => {
  const { id } = req.params;
  const admin_id = req.user?.id;
  
  try {
    const activatedCountry = await activateCountryById(parseInt(id), admin_id);
    
    res.json({ 
      success: true,
      message: 'Pays activé avec succès', 
      data: activatedCountry 
    });
    
  } catch (error) {
    const status = error.message === 'Pays introuvable' ? 404 : 500;
    res.status(status).json({ 
      success: false,
      message: error.message || 'Erreur lors de l\'activation du pays', 
      error: error.message 
    });
  }
};

// Désactiver un pays (admin)
export const deactivateCountry = async (req, res) => {
  const { id } = req.params;
  const admin_id = req.user?.id;
  
  try {
    const deactivatedCountry = await deactivateCountryById(parseInt(id), admin_id);
    
    res.json({ 
      success: true,
      message: 'Pays désactivé avec succès', 
      data: deactivatedCountry 
    });
    
  } catch (error) {
    const status = error.message === 'Pays introuvable' ? 404 :
                   error.message.includes('utilisé') ? 409 : 500;
    
    res.status(status).json({ 
      success: false,
      message: error.message || 'Erreur lors de la désactivation du pays', 
      error: error.message 
    });
  }
};

// Basculer le statut d'un pays (admin)
export const toggleCountryStatus = async (req, res) => {
  const { id } = req.params;
  const admin_id = req.user?.id;
  
  try {
    const updatedCountry = await toggleCountryStatusById(parseInt(id), admin_id);
    
    const message = updatedCountry.is_active 
      ? 'Pays activé avec succès' 
      : 'Pays désactivé avec succès';
    
    res.json({ 
      success: true,
      message, 
      data: updatedCountry 
    });
    
  } catch (error) {
    const status = error.message === 'Pays introuvable' ? 404 :
                   error.message.includes('utilisé') ? 409 : 500;
    
    res.status(status).json({ 
      success: false,
      message: error.message || 'Erreur lors du changement de statut', 
      error: error.message 
    });
  }
};

// Supprimer définitivement un pays (admin)
export const deleteCountry = async (req, res) => {
  const { id } = req.params;
  const admin_id = req.user?.id;
  
  try {
    await deleteCountryById(parseInt(id), admin_id);
    
    res.json({ 
      success: true,
      message: 'Pays supprimé définitivement avec succès' 
    });
    
  } catch (error) {
    const status = error.message === 'Pays introuvable' ? 404 :
                   error.message.includes('utilisé') ? 409 : 500;
    
    res.status(status).json({ 
      success: false,
      message: error.message || 'Erreur lors de la suppression du pays', 
      error: error.message 
    });
  }
};

// Récupérer les pays supprimés (admin)
export const getDeletedCountries = async (req, res) => {
  try {
    const countries = await findDeletedCountries();
    res.json({
      success: true,
      data: countries,
      count: countries.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la récupération des pays supprimés', 
      error: error.message 
    });
  }
};

// Restaurer un pays supprimé (admin)
export const restoreCountry = async (req, res) => {
  const { id } = req.params;
  const admin_id = req.user?.id;
  
  try {
    const restoredCountry = await restoreCountryById(parseInt(id), admin_id);
    
    res.json({ 
      success: true,
      message: 'Pays restauré avec succès', 
      data: restoredCountry 
    });
    
  } catch (error) {
    const status = error.message === 'Pays non trouvé ou déjà actif' ? 404 : 500;
    res.status(status).json({ 
      success: false,
      message: error.message || 'Erreur lors de la restauration du pays', 
      error: error.message 
    });
  }
};