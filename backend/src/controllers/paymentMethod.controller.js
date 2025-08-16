import {
  findActivePaymentMethodsByCountry,
  findAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethodById,
  deletePaymentMethodById
} from '../models/paymentMethod.repository.js';

// Liste publique des moyens de paiement actifs pour un pays
export const getActivePaymentMethodsByCountry = async (req, res) => {
  const { country_id } = req.params;
  try {
    const methods = await findActivePaymentMethodsByCountry(country_id);
    res.json(methods);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des moyens de paiement", error: error.message });
  }
};

// Liste complète (admin)
export const getAllPaymentMethods = async (req, res) => {
  try {
    const methods = await findAllPaymentMethods();
    res.json(methods);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des moyens de paiement", error: error.message });
  }
};

// Ajouter un moyen de paiement (admin)
export const addPaymentMethod = async (req, res) => {
  const { country_id, method } = req.body;
  try {
    const newMethod = await createPaymentMethod(country_id, method);
    res.status(201).json({ message: "Moyen de paiement ajouté avec succès", payment_method: newMethod });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'ajout du moyen de paiement", error: error.message });
  }
};

// Mettre à jour un moyen de paiement (admin)
export const updatePaymentMethod = async (req, res) => {
  const { id } = req.params;
  const { method, is_active } = req.body;
  try {
    const updatedMethod = await updatePaymentMethodById(id, method, is_active);
    if (!updatedMethod) {
      return res.status(404).json({ message: "Moyen de paiement non trouvé" });
    }
    res.json({ message: "Moyen de paiement mis à jour avec succès", payment_method: updatedMethod });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du moyen de paiement", error: error.message });
  }
};

// Supprimer un moyen de paiement (admin)
export const deletePaymentMethod = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedMethod = await deletePaymentMethodById(id);
    if (!deletedMethod) {
      return res.status(404).json({ message: "Moyen de paiement non trouvé" });
    }
    res.json({ message: "Moyen de paiement supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression du moyen de paiement", error: error.message });
  }
};
