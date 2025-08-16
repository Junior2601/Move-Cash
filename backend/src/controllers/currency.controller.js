import {
  findActiveCurrencies,
  findAllCurrencies,
  createCurrency,
  updateCurrencyById,
  deleteCurrencyById
} from '../models/currency.repository.js';

// Liste publique des devises actives
export const getActiveCurrencies = async (req, res) => {
  try {
    const currencies = await findActiveCurrencies();
    res.json(currencies);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des devises actives', error: error.message });
  }
};

// Liste complète (admin)
export const getAllCurrencies = async (req, res) => {
  try {
    const currencies = await findAllCurrencies();
    res.json(currencies);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des devises', error: error.message });
  }
};

// Création d’une devise (admin)
export const addCurrency = async (req, res) => {
  const { code, name, symbol } = req.body;
  try {
    const newCurrency = await createCurrency(code, name, symbol);
    res.status(201).json({ message: 'Devise ajoutée avec succès', currency: newCurrency });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l’ajout de la devise', error: error.message });
  }
};

// Mise à jour d’une devise (admin)
export const updateCurrency = async (req, res) => {
  const { id } = req.params;
  const { code, name, symbol, is_active } = req.body;
  try {
    const updatedCurrency = await updateCurrencyById(id, code, name, symbol, is_active);
    if (!updatedCurrency) {
      return res.status(404).json({ message: 'Devise non trouvée' });
    }
    res.json({ message: 'Devise mise à jour avec succès', currency: updatedCurrency });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la devise', error: error.message });
  }
};

// 📌 Suppression d’une devise (admin)
export const deleteCurrency = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedCurrency = await deleteCurrencyById(id);
    if (!deletedCurrency) {
      return res.status(404).json({ message: 'Devise non trouvée' });
    }
    res.json({ message: 'Devise supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression de la devise', error: error.message });
  }
};
