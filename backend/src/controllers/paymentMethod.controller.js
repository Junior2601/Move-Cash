import {
  findActivePaymentMethodsByCountry,
  findAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethodById,
  deletePaymentMethodById
} from '../models/paymentMethod.repository.js';

// Récupérer les méthodes de paiement actives par pays
export const getActivePaymentMethodsByCountry = async (req, res) => {
  try {
    const { country_id } = req.params;
    
    if (!country_id) {
      return res.status(400).json({ error: 'ID du pays requis' });
    }

    const paymentMethods = await findActivePaymentMethodsByCountry(country_id);
    res.json(paymentMethods);
  } catch (error) {
    console.error('Erreur contrôleur méthodes paiement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Autres fonctions du contrôleur...
export const getAllPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = await findAllPaymentMethods();
    res.json(paymentMethods);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const addPaymentMethod = async (req, res) => {
  try {
    const { country_id, method, currency_id } = req.body;
    const paymentMethod = await createPaymentMethod(country_id, method, currency_id);
    res.status(201).json(paymentMethod);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { method, is_active } = req.body;
    const paymentMethod = await updatePaymentMethodById(id, method, is_active);
    res.json(paymentMethod);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentMethod = await deletePaymentMethodById(id);
    res.json(paymentMethod);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};