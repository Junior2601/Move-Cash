import {
  findActiveCountries,
  findAllCountries,
  countAllCountries,
  countActiveCountries,
  countInactiveCountries,
  createCountry,
  updateCountryById,
  deleteCountryById,
  toggleCountryStatusById,
  getCountriesStats as getCountriesStatsFromRepo
} from '../models/country.repository.js';

// Liste publique des pays actifs
export const getActiveCountries = async (req, res) => {
  console.log('🌐 GET /countries/active - Début');
  try {
    const countries = await findActiveCountries();
    console.log(`✅ GET /countries/active - ${countries.length} pays retournés`);
    res.json(countries);
  } catch (error) {
    console.error('💥 GET /countries/active - Erreur:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des pays actifs', 
      error: error.message 
    });
  }
};

// Liste complète (admin)
export const getAllCountries = async (req, res) => {
  console.log('🌐 GET /countries - Début');
  console.log('👤 User:', req.user);
  try {
    const countries = await findAllCountries();
    console.log(`✅ GET /countries - ${countries.length} pays retournés`);
    res.json(countries);
  } catch (error) {
    console.error('💥 GET /countries - Erreur:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des pays', 
      error: error.message 
    });
  }
};

// Statistiques des pays (admin)
export const getCountriesStats = async (req, res) => {
  console.log('🌐 GET /countries/stats - Début');
  try {
    const stats = await getCountriesStatsFromRepo();
    
    const response = {
      total: parseInt(stats.total_countries),
      active: parseInt(stats.active_countries),
      inactive: parseInt(stats.inactive_countries)
    };
    
    console.log('✅ GET /countries/stats - Statistiques:', response);
    res.json(response);
  } catch (error) {
    console.error('💥 GET /countries/stats - Erreur:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des statistiques', 
      error: error.message 
    });
  }
};

// Création d'un pays (admin)
export const addCountry = async (req, res) => {
  console.log('🌐 POST /countries - Début');
  const { name, code, phone_prefix, currency_id } = req.body;
  const admin_id = req.user?.id;
  
  console.log('📥 Données reçues:', { name, code, phone_prefix, currency_id, admin_id });

  // Validation des champs requis
  const missingFields = [];
  if (!name) missingFields.push('name');
  if (!code) missingFields.push('code');
  if (!phone_prefix) missingFields.push('phone_prefix');
  if (!currency_id) missingFields.push('currency_id');

  if (missingFields.length > 0) {
    console.log('❌ POST /countries - Champs manquants:', missingFields);
    return res.status(400).json({ 
      message: 'Tous les champs sont obligatoires',
      missing: missingFields 
    });
  }
  
  try {
    console.log('📤 Appel création pays...');
    const newCountry = await createCountry(
      name.trim(), 
      code.trim().toUpperCase(), 
      phone_prefix.trim(), 
      parseInt(currency_id), 
      admin_id
    );
    
    console.log('✅ POST /countries - Pays créé:', newCountry);
    res.status(201).json({ 
      message: 'Pays ajouté avec succès', 
      country: newCountry 
    });
    
  } catch (error) {
    console.error('💥 POST /countries - Erreur:', error);
    
    if (error.code === '23505') { // Violation de contrainte unique (doublon)
      return res.status(409).json({ message: 'Un pays avec ce code existe déjà' });
    }
    
    if (error.message === 'Un pays avec ce code ou ce nom existe déjà') {
      return res.status(409).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Erreur lors de l\'ajout du pays', 
      error: error.message 
    });
  }
};

// Mise à jour d'un pays (admin)
export const updateCountry = async (req, res) => {
  console.log('🌐 PUT /countries/:id - Début');
  
  const { id } = req.params;
  const { name, code, phone_prefix, currency_id, is_active } = req.body;
  const admin_id = req.user?.id;

  console.log('📥 Données reçues:', {
    id, name, code, phone_prefix, currency_id, is_active, admin_id
  });
  
  // Validation de l'ID
  if (!id || isNaN(id)) {
    console.log('❌ PUT /countries/:id - ID invalide');
    return res.status(400).json({ message: 'ID de pays invalide' });
  }
  
  // Validation des champs requis
  const missingFields = [];
  if (!name) missingFields.push('name');
  if (!code) missingFields.push('code');
  if (!phone_prefix) missingFields.push('phone_prefix');
  if (!currency_id) missingFields.push('currency_id');

  if (missingFields.length > 0) {
    console.log('❌ PUT /countries/:id - Champs manquants:', missingFields);
    return res.status(400).json({ 
      message: 'Champs obligatoires manquants', 
      missing: missingFields 
    });
  }
  
  try {
    console.log('📤 Appel mise à jour pays...');
    
    const updatedCountry = await updateCountryById(
      parseInt(id), 
      name.trim(), 
      code.trim().toUpperCase(), 
      phone_prefix.trim(), 
      parseInt(currency_id), 
      Boolean(is_active), 
      admin_id
    );
    
    console.log('✅ PUT /countries/:id - Pays mis à jour:', updatedCountry);

    res.json({ 
      message: 'Pays mis à jour avec succès', 
      country: updatedCountry 
    });
    
  } catch (error) {
    console.error('💥 PUT /countries/:id - Erreur:', error);
    
    // Gestion des erreurs spécifiques
    if (error.message === 'Pays introuvable') {
      return res.status(404).json({ message: 'Pays non trouvé' });
    }
    
    if (error.message === 'Un pays avec ce code ou ce nom existe déjà') {
      return res.status(409).json({ message: error.message });
    }
    
    if (error.code === '23505') { // Violation de contrainte unique PostgreSQL
      return res.status(409).json({ message: 'Un pays avec ce code existe déjà' });
    }

    if (error.code === '23503') { // Violation clé étrangère
      return res.status(400).json({ message: 'Devise introuvable' });
    }
    
    res.status(500).json({ 
      message: 'Erreur serveur lors de la mise à jour du pays',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
};

// Activer/désactiver un pays (admin)
export const toggleCountryStatus = async (req, res) => {
  console.log('🌐 PATCH /countries/:id/toggle-status - Début');
  
  const { id } = req.params;
  const { is_active } = req.body;
  const admin_id = req.user?.id;

  console.log('📥 Données reçues:', { id, is_active, admin_id });
  
  // Validation de l'ID
  if (!id || isNaN(id)) {
    console.log('❌ PATCH /countries/:id/toggle-status - ID invalide');
    return res.status(400).json({ message: 'ID de pays invalide' });
  }
  
  // Validation du statut
  if (typeof is_active !== 'boolean') {
    console.log('❌ PATCH /countries/:id/toggle-status - Statut invalide');
    return res.status(400).json({ message: 'Le statut (is_active) doit être un booléen' });
  }
  
  try {
    console.log('📤 Appel toggle statut...');
    const updatedCountry = await toggleCountryStatusById(
      parseInt(id), 
      is_active, 
      admin_id
    );
    
    console.log('✅ PATCH /countries/:id/toggle-status - Statut mis à jour:', updatedCountry);

    res.json({ 
      message: `Pays ${is_active ? 'activé' : 'désactivé'} avec succès`, 
      country: updatedCountry 
    });
    
  } catch (error) {
    console.error('💥 PATCH /countries/:id/toggle-status - Erreur:', error);
    
    if (error.message === 'Pays introuvable') {
      return res.status(404).json({ message: 'Pays non trouvé' });
    }
    
    res.status(500).json({ 
      message: 'Erreur lors du changement de statut du pays', 
      error: error.message 
    });
  }
};

// Suppression d'un pays (admin)
export const deleteCountry = async (req, res) => {
  console.log('🌐 DELETE /countries/:id - Début');
  
  const { id } = req.params;
  const admin_id = req.user?.id;

  console.log('📥 Données reçues:', { id, admin_id });
  
  // Validation de l'ID
  if (!id || isNaN(id)) {
    console.log('❌ DELETE /countries/:id - ID invalide');
    return res.status(400).json({ message: 'ID de pays invalide' });
  }
  
  try {
    console.log('📤 Appel suppression pays...');
    const deletedCountry = await deleteCountryById(parseInt(id), admin_id);
    
    console.log('✅ DELETE /countries/:id - Pays supprimé:', deletedCountry);
    
    res.json({ message: 'Pays supprimé avec succès' });
    
  } catch (error) {
    console.error('💥 DELETE /countries/:id - Erreur:', error);
    
    if (error.message === 'Pays introuvable') {
      return res.status(404).json({ message: 'Pays non trouvé' });
    }
    
    if (error.code === '23503') { // Violation de clé étrangère
      return res.status(409).json({ message: 'Impossible de supprimer ce pays car il est utilisé ailleurs' });
    }
    
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du pays', 
      error: error.message 
    });
  }
};