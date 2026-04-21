import {
  findActivePaymentMethodsByCountry,
  findAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethodById,
  deletePaymentMethodById,
  togglePaymentMethodStatus,
  findPaymentMethodById,
  getPaymentMethodsStats,
  getPaymentMethodHistory,
  canDeletePaymentMethod,
  findPaymentMethodsByCountryWithDetails,
  batchUpdatePaymentMethodsStatus
} from '../models/paymentMethod.repository.js';

// ============ ROUTES PUBLIQUES ============

// Récupérer les méthodes de paiement actives par pays
export const getActivePaymentMethodsByCountry = async (req, res) => {
  try {
    const { country_id } = req.params;
    
    if (!country_id) {
      return res.status(400).json({ error: 'ID du pays requis' });
    }

    // Validation que country_id est un nombre
    if (isNaN(country_id)) {
      return res.status(400).json({ error: 'ID du pays invalide' });
    }

    const paymentMethods = await findActivePaymentMethodsByCountry(parseInt(country_id));
    
    res.json({
      success: true,
      data: paymentMethods,
      count: paymentMethods.length
    });
  } catch (error) {
    console.error('Erreur contrôleur getActivePaymentMethodsByCountry:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Récupérer les méthodes de paiement par pays avec détails (version améliorée)
export const getPaymentMethodsByCountryWithDetails = async (req, res) => {
  try {
    const { country_id } = req.params;
    
    if (!country_id || isNaN(country_id)) {
      return res.status(400).json({ error: 'ID du pays valide requis' });
    }

    const paymentMethods = await findPaymentMethodsByCountryWithDetails(parseInt(country_id));
    
    res.json({
      success: true,
      data: paymentMethods,
      count: paymentMethods.length
    });
  } catch (error) {
    console.error('Erreur contrôleur getPaymentMethodsByCountryWithDetails:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ============ ROUTES ADMIN ============

// Récupérer tous les moyens de paiement avec pagination et filtres
export const getAllPaymentMethods = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 par page
    
    const filters = {
      country_id: req.query.country_id ? parseInt(req.query.country_id) : undefined,
      is_active: req.query.is_active === 'true' ? true : 
                 req.query.is_active === 'false' ? false : undefined,
      method: req.query.method,
      currency_id: req.query.currency_id ? parseInt(req.query.currency_id) : undefined
    };
    
    const result = await findAllPaymentMethods(page, limit, filters);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Erreur getAllPaymentMethods:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des méthodes de paiement' });
  }
};

// Récupérer un moyen de paiement par ID
export const getPaymentMethodById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID valide requis' });
    }
    
    const paymentMethod = await findPaymentMethodById(parseInt(id));
    
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Moyen de paiement non trouvé' });
    }
    
    res.json({
      success: true,
      data: paymentMethod
    });
  } catch (error) {
    console.error('Erreur getPaymentMethodById:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Créer un nouveau moyen de paiement
export const addPaymentMethod = async (req, res) => {
  try {
    const { country_id, method, currency_id } = req.body;
    const admin_id = req.admin?.id;
    
    // Validation des champs requis
    const errors = [];
    if (!country_id) errors.push('country_id est requis');
    if (!method) errors.push('method est requis');
    if (!currency_id) errors.push('currency_id est requis');
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Champs manquants',
        details: errors 
      });
    }
    
    // Validation des types
    if (isNaN(country_id) || isNaN(currency_id)) {
      return res.status(400).json({ error: 'country_id et currency_id doivent être des nombres' });
    }
    
    // Validation de la longueur du method
    if (method.length < 2 || method.length > 100) {
      return res.status(400).json({ error: 'method doit contenir entre 2 et 100 caractères' });
    }
    
    const paymentMethod = await createPaymentMethod(
      parseInt(country_id), 
      method.trim(), 
      parseInt(currency_id), 
      admin_id
    );
    
    res.status(201).json({
      success: true,
      message: 'Moyen de paiement créé avec succès',
      data: paymentMethod
    });
  } catch (error) {
    console.error('Erreur addPaymentMethod:', error);
    
    if (error.message === 'Ce moyen de paiement existe déjà pour ce pays') {
      return res.status(409).json({ error: error.message });
    }
    
    if (error.message === 'Tous les champs sont requis: country_id, method, currency_id') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Erreur serveur lors de la création' });
  }
};

// Mettre à jour un moyen de paiement
export const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { method, is_active, currency_id } = req.body;
    const admin_id = req.admin?.id;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID valide requis' });
    }
    
    const updates = {};
    if (method !== undefined) updates.method = method.trim();
    if (is_active !== undefined) updates.is_active = is_active;
    if (currency_id !== undefined) updates.currency_id = parseInt(currency_id);
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }
    
    // Validation supplémentaire
    if (updates.method && (updates.method.length < 2 || updates.method.length > 100)) {
      return res.status(400).json({ error: 'method doit contenir entre 2 et 100 caractères' });
    }
    
    const paymentMethod = await updatePaymentMethodById(parseInt(id), updates, admin_id);
    
    res.json({
      success: true,
      message: 'Moyen de paiement mis à jour avec succès',
      data: paymentMethod
    });
  } catch (error) {
    console.error('Erreur updatePaymentMethod:', error);
    
    if (error.message === 'Moyen de paiement introuvable') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
  }
};

// Route spécifique pour l'activation/désactivation
export const togglePaymentMethodStatusCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const admin_id = req.admin?.id;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID valide requis' });
    }
    
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'Le champ is_active doit être un booléen (true/false)' });
    }
    
    const paymentMethod = await togglePaymentMethodStatus(parseInt(id), is_active, admin_id);
    
    res.json({
      success: true,
      message: `Moyen de paiement ${is_active ? 'activé' : 'désactivé'} avec succès`,
      data: paymentMethod
    });
  } catch (error) {
    console.error('Erreur togglePaymentMethodStatus:', error);
    
    if (error.message === 'Moyen de paiement introuvable') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Erreur serveur lors du changement de statut' });
  }
};

// Supprimer un moyen de paiement
export const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.admin?.id;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID valide requis' });
    }
    
    // Vérifier si la suppression est possible
    const canDelete = await canDeletePaymentMethod(parseInt(id));
    if (!canDelete.canDelete) {
      return res.status(409).json({ 
        error: 'Impossible de supprimer ce moyen de paiement',
        message: canDelete.message,
        dependencies: canDelete.dependencies
      });
    }
    
    const paymentMethod = await deletePaymentMethodById(parseInt(id), admin_id);
    
    res.json({
      success: true,
      message: 'Moyen de paiement supprimé avec succès',
      data: paymentMethod
    });
  } catch (error) {
    console.error('Erreur deletePaymentMethod:', error);
    
    if (error.message === 'Moyen de paiement introuvable') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
  }
};

// ============ ROUTES STATISTIQUES ET UTILITAIRES ============

// Récupérer les statistiques
export const getStats = async (req, res) => {
  try {
    const stats = await getPaymentMethodsStats();
    const totalCount = await countPaymentMethods();
    const activeCount = await countActivePaymentMethods();
    
    res.json({
      success: true,
      data: {
        ...stats,
        total_count: totalCount,
        active_count: activeCount,
        inactive_count: totalCount - activeCount
      }
    });
  } catch (error) {
    console.error('Erreur getStats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Récupérer l'historique d'un moyen de paiement
export const getHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID valide requis' });
    }
    
    const history = await getPaymentMethodHistory(parseInt(id), limit);
    
    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Erreur getHistory:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Mise à jour groupée (batch)
export const batchUpdateStatus = async (req, res) => {
  try {
    const { ids, is_active } = req.body;
    const admin_id = req.admin?.id;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Un tableau d\'ids est requis' });
    }
    
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active doit être un booléen' });
    }
    
    // Valider que tous les ids sont des nombres
    const validIds = ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
    
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'Aucun ID valide fourni' });
    }
    
    const results = await batchUpdatePaymentMethodsStatus(validIds, is_active, admin_id);
    
    res.json({
      success: true,
      message: `${results.length} moyen(s) de paiement ${is_active ? 'activé(s)' : 'désactivé(s)'}`,
      data: results
    });
  } catch (error) {
    console.error('Erreur batchUpdateStatus:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour groupée' });
  }
};