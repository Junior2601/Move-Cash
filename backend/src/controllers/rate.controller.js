import {
  findActiveRates,
  findAllRates,
  createRate,
  updateRateById,
  deleteRateById
} from '../models/rate.repository.js';

// 📌 Liste publique des taux actifs
export const getActiveRates = async (req, res) => {
  try {
    const rates = await findActiveRates();
    res.json(rates);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des taux actifs', error: error.message });
  }
};

// 📌 Liste complète (admin)
export const getAllRates = async (req, res) => {
  try {
    const rates = await findAllRates();
    res.json(rates);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des taux', error: error.message });
  }
};

// 📌 Création d’un taux (admin)
export const addRate = async (req, res) => {
  const { from_currency_id, to_currency_id, rate, commission_percent } = req.body;
  const admin_id = req.admin.id; // récupéré via verifyAdminToken
  try {
    const newRate = await createRate(from_currency_id, to_currency_id, rate, commission_percent, admin_id);
    res.status(201).json({ message: 'Taux ajouté avec succès', rate: newRate });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l’ajout du taux', error: error.message });
  }
};

// 📌 Mise à jour d’un taux (admin)
export const updateRate = async (req, res) => {
  const { id } = req.params;
  const { rate, commission_percent, is_active } = req.body;
  try {
    const updatedRate = await updateRateById(id, rate, commission_percent, is_active);
    if (!updatedRate) {
      return res.status(404).json({ message: 'Taux non trouvé' });
    }
    res.json({ message: 'Taux mis à jour avec succès', rate: updatedRate });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du taux', error: error.message });
  }
};

// 📌 Suppression d’un taux (admin)
export const deleteRate = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedRate = await deleteRateById(id);
    if (!deletedRate) {
      return res.status(404).json({ message: 'Taux non trouvé' });
    }
    res.json({ message: 'Taux supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du taux', error: error.message });
  }
};
